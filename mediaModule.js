// App Founder Growth Suite - Media Asset Module
import { state } from './state.js';
import { requestApi, showToast, createSafeElement } from './common.js';
import { getSupabaseClient } from './auth.js';

export function initMedia() {
  state.on('appChanged', () => {
    if (state.currentActiveView === 'media-asset') renderMediaManager();
  });
  
  state.on('viewChanged', (viewId) => {
    if (viewId === 'media-asset') {
      fetchMediaAssets();
      renderMediaManager();
    }
  });

  // Fetch initial assets if already on the view
  if (state.currentActiveView === 'media-asset') {
    fetchMediaAssets();
  }

  // Setup input listener for file uploads
  const fileInput = document.getElementById('media-upload-dummy-input');
  if (fileInput) {
    fileInput.addEventListener('change', handleMediaUploadSelect);
  }
}

export async function fetchMediaAssets() {
  try {
    const supabase = getSupabaseClient();
    if (supabase && state.currentActiveApp) {
      const { data, error } = await supabase
        .from('media')
        .select('*')
        .eq('app_id', state.currentActiveApp);
        
      if (error) throw error;
      
      if (data) {
        state.mediaState.assets = data.map(m => ({
          id: m.id,
          name: m.name,
          type: m.file_type || 'image/png',
          size: m.file_size ? `${(m.file_size / 1024).toFixed(1)} KB` : '0 KB',
          folder: m.folder || 'Brand Assets',
          tag: m.tag,
          description: m.description,
          url: m.storage_path
        }));
      }
    } else {
      // Fallback to localStorage if no Supabase client
      const savedAssets = localStorage.getItem('socialgrowth_media_assets');
      if (savedAssets) {
        state.mediaState.assets = JSON.parse(savedAssets);
      } else {
        state.mediaState.assets = [];
      }
    }
    
    if (state.currentActiveView === 'media-asset') {
      renderMediaManager();
    }
  } catch (err) {
    console.error("Error fetching media assets:", err);
    // Fallback to localStorage on error
    const savedAssets = localStorage.getItem('socialgrowth_media_assets');
    state.mediaState.assets = savedAssets ? JSON.parse(savedAssets) : [];
  }
}

