import { state } from './state.js';
import { requestApi, showToast, createSafeElement } from './common.js';

export function initVideoFactory() {
  state.on('appChanged', () => {
    refreshVideoFactoryView();
  });
  
  state.on('viewChanged', () => {
    if (state.currentActiveView === 'video-factory') {
      refreshVideoFactoryView();
    }
  });
}

function refreshVideoFactoryView() {
  const viewId = state.currentActiveView;
  if (viewId !== 'video-factory') return;

  const app = state.appsData[state.currentActiveApp];
  if (!app) return;

  const titleEl = document.getElementById('video-factory-app-title');
  if (titleEl) titleEl.textContent = `Video Assembly Line: ${app.name}`;
}

export async function generateStudioVideo() {
  const promptText = document.getElementById('video-factory-prompt')?.value?.trim();
  if (!promptText) {
    showToast("Please input a prompt to generate a video!", "error");
    return;
  }

  showToast("Routing video request to Video Marketing Agent...", "success");
  
  const block = document.getElementById('video-factory-outputs-block');
  const loadingDiv = createSafeElement('div', [], "Assembling video... Processing AI Agent Storyboard (~30-90s)");
  loadingDiv.style.color = "var(--primary)";
  loadingDiv.style.textAlign = "center";
  loadingDiv.style.padding = "20px";
  block.insertBefore(loadingDiv, block.firstChild);

  try {
    const data = await requestApi('/api/ai-gateway/generate-video', {
      method: 'POST',
      body: JSON.stringify({ prompt: promptText, type: 'campaign', appId: state.currentActiveApp })
    });

    loadingDiv.remove();

    const card = createSafeElement('div');
    card.style.background = 'rgba(255,255,255,0.02)';
    card.style.border = '1px solid var(--border-glass)';
    card.style.padding = '14px';
    card.style.borderRadius = '6px';
    card.style.marginBottom = '12px';

    const head = createSafeElement('h5', [], `Generated Video Asset (Mode: ${data.mode})`);
    head.style.color = 'white';
    head.style.fontSize = '0.8rem';
    head.style.marginBottom = '10px';

    let contentArea;

    if (data.mode === 'template' || data.mode === 'motion_graphics' || data.mode === 'assembly_mode') {
      // Modes 1, 2, 3: Template Rendering or HTML/CSS Assembly
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
      
      // We inject CSS keyframes dynamically for this specific video
      const styleId = 'video-anim-style-' + Date.now();
      const styleEl = document.createElement('style');
      styleEl.id = styleId;
      styleEl.textContent = `
        @keyframes slideUpFade {
          0% { transform: translateY(30px); opacity: 0; }
          15% { transform: translateY(0); opacity: 1; }
          85% { transform: translateY(0); opacity: 1; }
          100% { transform: translateY(-30px); opacity: 0; }
        }
        @keyframes zoomBg {
          0% { background-size: 100% 100%; }
          50% { background-size: 120% 120%; }
          100% { background-size: 100% 100%; }
        }
        .anim-container {
          animation: zoomBg 10s infinite alternate ease-in-out;
          background: radial-gradient(circle at center, rgba(99, 102, 241, 0.2) 0%, transparent 70%);
          width: 100%; height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center;
        }
        .anim-text {
          animation: slideUpFade 4s infinite linear;
          color: white; font-family: 'Inter', sans-serif; font-size: 1.5rem; font-weight: 800; text-align: center;
          padding: 0 40px; text-shadow: 0 4px 10px rgba(0,0,0,0.8);
        }
        .anim-logo {
          animation: slideUpFade 4s infinite linear; animation-delay: 2s;
          color: var(--primary); font-size: 1rem; margin-top: 20px; font-weight: bold; letter-spacing: 2px;
        }
      `;
      document.head.appendChild(styleEl);

      const animContainer = createSafeElement('div');
      animContainer.className = 'anim-container';
      
      const tmplText = createSafeElement('div', [], promptText.substring(0, 60) + (promptText.length > 60 ? "..." : ""));
      tmplText.className = 'anim-text';
      
      const appName = state.appsData[state.currentActiveApp]?.name || "Brand";
      const tmplLogo = createSafeElement('div', [], appName.toUpperCase());
      tmplLogo.className = 'anim-logo';
      
      animContainer.appendChild(tmplText);
      animContainer.appendChild(tmplLogo);
      contentArea.appendChild(animContainer);
      
      // Clean up styles when removed
      const observer = new MutationObserver((mutations) => {
        if (!document.body.contains(contentArea)) {
          styleEl.remove();
          observer.disconnect();
        }
      });
      observer.observe(document.body, { childList: true, subtree: true });

      showToast(`${data.mode} motion graphics rendering initialized ($${data.cost} cost).`, "success");

    } else {
      // Mode 4: Premium AI Video (e.g. Minimax / Luma)
      contentArea = createSafeElement('video');
      contentArea.src = data.url;
      contentArea.style.width = '100%';
      contentArea.style.borderRadius = '8px';
      contentArea.autoplay = true;
      contentArea.loop = true;
      contentArea.muted = true;
      contentArea.controls = true;
      
      showToast(`Premium AI Video created! Cost: $${data.cost}`, "success");
    }

    card.appendChild(head);
    card.appendChild(contentArea);
    block.insertBefore(card, block.firstChild);

  } catch (err) {
    loadingDiv.remove();
    showToast("Failed to generate video.", "error");
    console.error(err);
  }
}

// Window bindings for inline DOM handlers
window.generateStudioVideo = generateStudioVideo;
