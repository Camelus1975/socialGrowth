// Business Discovery Module - Frontend
import { state } from './state.js';
import { showToast, closeModal, requestApi } from './common.js';
import { selectActiveApp, switchView } from './app.js';
import { renderAppSelectorDropdown } from './appManager.js';
import { getTemplateForBusiness } from './industryTemplates.js';
import { getSupabaseClient } from './auth.js';

let discoveryPollingInterval = null;

export function initBusinessDiscovery() {
  const startBtn = document.getElementById('discovery-start-btn');
  if (startBtn) {
    startBtn.addEventListener('click', startDiscovery);
  }
  
  const closeBtn = document.getElementById('discovery-wizard-close-btn');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      resetWizard();
      closeModal('discovery-wizard-modal');
      switchView('dashboard');
    });
  }
}

async function startDiscovery() {
  const appNameInput = document.getElementById('discovery-app-name');
  const websiteInput = document.getElementById('discovery-url-website');
  const igInput = document.getElementById('discovery-url-ig');
  const gmbInput = document.getElementById('discovery-url-gmb');
  const linkedInInput = document.getElementById('discovery-url-linkedin');
  
  const appName = appNameInput ? appNameInput.value.trim() : '';
  
  if (!appName) {
    showToast('App / Business Name is required.', 'error');
    return;
  }
  
  if (!websiteInput.value.trim()) {
    showToast('Website URL is required.', 'error');
    return;
  }
  
  const businessTypeInput = document.getElementById('new-app-business-type');
  const businessType = businessTypeInput ? businessTypeInput.value : 'saas';
  
  const urls = {
    website: websiteInput.value.trim(),
    instagram: igInput.value.trim(),
    google_business: gmbInput ? gmbInput.value.trim() : '',
    linkedin: linkedInInput.value.trim()
  };
  
  // Use a clean slug-based ID (not the URL-derived one)
  const appId = appName.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '') + '_' + Date.now().toString(36);
  
  // Transition to Step 2
  document.getElementById('discovery-step-1').style.display = 'none';
  document.getElementById('discovery-step-2').style.display = 'block';
  
  try {
    const res = await requestApi('/api/discovery/start', {
      method: 'POST',
      body: JSON.stringify({ urls, appId, businessType, name: appName })
    });
    if (!res || !res.jobId) throw new Error("Failed to start discovery job.");
    
    // Store the UUID returned by the backend for later use
    const bizUuid = res.bizUuid;
    
    // Start Polling — pass appName and bizUuid for finalization
    discoveryPollingInterval = setInterval(() => pollJobStatus(res.jobId, appId, appName, businessType, bizUuid), 2000);
  } catch (err) {
    alert("DISCOVERY ERROR: " + (err.message || 'Discovery failed to start.'));
    showToast(err.message || 'Discovery failed to start.', 'error');
    resetWizard();
  }
}

async function pollJobStatus(jobId, appId, appName, businessType, bizUuid) {
  try {
    const job = await requestApi(`/api/discovery/status/${jobId}`, 'GET');
    
    if (job) {
      updateProgressUI(job.progress_percent, job.logs[job.logs.length - 1]);
      
      if (job.status === 'complete') {
        clearInterval(discoveryPollingInterval);
        await finalizeDiscovery(appId, appName, businessType, bizUuid);
      } else if (job.status === 'failed') {
        clearInterval(discoveryPollingInterval);
        const errorLog = job.logs && job.logs.length > 0 ? job.logs[job.logs.length - 1] : 'Unknown error';
        alert('BACKEND CRASH LOG: ' + errorLog);
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

async function finalizeDiscovery(appId, appName, businessType, bizUuid) {
  showToast('Discovery Complete! Loading brand intelligence...', 'success');
  
  // Fetch the REAL discovery profile from Supabase
  let discoveryProfile = null;
  try {
    const supabase = getSupabaseClient();
    if (supabase) {
      const { data, error } = await supabase
        .from('businesses')
        .select('discovery_profile, name')
        .eq('id', bizUuid)
        .single();
      if (!error && data?.discovery_profile) {
        discoveryProfile = data.discovery_profile;
      }
    }
  } catch (e) {
    console.warn('Could not fetch discovery profile from DB:', e);
  }
  
  // Fallback if DB fetch fails
  if (!discoveryProfile) {
    discoveryProfile = {
      businessProfile: {
        name: appName,
        summary: "Brand profile generated. Refresh to see full details."
      },
      brandVoice: { tone: "Professional" },
      audits: { marketingReadinessScore: 0 },
      brandKit: { logoColor: "#4F46E5" }
    };
  }
  
  // Transition to Step 3
  document.getElementById('discovery-step-2').style.display = 'none';
  document.getElementById('discovery-step-3').style.display = 'block';
  
  // Display REAL data from the discovery profile
  const profile = discoveryProfile.businessProfile || {};
  const displayName = profile.name || appName;
  
  document.getElementById('discovery-result-name').innerText = displayName;
  document.getElementById('discovery-result-summary').innerText = profile.summary || 'Brand profile generated.';
  document.getElementById('discovery-result-tone').innerText = discoveryProfile.brandVoice?.tone || 'Professional';
  document.getElementById('discovery-result-score').innerText = (discoveryProfile.audits?.marketingReadinessScore || 0) + '/100';
  
  const template = getTemplateForBusiness(businessType);
  const kpiData = {};
  template.kpis.forEach(kpi => {
    kpiData[kpi.id] = [0, 0, 0, 0, 0, 0];
  });

  // Add to state with the REAL discovery profile and the clean display name
  state.appsData[appId] = {
    id: appId,
    bizUuid: bizUuid, // Store the Supabase UUID for DB operations
    name: displayName,
    category: profile.industry || "Discovered Business",
    businessType: businessType,
    logoColor: discoveryProfile.brandKit?.colors?.primary || discoveryProfile.brandKit?.logoColor || "#4F46E5",
    discoveryProfile: discoveryProfile,
    metrics: kpiData,
    analytics: { months: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"] }
  };
  
  renderAppSelectorDropdown();
  selectActiveApp(appId);
  
  // Automate transition to dashboard after 3 seconds
  setTimeout(() => {
    closeModal('discovery-wizard-modal');
    switchView('dashboard');
  }, 3000);
}

function resetWizard() {
  document.getElementById('discovery-step-1').style.display = 'block';
  document.getElementById('discovery-step-2').style.display = 'none';
  document.getElementById('discovery-step-3').style.display = 'none';
  if (discoveryPollingInterval) clearInterval(discoveryPollingInterval);
}