export function renderMediaManager() {
  const grid = document.getElementById('media-assets-grid-container');
  if (!grid) return;
  grid.innerHTML = '';
  
  let assets = state.mediaState.assets || [];
  if (state.activeMediaFolder !== 'all') {
    assets = assets.filter(a => a.folder === state.activeMediaFolder);
  }
  
  const totalCountEl = document.getElementById('media-total-count');
  if (totalCountEl) {
    totalCountEl.textContent = `${(state.mediaState.assets || []).length} items`;
  }
  
  if (assets.length === 0) {
    const empty = createSafeElement('div', []);
    empty.style.cssText = 'grid-column: 1/-1; text-align:center; padding:40px; color:var(--text-muted); font-size:0.9rem;';
    empty.textContent = state.activeMediaFolder === 'all' 
      ? 'No media assets yet. Upload or run AI orchestration to generate images.'
      : `No assets in "${state.activeMediaFolder}" folder.`;
    grid.appendChild(empty);
    return;
  }
  
  assets.forEach(asset => {
    const card = createSafeElement('div', ['media-asset-card']);
    card.style.cursor = 'pointer';
    
    const preview = createSafeElement('div', ['media-preview-box']);
    preview.style.position = 'relative';
    preview.style.overflow = 'hidden';
    
    const isImage = (asset.type || '').startsWith('image') || (asset.url || '').match(/\.(png|jpg|jpeg|webp|gif|svg)/i);
    
    if (isImage && asset.url) {
      const img = createSafeElement('img', []);
      img.src = asset.url;
      img.alt = asset.name || 'Media asset';
      img.style.cssText = 'width:100%; height:100%; object-fit:cover; border-radius:8px 8px 0 0;';
      img.onerror = function() { this.style.display='none'; this.parentNode.innerHTML='<span style="font-size:2.5rem">🖼️</span>'; };
      preview.style.height = '160px';
      preview.style.display = 'flex';
      preview.style.alignItems = 'center';
      preview.style.justifyContent = 'center';
      preview.style.background = '#0a0e1a';
      preview.appendChild(img);
    } else {
      const emoji = createSafeElement('span', [], '📁');
      emoji.style.fontSize = '2.5rem';
      preview.appendChild(emoji);
    }
    
    const typeLabel = createSafeElement('span', [], asset.type || '');
    typeLabel.style.cssText = 'font-size:0.6rem; color:var(--text-sub); position:absolute; bottom:6px; right:6px; background:rgba(0,0,0,0.6); padding:2px 6px; border-radius:4px;';
    preview.appendChild(typeLabel);
    
    // Click to open lightbox
    card.addEventListener('click', () => openMediaLightbox(asset));
    
    const info = createSafeElement('div');
    info.style.padding = '10px 12px';
    
    const name = createSafeElement('h5', [], asset.name || 'Untitled');
    name.style.cssText = 'color:white; font-size:0.8rem; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; margin:0 0 4px 0;';
    
    const tagEl = createSafeElement('span', [], asset.tag || asset.folder || '');
    tagEl.style.cssText = 'font-size:0.65rem; background:rgba(99,102,241,0.15); color:#a5b4fc; padding:2px 6px; border-radius:4px; display:inline-block;';
    
    const desc = createSafeElement('p', [], asset.description ? `"${asset.description}"` : '');
    desc.style.cssText = 'font-size:0.7rem; color:var(--text-muted); margin:6px 0 0 0; line-height:1.3; overflow:hidden; max-height:2.6em;';
    
    info.appendChild(name);
    info.appendChild(tagEl);
    if (asset.description) info.appendChild(desc);
    
    card.appendChild(preview);
    card.appendChild(info);
    grid.appendChild(card);
  });
}

function openMediaLightbox(asset) {
  // Remove existing lightbox if any
  const existing = document.getElementById('media-lightbox');
  if (existing) existing.remove();
  
  const overlay = document.createElement('div');
  overlay.id = 'media-lightbox';
  overlay.style.cssText = 'position:fixed; top:0; left:0; width:100vw; height:100vh; background:rgba(4,7,17,0.92); backdrop-filter:blur(12px); z-index:9999; display:flex; align-items:center; justify-content:center; flex-direction:column; cursor:pointer;';
  overlay.addEventListener('click', () => overlay.remove());
  
  const container = document.createElement('div');
  container.style.cssText = 'max-width:90vw; max-height:80vh; display:flex; flex-direction:column; align-items:center; gap:16px;';
  container.addEventListener('click', e => e.stopPropagation());
  
  const isImage = (asset.type || '').startsWith('image') || (asset.url || '').match(/\.(png|jpg|jpeg|webp|gif|svg)/i);
  
  if (isImage && asset.url) {
    const img = document.createElement('img');
    img.src = asset.url;
    img.alt = asset.name || 'Media';
    img.style.cssText = 'max-width:90vw; max-height:70vh; object-fit:contain; border-radius:12px; box-shadow:0 8px 32px rgba(0,0,0,0.5);';
    container.appendChild(img);
  }
  
  const info = document.createElement('div');
  info.style.cssText = 'text-align:center; color:white; max-width:500px;';
  info.innerHTML = `
    <h3 style="margin:0 0 8px 0; font-size:1rem;">${(asset.name || 'Untitled').replace(/</g,'&lt;')}</h3>
    <p style="margin:0; font-size:0.8rem; color:var(--text-muted);">${(asset.description || '').replace(/</g,'&lt;')}</p>
    <div style="margin-top:12px; display:flex; gap:8px; justify-content:center;">
      <span style="font-size:0.7rem; background:rgba(99,102,241,0.2); color:#a5b4fc; padding:3px 8px; border-radius:4px;">${(asset.folder || '').replace(/</g,'&lt;')}</span>
      <span style="font-size:0.7rem; background:rgba(99,102,241,0.2); color:#a5b4fc; padding:3px 8px; border-radius:4px;">${(asset.tag || '').replace(/</g,'&lt;')}</span>
    </div>
  `;
  container.appendChild(info);
  
  // Close button
  const closeBtn = document.createElement('button');
  closeBtn.textContent = '✕ Close';
  closeBtn.style.cssText = 'margin-top:12px; padding:8px 20px; background:rgba(255,255,255,0.1); border:1px solid rgba(255,255,255,0.2); color:white; border-radius:8px; cursor:pointer; font-size:0.85rem;';
  closeBtn.addEventListener('click', () => overlay.remove());
  container.appendChild(closeBtn);
  
  overlay.appendChild(container);
  document.body.appendChild(overlay);
  
  // Close on Escape key
  const escHandler = (e) => { if (e.key === 'Escape') { overlay.remove(); document.removeEventListener('keydown', escHandler); } };
  document.addEventListener('keydown', escHandler);
}

