import { state } from './state.js';
import { requestApi } from './common.js';

export function initMediaV3() {
  window.addEventListener('workspaceChanged', loadMediaGrid);
  
  // Refresh when switching to the Media Assets tab
  window.addEventListener('click', (e) => {
    const target = e.target.closest('[data-action="switchView"]');
    if (target && target.getAttribute('data-args').includes('media-assets')) {
      loadMediaGrid();
    }
  });
}

export async function loadMediaGrid() {
  const grid = document.getElementById('media-assets-grid');
  if (!grid) return;
  
  if (!state.activeWorkspaceId) {
    grid.innerHTML = '<div style="color:var(--text-muted); padding:20px;">Please select a workspace to view media assets.</div>';
    return;
  }

  grid.innerHTML = '<div style="color:var(--text-muted); padding:20px;">Loading media...</div>';

  try {
    const res = await requestApi(`/api/media/${state.activeWorkspaceId}`);
    const data = await res.json();

    if (!data.success) {
      grid.innerHTML = `<div style="color:var(--error); padding:20px;">Failed to load media assets: ${data.error}</div>`;
      return;
    }

    if (!data.media || data.media.length === 0) {
      grid.innerHTML = `<div style="color:var(--text-muted); padding:20px;">No media assets generated yet.</div>`;
      return;
    }

    let html = '';
    data.media.forEach(asset => {
      const isVideo = asset.media_type === 'video' || asset.media_url.endsWith('.mp4');
      const previewUrl = asset.media_url;
      const typeLabel = isVideo ? '🎥 Video' : '🖼️ Image';

      html += `
        <div style="background:rgba(255,255,255,0.02); border:1px solid var(--border-glass); border-radius:12px; overflow:hidden; position:relative; cursor:zoom-in; transition:transform 0.2s;" 
             onclick="window.openMediaViewer('${previewUrl}', '${isVideo ? 'video' : 'image'}')"
             onmouseover="this.style.transform='scale(1.02)'" 
             onmouseout="this.style.transform='scale(1)'">
          <div style="position:absolute; top:8px; right:8px; background:rgba(0,0,0,0.6); padding:4px 8px; border-radius:12px; font-size:0.75rem; color:white; z-index:10;">
            ${typeLabel}
          </div>
          <div style="aspect-ratio: 1 / 1; display:flex; justify-content:center; align-items:center; background:#111;">
            ${isVideo ? 
              `<video src="${previewUrl}" style="width:100%; height:100%; object-fit:cover;" muted loop onmouseover="this.play()" onmouseout="this.pause()"></video>` : 
              `<img src="${previewUrl}" style="width:100%; height:100%; object-fit:cover;" />`
            }
          </div>
          <div style="padding:12px;">
            <p style="margin:0; font-size:0.85rem; color:var(--text-main); display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden;" title="${asset.prompt || 'Generated media'}">${asset.prompt || 'Generated Media Asset'}</p>
            <div style="display:flex; justify-content:space-between; align-items:center; margin-top:8px;">
                <p style="margin:0; font-size:0.75rem; color:var(--text-muted);">${new Date(asset.created_at).toLocaleDateString()}</p>
                <button onclick="event.stopPropagation(); window.deleteMediaAsset('${asset.id}')" style="background:none; border:none; color:var(--error); cursor:pointer; padding:0; font-size:1.1rem;" title="Delete Asset">🗑️</button>
            </div>
          </div>
        </div>
      `;
    });

    grid.innerHTML = html;

  } catch (err) {
    console.error(err);
    grid.innerHTML = `<div style="color:var(--error); padding:20px;">Error loading media assets.</div>`;
  }
}

window.deleteMediaAsset = async function(mediaId) {
    if (!state.activeWorkspaceId) return;
    if (!confirm("Are you sure you want to permanently delete this media asset?")) return;
    
    try {
      const res = await requestApi(`/api/media/${state.activeWorkspaceId}/${mediaId}`, {
        method: 'DELETE'
      });
      
      if (res.ok) {
        const data = await res.json();
        if(data.success) {
          loadMediaGrid();
        } else {
          alert("Failed to delete media: " + data.error);
        }
      } else {
        alert("Failed to delete media.");
      }
    } catch (err) {
      console.error(err);
      alert("Error deleting media.");
    }
  };
