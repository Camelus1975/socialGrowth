import { state } from './state.js';
import { requestApi } from './common.js';

export function initMediaV3() {
  window.addEventListener('workspaceChanged', loadMediaGrid);
  
  // Refresh when switching to the Media Assets tab
  window.addEventListener('click', (e) => {
    const target = e.target.closest('[data-action="switchWorkspace"]');
    if (target && target.getAttribute('data-args') === 'media') {
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
    const data = await requestApi(`/api/media/${state.activeWorkspaceId}`);

    if (!data.success) {
      grid.innerHTML = `<div style="color:var(--error); padding:20px;">Failed to load media assets: ${data.error}</div>`;
      return;
    }

    if (!data.media || data.media.length === 0) {
      grid.innerHTML = `<div style="color:var(--text-muted); padding:20px;">No media assets generated yet.</div>`;
      return;
    }

    window._loadedMediaAssets = data.media;

    let html = '';
    data.media.forEach(asset => {
      const url = asset.storage_path || asset.media_url || '';
      const isVideo = (asset.file_type && asset.file_type.includes('video')) || (asset.media_type === 'video') || url?.toLowerCase()?.endsWith('.mp4');
      const previewUrl = url;
      const typeLabel = isVideo ? '🎥 Video' : '🖼️ Image';
      const caption = asset.description || asset.prompt || asset.name || 'Generated Media Asset';

      html += `
        <div style="background:rgba(255,255,255,0.02); border:1px solid var(--border-glass); border-radius:12px; overflow:hidden; position:relative; cursor:pointer; transition:transform 0.2s, border-color 0.2s;" 
             onclick="window.openMediaDetailModal('${asset.id}')"
             onmouseover="this.style.transform='scale(1.02)'; this.style.borderColor='rgba(99, 102, 241, 0.4)';" 
             onmouseout="this.style.transform='scale(1)'; this.style.borderColor='var(--border-glass)';"
             title="Click to view full post & asset details">
          <div style="position:absolute; top:6px; right:6px; background:rgba(0,0,0,0.65); backdrop-filter:blur(4px); padding:3px 7px; border-radius:10px; font-size:0.7rem; color:white; z-index:10; font-weight:500;">
            ${typeLabel}
          </div>
          <div style="aspect-ratio: 1 / 1; display:flex; justify-content:center; align-items:center; background:#111;">
            ${isVideo ? 
              `<video src="${previewUrl}" style="width:100%; height:100%; object-fit:cover;" muted loop onmouseover="this.play()" onmouseout="this.pause()"></video>` : 
              `<img src="${previewUrl}" style="width:100%; height:100%; object-fit:cover;" onerror="this.src='https://placehold.co/400?text=Image+Not+Found'"/>`
            }
          </div>
          <div style="padding:10px;">
            <p style="margin:0; font-size:0.8rem; color:var(--text-main); display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; line-height:1.4;" title="${caption}">${caption}</p>
            <div style="display:flex; justify-content:space-between; align-items:center; margin-top:8px;">
                <p style="margin:0; font-size:0.72rem; color:var(--text-muted);">${asset.created_at ? new Date(asset.created_at).toLocaleDateString() : 'Recent'}</p>
                <button onclick="event.stopPropagation(); window.deleteMediaAsset('${asset.id}')" style="background:none; border:none; color:var(--error); cursor:pointer; padding:0; font-size:1rem;" title="Delete Asset">🗑️</button>
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

window.openMediaDetailModal = function(assetId) {
  const asset = (window._loadedMediaAssets || []).find(a => a.id === assetId) || { id: assetId };
  
  const existing = document.getElementById('media-detail-modal');
  if (existing) existing.remove();

  const url = asset.storage_path || asset.media_url || '';
  const isVideo = (asset.file_type && asset.file_type.includes('video')) || (asset.media_type === 'video') || url?.toLowerCase()?.endsWith('.mp4');
  const typeLabel = isVideo ? '🎥 AI Video Asset' : '🖼️ FLUX Image Asset';
  const caption = asset.description || asset.prompt || asset.name || 'Generated Media Asset';
  const dateStr = asset.created_at ? new Date(asset.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : 'Recently Generated';

  const modal = document.createElement('div');
  modal.id = 'media-detail-modal';
  modal.style.cssText = 'position:fixed;inset:0;z-index:10000;background:rgba(0,0,0,0.82);backdrop-filter:blur(8px);display:flex;align-items:center;justify-content:center;padding:24px;';

  modal.innerHTML = `
    <div style="background:var(--bg-panel, #0f172a); border:1px solid var(--border-glass, rgba(255,255,255,0.15)); border-radius:18px; width:100%; max-width:840px; max-height:90vh; overflow-y:auto; padding:28px; position:relative; box-shadow:0 25px 60px rgba(0,0,0,0.7); display:flex; flex-direction:column; gap:20px;">
      
      <button id="close-media-modal-btn" style="position:absolute; top:18px; right:18px; background:rgba(255,255,255,0.08); border:1px solid var(--border-glass, rgba(255,255,255,0.15)); color:var(--text-main, #fff); border-radius:50%; width:36px; height:36px; cursor:pointer; font-size:1.1rem; display:flex; align-items:center; justify-content:center; z-index:10;">✕</button>

      <div style="display:flex; align-items:center; justify-content:space-between; padding-right:40px; flex-wrap:wrap; gap:12px;">
        <div style="display:flex; align-items:center; gap:10px;">
          <span style="font-size:1.4rem;">${isVideo ? '🎥' : '🖼️'}</span>
          <h3 style="margin:0; font-size:1.25rem; font-weight:700; color:var(--text-main, #fff);">${typeLabel}</h3>
        </div>
        <span style="font-size:0.85rem; color:var(--text-muted, #94a3b8); background:rgba(255,255,255,0.04); padding:6px 14px; border-radius:20px; border:1px solid var(--border-glass, rgba(255,255,255,0.1));">📅 ${dateStr}</span>
      </div>

      <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap:24px; align-items:start;">
        <div style="background:#000; border-radius:14px; overflow:hidden; border:1px solid var(--border-glass, rgba(255,255,255,0.1)); display:flex; align-items:center; justify-content:center; max-height:450px; min-height:280px;">
          ${isVideo ? 
            `<video src="${url}" controls autoplay loop style="width:100%; max-height:450px; object-fit:contain;"></video>` : 
            `<img src="${url}" style="width:100%; max-height:450px; object-fit:contain; cursor:zoom-in;" onclick="window.openMediaViewer('${url}', 'image')" title="Click for full-screen view"/>`
          }
        </div>

        <div style="display:flex; flex-direction:column; gap:16px; height:100%;">
          <div>
            <label style="font-size:0.8rem; text-transform:uppercase; letter-spacing:0.5px; color:var(--text-muted, #94a3b8); font-weight:600; display:block; margin-bottom:8px;">Post Caption / Prompt</label>
            <div style="background:rgba(255,255,255,0.03); border:1px solid var(--border-glass, rgba(255,255,255,0.1)); border-radius:12px; padding:16px; color:var(--text-main, #fff); font-size:0.95rem; line-height:1.6; max-height:220px; overflow-y:auto; white-space:pre-wrap;">${caption}</div>
          </div>

          <div style="display:flex; flex-direction:column; gap:10px; margin-top:auto;">
            <button id="copy-caption-btn" style="background:rgba(99,102,241,0.15); border:1px solid rgba(99,102,241,0.4); color:#a5b4fc; padding:12px; border-radius:10px; cursor:pointer; font-weight:600; font-size:0.9rem; display:flex; align-items:center; justify-content:center; gap:8px;">
              📋 Copy Caption / Prompt
            </button>
            <a href="${url}" target="_blank" download style="background:rgba(255,255,255,0.05); border:1px solid var(--border-glass, rgba(255,255,255,0.15)); color:var(--text-main, #fff); padding:10px; border-radius:10px; text-decoration:none; text-align:center; font-size:0.88rem; font-weight:500; display:flex; align-items:center; justify-content:center; gap:8px;">
              🔗 Open Full-Res File
            </a>
            ${asset.id ? `
              <button id="delete-asset-btn" style="background:rgba(239,68,68,0.1); border:1px solid rgba(239,68,68,0.3); color:#fca5a5; padding:10px; border-radius:10px; cursor:pointer; font-size:0.88rem; font-weight:500; display:flex; align-items:center; justify-content:center; gap:8px; margin-top:4px;">
                🗑️ Delete Media Asset
              </button>
            ` : ''}
          </div>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  modal.querySelector('#close-media-modal-btn').onclick = () => modal.remove();
  modal.onclick = (e) => { if (e.target === modal) modal.remove(); };

  const copyBtn = modal.querySelector('#copy-caption-btn');
  if (copyBtn) {
    copyBtn.onclick = () => {
      navigator.clipboard.writeText(caption);
      copyBtn.textContent = '✅ Caption Copied!';
      setTimeout(() => { copyBtn.textContent = '📋 Copy Caption / Prompt'; }, 2000);
    };
  }

  const deleteBtn = modal.querySelector('#delete-asset-btn');
  if (deleteBtn && asset.id) {
    deleteBtn.onclick = async () => {
      modal.remove();
      if (window.deleteMediaAsset) {
        window.deleteMediaAsset(asset.id);
      }
    };
  }
};

window.deleteMediaAsset = async function(mediaId) {
    if (!state.activeWorkspaceId) return;
    if (!confirm("Are you sure you want to permanently delete this media asset?")) return;
    
    try {
      const res = await requestApi(`/api/media/${state.activeWorkspaceId}/${mediaId}`, {
        method: 'DELETE'
      });
      
      if (res.success) {
        loadMediaGrid();
      } else {
        alert("Failed to delete media: " + res.error);
      }
    } catch (err) {
      console.error(err);
      alert("Error deleting media.");
    }
  };


