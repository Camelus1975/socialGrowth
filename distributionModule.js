import { state } from './state.js';
import { requestApi, showToast, createSafeElement } from './common.js';

export function initDistributionEngine() {
  state.on('appChanged', () => {
    refreshDistributionView();
  });
  
  state.on('viewChanged', () => {
    if (state.currentActiveView === 'autonomous-growth') {
      refreshDistributionView();
    }
  });
}

function refreshDistributionView() {
  const viewId = state.currentActiveView;
  if (viewId !== 'autonomous-growth') return;

  const app = state.appsData[state.currentActiveApp];
  if (!app) return;

  const titleEl = document.getElementById('autonomous-growth-title');
  if (titleEl) titleEl.textContent = `Autonomous Growth Mode: ${app.name}`;
}

export async function executeAutonomousGrowth() {
  const promptText = document.getElementById('autonomous-growth-objective')?.value?.trim();
  if (!promptText) {
    showToast("Please set a growth objective!", "error");
    return;
  }

  showToast("Initializing Autonomous Growth Pipeline...", "success");
  
  const block = document.getElementById('autonomous-pipeline-block');
  block.innerHTML = ''; // clear previous run

  const steps = [
    { name: "CMO Agent: Formulating Strategy", delay: 1000 },
    { name: "Content Writer: Drafting Copy", delay: 2000 },
    { name: "Video Factory: Generating Media", delay: 4000 },
    { name: "Publishing Agent: Predicting Success", delay: 5500 },
    { name: "Distribution Engine: Scheduling", delay: 7000 }
  ];

  for (const step of steps) {
    const el = createSafeElement('div', [], `⏳ ${step.name}`);
    el.style.padding = '10px';
    el.style.borderBottom = '1px solid rgba(255,255,255,0.1)';
    block.appendChild(el);
    
    await new Promise(r => setTimeout(r, step.delay / 5)); // sped up for demo
    el.textContent = `✅ ${step.name}`;
    el.style.color = 'var(--primary)';
  }

  // Final success UI
  const successCard = createSafeElement('div');
  successCard.style.background = 'rgba(16, 185, 129, 0.1)';
  successCard.style.border = '1px solid rgba(16, 185, 129, 0.4)';
  successCard.style.padding = '20px';
  successCard.style.marginTop = '20px';
  successCard.style.borderRadius = '8px';
  
  const app = state.appsData[state.currentActiveApp];
  const type = app?.type || 'generic';
  
  let targetPlatforms = 'LinkedIn, X, and Email';
  let metricLabel = 'Expected Signups';
  let score = Math.floor(Math.random() * 15) + 80; // 80-94
  let metricValue = Math.floor(Math.random() * 200) + 50;

  if (type === 'ecommerce') {
    targetPlatforms = 'Instagram, TikTok, and Email';
    metricLabel = 'Expected Purchases';
    metricValue = Math.floor(Math.random() * 50) + 20;
  } else if (type === 'local') {
    targetPlatforms = 'Facebook, Instagram, and Local SEO';
    metricLabel = 'Expected Leads/Walk-ins';
    metricValue = Math.floor(Math.random() * 30) + 10;
  } else if (type === 'creator') {
    targetPlatforms = 'YouTube, Instagram, and TikTok';
    metricLabel = 'Expected Engagement';
    metricValue = Math.floor(Math.random() * 5000) + 1000;
  } else if (type === 'agency') {
    targetPlatforms = 'LinkedIn, Email, and Facebook';
    metricLabel = 'Expected Consultations';
    metricValue = Math.floor(Math.random() * 10) + 2;
  } else if (type === 'saas') {
    targetPlatforms = 'LinkedIn, X, and Email';
    metricLabel = 'Expected Trial Signups';
  }

  successCard.innerHTML = `
    <h4 style="color: #10b981; margin-bottom: 10px;">Pipeline Scheduled Successfully!</h4>
    <p style="font-size: 0.9rem; margin-bottom: 5px;"><strong>Target:</strong> ${targetPlatforms}</p>
    <p style="font-size: 0.9rem; margin-bottom: 5px;"><strong>Predicted Success Score:</strong> ${score}/100</p>
    <p style="font-size: 0.9rem; margin-bottom: 5px;"><strong>${metricLabel}:</strong> ${metricValue}</p>
    <p style="font-size: 0.8rem; color: #9ca3af; margin-top: 15px;">The Distribution Engine will automatically execute these posts according to the predicted optimal timing.</p>
  `;
  
  block.appendChild(successCard);
  showToast("Autonomous Pipeline deployed to Queue.", "success");
}
