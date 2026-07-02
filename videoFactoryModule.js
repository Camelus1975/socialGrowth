import { state } from './state.js';
import { requestApi, showToast, createSafeElement } from './common.js';
import { getSupabaseClient } from './auth.js';

let pollingTimer = null;

export function initVideoFactory() {
  state.on('appChanged', () => {
    refreshVideoFactoryView();
  });
  
  state.on('viewChanged', () => {
    if (state.currentActiveView === 'video-factory') {
      refreshVideoFactoryView();
    } else {
      if (pollingTimer) clearTimeout(pollingTimer);
    }
  });
}

function refreshVideoFactoryView() {
  if (pollingTimer) clearTimeout(pollingTimer);
  const viewId = state.currentActiveView;
  if (viewId !== 'video-factory') return;

  const app = state.appsData[state.currentActiveApp];
  if (!app) return;

  const titleEl = document.getElementById('video-factory-app-title');
  if (titleEl) titleEl.textContent = `Video Assembly Line: ${app.name}`;
  
  loadHistoricalVideos(state.currentActiveApp);
}

async function loadHistoricalVideos(appId) {
  const block = document.getElementById('video-factory-outputs-block');
  if (!block) return;
  
  // Only show loading indicator if there's no content to avoid flickering during polling
  if (block.innerHTML.trim() === '') {
    block.innerHTML = '<div class="mod-style-dGV4dC1h">Loading assets...</div>';
  }

  const supabase = getSupabaseClient();
  if (!supabase) return;

  try {
    const { data, error } = await supabase
      .from('video_factory_assets')
      .select('*')
      .eq('app_id', appId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    
    block.innerHTML = '';
    
    if (!data || data.length === 0) {
      block.innerHTML = '<div class="mod-style-dGV4dC1h">No generated videos yet.</div>';
      return;
    }

    let hasProcessing = false;

    data.forEach(video => {
      if (video.status === 'processing' || video.status === 'queued') hasProcessing = true;
      renderVideoCard(video, block);
    });

    if (hasProcessing) {
      pollingTimer = setTimeout(() => {
        if (state.currentActiveView === 'video-factory' && state.currentActiveApp === appId) {
          loadHistoricalVideos(appId);
        }
      }, 5000);
    }

  } catch (err) {
    console.error("Failed to load historical videos", err);
    block.innerHTML = '<div class="mod-style-dGV4dC1h">Failed to load assets.</div>';
  }
}

function renderVideoCard(video, container, prepend = false) {
  const card = createSafeElement('div');
  card.style.background = 'rgba(255,255,255,0.02)';
  card.style.border = '1px solid var(--border-glass)';
  card.style.padding = '14px';
  card.style.borderRadius = '6px';
  card.style.marginBottom = '12px';

  const head = createSafeElement('h5', [], video.title || `Generated Video Asset`);
  head.style.color = 'white';
  head.style.fontSize = '0.8rem';
  head.style.marginBottom = '10px';
  head.style.display = 'flex';
  head.style.justifyContent = 'space-between';

  const platformBadge = createSafeElement('span', [], video.platform || 'Unknown');
  platformBadge.style.background = 'rgba(99, 102, 241, 0.2)';
  platformBadge.style.color = '#c7d2fe';
  platformBadge.style.padding = '2px 6px';
  platformBadge.style.borderRadius = '4px';
  platformBadge.style.fontSize = '0.7rem';
  head.appendChild(platformBadge);

  let contentArea;
  
  if (video.status === 'processing' || video.status === 'queued') {
    contentArea = createSafeElement('div');
    contentArea.style.position = 'relative';
    contentArea.style.width = '100%';
    contentArea.style.aspectRatio = '16/9';
    contentArea.style.background = `linear-gradient(135deg, var(--bg-card), #0f172a)`;
    contentArea.style.borderRadius = '8px';
    contentArea.style.display = 'flex';
    contentArea.style.alignItems = 'center';
    contentArea.style.justifyContent = 'center';
    
    const spinner = createSafeElement('div', [], "Processing AI Engine... (Usually takes 10-30s)");
    spinner.style.color = "var(--primary)";
    spinner.className = 'pulse-animation'; // Assuming there's a pulse-animation class in styles.css
    contentArea.appendChild(spinner);
  } else if (video.status === 'failed') {
    contentArea = createSafeElement('div');
    contentArea.style.position = 'relative';
    contentArea.style.width = '100%';
    contentArea.style.aspectRatio = '16/9';
    contentArea.style.background = `linear-gradient(135deg, #450a0a, #0f172a)`;
    contentArea.style.borderRadius = '8px';
    contentArea.style.display = 'flex';
    contentArea.style.flexDirection = 'column';
    contentArea.style.alignItems = 'center';
    contentArea.style.justifyContent = 'center';
    contentArea.style.padding = '10px';
    contentArea.style.textAlign = 'center';
    
    const errorMsg = createSafeElement('div', [], "Generation Failed");
    errorMsg.style.color = "#f87171";
    errorMsg.style.fontWeight = 'bold';
    errorMsg.style.marginBottom = '8px';
    contentArea.appendChild(errorMsg);

    const errorDetails = createSafeElement('div', [], video.title || 'Unknown Error');
    errorDetails.style.color = "#fca5a5";
    errorDetails.style.fontSize = "0.8rem";
    contentArea.appendChild(errorDetails);
  } else if (video.video_url === 'template_mode' || video.video_url === 'assembly_mode') {
    // Mode 1/2/3 Placeholder Render
    contentArea = createSafeElement('div');
    contentArea.style.position = 'relative';
    contentArea.style.width = '100%';
    contentArea.style.aspectRatio = '16/9';
    contentArea.style.background = `linear-gradient(135deg, var(--bg-card), #0f172a)`;
    contentArea.style.borderRadius = '8px';
    contentArea.style.overflow = 'hidden';
    contentArea.style.display = 'flex';
    contentArea.style.alignItems = 'center';
    contentArea.style.justifyContent = 'center';
    contentArea.style.boxShadow = 'inset 0 0 40px rgba(0,0,0,0.5)';
    
    const animContainer = createSafeElement('div');
    animContainer.style.background = 'radial-gradient(circle at center, rgba(99, 102, 241, 0.2) 0%, transparent 70%)';
    animContainer.style.width = '100%'; 
    animContainer.style.height = '100%'; 
    animContainer.style.display = 'flex'; 
    animContainer.style.flexDirection = 'column'; 
    animContainer.style.alignItems = 'center'; 
    animContainer.style.justifyContent = 'center';
    
    const tmplText = createSafeElement('div', [], video.title?.substring(0, 60));
    tmplText.style.color = 'white'; 
    tmplText.style.fontSize = '1.5rem'; 
    tmplText.style.fontWeight = '800'; 
    tmplText.style.textAlign = 'center';
    
    animContainer.appendChild(tmplText);
    contentArea.appendChild(animContainer);
  } else {
    // Real Video Render
    contentArea = createSafeElement('video');
    contentArea.src = video.video_url;
    contentArea.style.width = '100%';
    contentArea.style.borderRadius = '8px';
    contentArea.autoplay = true;
    contentArea.loop = true;
    contentArea.muted = true;
    contentArea.controls = true;
  }

  card.appendChild(head);
  card.appendChild(contentArea);
  
  if (prepend && container.firstChild) {
    container.insertBefore(card, container.firstChild);
  } else {
    container.appendChild(card);
  }
}

export async function generateStudioVideo() {
  const promptText = document.getElementById('video-factory-prompt')?.value?.trim();
  const durationStr = document.getElementById('video-factory-duration')?.value || '5';
  const duration = parseInt(durationStr, 10);

  if (!promptText) {
    showToast("Please input a prompt to generate a video!", "error");
    return;
  }

  showToast("Routing video request to Video Marketing Agent...", "success");
  
  const block = document.getElementById('video-factory-outputs-block');
  const loadingDiv = createSafeElement('div', [], "Queueing job...");
  loadingDiv.style.color = "var(--primary)";
  loadingDiv.style.textAlign = "center";
  loadingDiv.style.padding = "20px";
  block.insertBefore(loadingDiv, block.firstChild);

  try {
    const data = await requestApi('/api/ai-gateway/generate-video', {
      method: 'POST',
      body: JSON.stringify({ prompt: promptText, type: 'campaign', appId: state.currentActiveApp, duration })
    });

    loadingDiv.remove();

    if (data.status === 'queued') {
       showToast("Job successfully queued!", "success");
    }

    // Refresh the view which will grab the new 'processing' row and start polling
    loadHistoricalVideos(state.currentActiveApp);

  } catch (err) {
    loadingDiv.remove();
    showToast("Failed to generate video.", "error");
    console.error(err);
  }
}

// Window bindings for inline DOM handlers
window.generateStudioVideo = generateStudioVideo;