export function selectMediaFolder(folder) {
  state.activeMediaFolder = folder;
  
  const folders = {
    'all': 'media-folder-all',
    'Brand Assets': 'media-folder-brand',
    'AI Generated': 'media-folder-ai',
    'Promotions': 'media-folder-promo',
    'Screenshots': 'media-folder-screens'
  };
  
  Object.keys(folders).forEach(key => {
    const el = document.getElementById(folders[key]);
    if (el) {
      el.classList.toggle('active', key === folder);
    }
  });
  
  renderMediaManager();
}

export function simulateMediaUploadClick() {
  const fileInput = document.getElementById('media-upload-dummy-input');
  if (fileInput) fileInput.click();
}

export async function handleMediaUploadSelect(event) {
  const file = event.target.files[0];
  if (!file) return;
  
  showToast("Uploading media asset...", "success");
  
  try {
    const supabase = getSupabaseClient();
    let fileUrl = `uploads/${file.name}`; // Fallback if no supabase

    if (supabase) {
      const fileName = `uploads/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.\-_]/g, '')}`;
      const { data: uploadData, error: uploadErr } = await supabase.storage
        .from('media')
        .upload(fileName, file, { cacheControl: '3600', upsert: false });

      if (uploadErr) throw uploadErr;

      const { data: urlData } = supabase.storage.from('media').getPublicUrl(fileName);
      if (urlData && urlData.publicUrl) {
        fileUrl = urlData.publicUrl;
      }
    }
    
    const insertPayload = {
      app_id: state.currentActiveApp || 'default',
      name: file.name,
      file_type: file.type || 'image/png',
      file_size: file.size || 0,
      folder: state.activeMediaFolder === 'all' ? 'Brand Assets' : state.activeMediaFolder,
      tag: 'Upload',
      description: `User uploaded asset for ${state.currentActiveApp || 'app'}.`,
      storage_path: fileUrl
    };

    if (supabase) {
      const { data, error } = await supabase
        .from('media')
        .insert([insertPayload])
        .select();
        
      if (error) throw error;
      showToast("Asset uploaded successfully!", "success");
      await fetchMediaAssets();
    } else {
      // Fallback to localStorage if no Supabase client
      const localAsset = {
        id: 'media_' + Date.now(),
        name: file.name,
        type: file.type || 'image/png',
        size: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
        folder: insertPayload.folder,
        tag: 'Upload',
        description: insertPayload.description,
        url: insertPayload.storage_path
      };
      if (!state.mediaState.assets) state.mediaState.assets = [];
      state.mediaState.assets.push(localAsset);
      localStorage.setItem('socialgrowth_media_assets', JSON.stringify(state.mediaState.assets));
      showToast("Asset saved locally!", "success");
      renderMediaManager();
    }
  } catch (err) {
    console.error("Upload failed", err);
    showToast("Failed to upload asset.", "error");
  }
}

