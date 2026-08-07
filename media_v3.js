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
  modal.style.cssText = 'position:fixed;inset:0;z-index:10000;background:rgba(15,23,42,0.65);backdrop-filter:blur(10px);display:flex;align-items:center;justify-content:center;padding:24px;';

  modal.innerHTML = `
    <div style="background:rgba(255,255,255,0.92); backdrop-filter:blur(24px); -webkit-backdrop-filter:blur(24px); border:1px solid rgba(255,255,255,0.8); border-radius:20px; width:100%; max-width:840px; max-height:90vh; overflow-y:auto; padding:28px; position:relative; box-shadow:0 25px 60px rgba(15,23,42,0.25), 0 10px 30px rgba(99,102,241,0.12); color:#0f172a; display:flex; flex-direction:column; gap:20px;">
      
      <button id="close-media-modal-btn" style="position:absolute; top:18px; right:18px; background:rgba(241,245,249,0.9); border:1px solid rgba(203,213,225,0.8); color:#0f172a; border-radius:50%; width:36px; height:36px; cursor:pointer; font-size:1.1rem; display:flex; align-items:center; justify-content:center; z-index:10; font-weight:bold; box-shadow:0 2px 8px rgba(0,0,0,0.08);">✕</button>

      <div style="display:flex; align-items:center; justify-content:space-between; padding-right:40px; flex-wrap:wrap; gap:12px;">
        <div style="display:flex; align-items:center; gap:10px;">
          <span style="font-size:1.4rem;">${isVideo ? '🎥' : '🖼️'}</span>
          <h3 style="margin:0; font-size:1.25rem; font-weight:700; color:#0f172a;">${typeLabel}</h3>
        </div>
        <span style="font-size:0.85rem; color:#4f46e5; background:rgba(99,102,241,0.08); padding:6px 14px; border-radius:20px; border:1px solid rgba(99,102,241,0.2); font-weight:600;">📅 ${dateStr}</span>
      </div>

      <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap:24px; align-items:start;">
        <div style="background:#000; border-radius:14px; overflow:hidden; border:1px solid rgba(226,232,240,0.8); display:flex; align-items:center; justify-content:center; max-height:450px; min-height:280px; box-shadow:0 8px 24px rgba(0,0,0,0.15);">
          ${isVideo ? 
            `<video src="${url}" controls autoplay loop style="width:100%; max-height:450px; object-fit:contain;"></video>` : 
            `<img src="${url}" style="width:100%; max-height:450px; object-fit:contain; cursor:zoom-in;" onclick="window.openMediaViewer('${url}', 'image')" title="Click for full-screen view"/>`
          }
        </div>

        <div style="display:flex; flex-direction:column; gap:16px; height:100%;">
          <div>
            <label style="font-size:0.8rem; text-transform:uppercase; letter-spacing:0.5px; color:#475569; font-weight:700; display:block; margin-bottom:8px;">Post Caption / Prompt</label>
            <div style="background:rgba(248,250,252,0.95); border:1px solid rgba(226,232,240,0.9); border-radius:12px; padding:16px; color:#0f172a; font-size:0.95rem; line-height:1.6; max-height:220px; overflow-y:auto; white-space:pre-wrap; box-shadow:inset 0 2px 4px rgba(0,0,0,0.02);">${caption}</div>
          </div>

          <div style="display:flex; flex-direction:column; gap:10px; margin-top:auto;">
            <button id="copy-caption-btn" style="background:linear-gradient(135deg, #6366f1, #8b5cf6); border:none; color:#ffffff; padding:12px; border-radius:10px; cursor:pointer; font-weight:600; font-size:0.9rem; display:flex; align-items:center; justify-content:center; gap:8px; box-shadow:0 4px 14px rgba(99,102,241,0.35); transition:transform 0.15s ease;">
              📋 Copy Caption / Prompt
            </button>
            <a href="${url}" target="_blank" download style="background:rgba(241,245,249,0.9); border:1px solid rgba(203,213,225,0.8); color:#0f172a; padding:10px; border-radius:10px; text-decoration:none; text-align:center; font-size:0.88rem; font-weight:600; display:flex; align-items:center; justify-content:center; gap:8px; box-shadow:0 2px 6px rgba(0,0,0,0.04);">
              🔗 Open Full-Res File
            </a>
            ${asset.id ? `
              <button id="delete-asset-btn" style="background:rgba(254,226,226,0.85); border:1px solid rgba(252,165,165,0.8); color:#dc2626; padding:10px; border-radius:10px; cursor:pointer; font-size:0.88rem; font-weight:600; display:flex; align-items:center; justify-content:center; gap:8px; margin-top:4px;">
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


