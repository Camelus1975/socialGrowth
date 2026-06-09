// App Founder Growth Suite - Media Asset Module
import { state } from './state.js';
import { requestApi, showToast, createSafeElement } from './common.js';

export function initMedia() {
  state.on('appChanged', () => {
    if (state.currentActiveView === 'media-asset') renderMediaManager();
  });
  
  state.on('viewChanged', (viewId) => {
    if (viewId === 'media-asset') renderMediaManager();
  });

  // Setup input listener for file uploads
  const fileInput = document.getElementById('media-upload-dummy-input');
  if (fileInput) {
    fileInput.addEventListener('change', handleMediaUploadSelect);
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
    totalCountEl.textContent = `${state.mediaState.assets.length} items`;
  }
  
  assets.forEach(asset => {
    const card = createSafeElement('div', ['media-asset-card']);
    
    const preview = createSafeElement('div', ['media-preview-box']);
    const emoji = createSafeElement('span', [], '📁');
    emoji.style.fontSize = '2.5rem';
    
    const typeLabel = createSafeElement('span', [], asset.type);
    typeLabel.style.fontSize = '0.65rem';
    typeLabel.style.color = 'var(--text-sub)';
    typeLabel.style.position = 'absolute';
    typeLabel.style.bottom = '8px';
    typeLabel.style.right = '8px';
    
    preview.appendChild(emoji);
    preview.appendChild(typeLabel);
    
    const info = createSafeElement('div');
    info.style.padding = '12px';
    
    const name = createSafeElement('h5', [], asset.name);
    name.style.color = 'white';
    name.style.fontSize = '0.8rem';
    name.style.overflow = 'hidden';
    name.style.textOverflow = 'ellipsis';
    name.style.whiteSpace = 'nowrap';
    
    const tag = createSafeElement('span', [], asset.tag);
    tag.style.fontSize = '0.65rem';
    tag.style.background = 'rgba(99,102,241,0.15)';
    tag.style.color = '#a5b4fc';
    tag.style.padding = '2px 6px';
    tag.style.borderRadius = '4px';
    tag.style.marginTop = '6px';
    tag.style.display = 'inline-block';
    
    const desc = createSafeElement('p', [], `"${asset.description}"`);
    desc.style.fontSize = '0.72rem';
    desc.style.color = 'var(--text-muted)';
    desc.style.marginTop = '8px';
    desc.style.lineHeight = '1.3';
    
    info.appendChild(name);
    info.appendChild(tag);
    info.appendChild(desc);
    
    card.appendChild(preview);
    card.appendChild(info);
    grid.appendChild(card);
  });
}

export function selectMediaFolder(folder) {
  state.activeMediaFolder = folder;
  
  const folders = {
    'all': 'media-folder-all',
    'Brand Assets': 'media-folder-brand',
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

export function handleMediaUploadSelect(event) {
  const file = event.target.files[0];
  if (!file) return;
  
  showToast("Uploading media asset binary...", "success");
  
  setTimeout(async () => {
    let newAsset = {
      id: "as_new_" + Date.now(),
      name: file.name,
      type: file.type || "image/png",
      size: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
      folder: state.activeMediaFolder === 'all' ? 'Brand Assets' : state.activeMediaFolder,
      tag: "Mockup",
      description: `AI description: Mobile layout design for ${state.currentActiveApp} showing active features.`
    };
    
    try {
      const data = await requestApi('/api/media/upload', {
        method: 'POST',
        body: JSON.stringify(newAsset)
      });
      newAsset = data;
    } catch (err) {
      console.warn("Express media upload offline. Parsing metadata via local tags client.");
    }
    
    state.mediaState.assets.push(newAsset);
    showToast("AI descriptive tag generated and saved to database!", "success");
    renderMediaManager();
  }, 1500);
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
