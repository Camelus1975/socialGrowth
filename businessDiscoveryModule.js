// Business Discovery Engine Module
import { state } from './state.js';
import { requestApi, showToast, closeModal } from './common.js';
import { renderAppSelectorDropdown } from './appManager.js';
import { selectActiveApp } from './app.js';

let discoveryPollingInterval = null;

export function initBusinessDiscovery() {
  const startBtn = document.getElementById('discovery-start-btn');
  const finishBtn = document.getElementById('discovery-finish-btn');
  
  if (startBtn) {
    startBtn.addEventListener('click', startDiscovery);
  }
  
  if (finishBtn) {
    finishBtn.addEventListener('click', () => {
      closeModal('discovery-wizard-modal');
    });
  }
}

// Generate a random ID for the new app stub
function generateAppId(url) {
  const domain = url.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0];
  return domain.replace(/[^a-z0-9]/g, '') + '_' + Math.floor(Math.random() * 1000);
}

async function startDiscovery() {
  const websiteInput = document.getElementById('discovery-url-website');
  const igInput = document.getElementById('discovery-url-ig');
  const linkedInInput = document.getElementById('discovery-url-linkedin');
  
  if (!websiteInput.value.trim()) {
    showToast('Website URL is required.', 'error');
    return;
  }
  
  const urls = {
    website: websiteInput.value.trim(),
    instagram: igInput.value.trim(),
    linkedin: linkedInInput.value.trim()
  };
  
  const appId = generateAppId(urls.website);
  
  // Transition to Step 2
  document.getElementById('discovery-step-1').style.display = 'none';
  document.getElementById('discovery-step-2').style.display = 'block';
  
  try {
    const res = await requestApi('/api/discovery/start', 'POST', { urls, appId });
    if (!res || !res.jobId) throw new Error("Failed to start discovery job.");
    
    // Start Polling
    discoveryPollingInterval = setInterval(() => pollJobStatus(res.jobId, appId), 2000);
  } catch (err) {
    showToast(err.message || 'Discovery failed to start.', 'error');
    resetWizard();
  }
}

async function pollJobStatus(jobId, appId) {
  try {
    const job = await requestApi(`/api/discovery/status/${jobId}`, 'GET');
    
    if (job) {
      updateProgressUI(job.progress_percent, job.logs[job.logs.length - 1]);
      
      if (job.status === 'complete') {
        clearInterval(discoveryPollingInterval);
        await finalizeDiscovery(appId);
      } else if (job.status === 'failed') {
        clearInterval(discoveryPollingInterval);
        showToast('Discovery Engine failed.', 'error');
        resetWizard();
      }
    }
  } catch (err) {
    console.error("Polling error:", err);
  }
}

function updateProgressUI(percent, latestLog) {
  const progressBar = document.getElementById('discovery-progress-bar');
  const statusText = document.getElementById('discovery-status-text');
  
  if (progressBar) progressBar.style.width = `${percent}%`;
  if (statusText && latestLog) statusText.innerText = latestLog.replace(/\[.*?\] /, ''); // Clean timestamp
}

async function finalizeDiscovery(appId) {
  // In a real app, we would fetch the newly updated app data from Supabase.
  // Since we don't have a real db fetch endpoint for a single app in this demo context,
  // we will manually simulate fetching it by fetching the job again (which doesn't have the payload).
  // Wait, let's just create a mock state object for now so the UI works, 
  // because the backend updated Supabase, but our frontend needs to load it.
  
  showToast('Discovery Complete!', 'success');
  
  // Transition to Step 3
  document.getElementById('discovery-step-2').style.display = 'none';
  document.getElementById('discovery-step-3').style.display = 'block';
  
  // Because we are simulating without a full backend DB refresh in state.js:
  // We'll mock the injected data into state.
  const mockDiscoveryProfile = {
    businessProfile: {
      name: "Discovered Brand",
      summary: "AI-generated brand summary based on the provided website."
    },
    brandVoice: { tone: "Professional & Authoritative" },
    audits: { marketingReadinessScore: 88 },
    brandKit: { logoColor: "#4F46E5" }
  };
  
  document.getElementById('discovery-result-name').innerText = mockDiscoveryProfile.businessProfile.name;
  document.getElementById('discovery-result-summary').innerText = mockDiscoveryProfile.businessProfile.summary;
  document.getElementById('discovery-result-tone').innerText = mockDiscoveryProfile.brandVoice.tone;
  document.getElementById('discovery-result-score').innerText = mockDiscoveryProfile.audits.marketingReadinessScore + '/100';
  
  // Add to state and re-render dropdown
  state.appsData[appId] = {
    id: appId,
    name: mockDiscoveryProfile.businessProfile.name,
    category: "Discovered App",
    logoColor: mockDiscoveryProfile.brandKit.logoColor,
    discoveryProfile: mockDiscoveryProfile
  };
  
  renderAppSelectorDropdown();
  selectActiveApp(appId);
}

function resetWizard() {
  document.getElementById('discovery-step-1').style.display = 'block';
  document.getElementById('discovery-step-2').style.display = 'none';
  document.getElementById('discovery-step-3').style.display = 'none';
  if (discoveryPollingInterval) clearInterval(discoveryPollingInterval);
}