// ------------------------------------------
// MOCKUP GRAPHICS AND CANVAS EXPORTER
// ------------------------------------------
export function changeMockupTheme(theme) {
  state.activeMockupTheme = theme;
  const mockup = document.getElementById('marketing-mockup-card');
  if (!mockup) return;
  
  const colors = {
    'indigo': 'linear-gradient(135deg, #4f46e5, #06b6d4)',
    'pink': 'linear-gradient(135deg, #ec4899, #f43f5e)',
    'emerald': 'linear-gradient(135deg, #10b981, #059669)',
    'dark': 'linear-gradient(135deg, #0f172a, #1e293b)'
  };
  mockup.style.background = colors[theme];
  showToast("Mockup theme updated!", "success");
}

export function exportMockupToPng() {
  const quoteEl = document.getElementById('mockup-quote');
  const starsEl = document.getElementById('mockup-stars');
  const authorEl = document.getElementById('mockup-author');
  const appnameEl = document.getElementById('mockup-appname');
  
  const quoteText = quoteEl ? quoteEl.textContent : '';
  const starsText = starsEl ? starsEl.textContent : '★★★★★';
  const authorText = authorEl ? authorEl.textContent : 'Elena Davis';
  const appnameText = appnameEl ? appnameEl.textContent : 'FitPulse';
  const activeTheme = state.activeMockupTheme || 'indigo';
  
  const canvas = document.createElement('canvas');
  canvas.width = 640;
  canvas.height = 640;
  const ctx = canvas.getContext('2d');
  
  // Set theme gradient background
  const colors = {
    'indigo': ['#4f46e5', '#06b6d4'],
    'pink': ['#ec4899', '#f43f5e'],
    'emerald': ['#10b981', '#059669'],
    'dark': ['#0f172a', '#1e293b']
  };
  const themeColors = colors[activeTheme] || colors['indigo'];
  
  const grad = ctx.createLinearGradient(0, 0, 640, 640);
  grad.addColorStop(0, themeColors[0]);
  grad.addColorStop(1, themeColors[1]);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 640, 640);
  
  // Draw decorative circles
  ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
  ctx.beginPath();
  ctx.arc(640, 0, 250, 0, Math.PI * 2);
  ctx.fill();
  
  // Text styling
  ctx.fillStyle = '#ffffff';
  
  // Draw Stars
  ctx.font = '36px sans-serif';
  ctx.fillText(starsText, 50, 100);
  
  // Draw Quote (wrapped text)
  ctx.font = 'italic 500 28px sans-serif';
  wrapText(ctx, quoteText, 50, 180, 540, 42);
  
  // Draw Footer line
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(50, 520);
  ctx.lineTo(590, 520);
  ctx.stroke();
  
  // Draw Author and App Name
  ctx.font = 'bold 22px sans-serif';
  ctx.fillText(authorText, 50, 570);
  
  ctx.font = '900 20px sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText(appnameText.toUpperCase(), 590, 570);
  
  // Trigger download
  try {
    const link = document.createElement('a');
    link.download = `${appnameText.toLowerCase().replace(/\s+/g, '_')}_testimonial.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
    showToast("Mockup image card downloaded successfully!", "success");
  } catch (err) {
    console.error("Failed to generate download url", err);
    showToast("Error generating image download", "error");
  }
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
  const words = text.split(' ');
  let line = '';
  for (let n = 0; n < words.length; n++) {
    const testLine = line + words[n] + ' ';
    const metrics = ctx.measureText(testLine);
    const testWidth = metrics.width;
    if (testWidth > maxWidth && n > 0) {
      ctx.fillText(line, x, y);
      line = words[n] + ' ';
      y += lineHeight;
    } else {
      line = testLine;
    }
  }
  ctx.fillText(line, x, y);
}
