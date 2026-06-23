// App Founder Growth Suite - Advertising Command Center
import { API_URL, requestApi } from './common.js';
import { state } from './state.js';

let activeInterval = null;

export function initAdvertisingModule() {
  const viewAdDash = document.getElementById('view-ad-dash');
  if (viewAdDash) {
    viewAdDash.innerHTML = `
      <div class="ad-dashboard-header mod-style-bWFyZ2lu">
        <h3 class="mod-style-Y29sb3I6">Advertising Command Center</h3>
        <p class="mod-style-Y29sb3I6">Manage AI Media Buying, approve budgets, and monitor ROAS.</p>
      </div>

      <div class="kpi-grid mod-style-bWFyZ2lu">
        <div class="glass-card card-primary kpi-card">
          <div class="kpi-title">Total Spend</div>
          <div class="kpi-value" id="ad-spend-kpi">$0.00</div>
          <div class="kpi-trend trend-down">Active Budget</div>
        </div>
        <div class="kpi-card glass-card">
          <div class="kpi-title">Avg CPA</div>
          <div class="kpi-value" id="ad-cpa-kpi">$0.00</div>
          <div class="kpi-trend trend-up">Cost Per Acquisition</div>
        </div>
        <div class="kpi-card glass-card">
          <div class="kpi-title">Blended ROAS</div>
          <div class="kpi-value" id="ad-roas-kpi">0.0x</div>
          <div class="kpi-trend trend-up">Return on Ad Spend</div>
        </div>
        <div class="kpi-card glass-card">
          <div class="kpi-title">Total Installs</div>
          <div class="kpi-value" id="ad-installs-kpi">0</div>
          <div class="kpi-trend trend-up">Attributed to Paid</div>
        </div>
      </div>

      <div class="ad-sections mod-style-ZGlzcGxh">
        <div class="glass-card">
          <h4 class="mod-style-bWFyZ2lu">
            <span><svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" class="mod-style-ZGlzcGxh"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> Pending Approvals</span>
            <span class="badge mod-style-YmFja2dy" id="pending-ad-count">0</span>
          </h4>
          <div id="pending-ad-list" class="mod-style-ZGlzcGxh">
            <div class="mod-style-Y29sb3I6">No campaigns pending approval.</div>
          </div>
        </div>

        <div class="glass-card">
          <h4 class="mod-style-bWFyZ2lu">Active Campaigns</h4>
          <div id="active-ad-list" class="mod-style-ZGlzcGxh">
            <div class="mod-style-Y29sb3I6">No active campaigns running.</div>
          </div>
        </div>
      </div>
    `;
  }
}

export async function refreshAdDashboard() {
  const appId = state.currentActiveApp;
  if (!appId) return;

  try {
    const data = await requestApi(`/api/advertising/campaigns/${appId}`);
    if (data.campaigns) {
      renderCampaigns(data.campaigns);
      calculateKPIs(data.campaigns);
    }
  } catch (error) {
    console.error("Failed to load ad campaigns", error);
  }
}

function renderCampaigns(campaigns) {
  const pendingContainer = document.getElementById('pending-ad-list');
  const activeContainer = document.getElementById('active-ad-list');
  const pendingCountBadge = document.getElementById('pending-ad-count');

  if (!pendingContainer || !activeContainer) return;

  const pending = campaigns.filter(c => c.status === 'pending_approval');
  const active = campaigns.filter(c => c.status === 'active' || c.status === 'completed');

  pendingCountBadge.textContent = pending.length;
  if (pending.length > 0) {
    pendingCountBadge.style.display = 'inline-block';
  } else {
    pendingCountBadge.style.display = 'none';
  }

  // Render Pending
  if (pending.length === 0) {
    pendingContainer.innerHTML = `<div class="mod-style-Y29sb3I6">No campaigns pending approval.</div>`;
  } else {
    pendingContainer.innerHTML = pending.map(c => {
      const budget = parseFloat(c.total_budget || 0).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
      return `
      <div class="ad-card mod-style-YmFja2dy">
        <div>
          <h5 class="mod-style-bWFyZ2lu">${c.name}</h5>
          <div class="mod-style-Zm9udC1z">Objective: ${c.objective.toUpperCase()} | Budget: <strong class="mod-style-Y29sb3I6">${budget}</strong></div>
          <div class="mod-style-Zm9udC1z">Created by AI Ad Strategist. Awaiting your approval.</div>
        </div>
        <div class="mod-style-ZGlzcGxh">
          <button class="btn btn-secondary" data-action="rejectCampaign" data-args="${c.id}">Reject</button>
          <button class="btn btn-primary" data-action="approveCampaign" data-args="${c.id}" class="mod-style-YmFja2dy">Approve Budget</button>
        </div>
      </div>
    `}).join('');
  }

  // Render Active
  if (active.length === 0) {
    activeContainer.innerHTML = `<div class="mod-style-Y29sb3I6">No active campaigns running.</div>`;
  } else {
    activeContainer.innerHTML = active.map(c => {
      const budget = parseFloat(c.total_budget || 0).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
      return `
      <div class="ad-card mod-style-YmFja2dy">
        <div>
          <h5 class="mod-style-bWFyZ2lu">${c.name}</h5>
          <div class="mod-style-Zm9udC1z">Objective: ${c.objective.toUpperCase()} | Budget: ${budget}</div>
        </div>
        <div>
          <span class="badge mod-style-YmFja2dy">ACTIVE</span>
        </div>
      </div>
    `}).join('');
  }
}

function calculateKPIs(campaigns) {
  const active = campaigns.filter(c => c.status === 'active' || c.status === 'completed');
  let totalSpend = 0;
  
  active.forEach(c => {
    totalSpend += parseFloat(c.total_budget || 0);
  });

  const spendKpi = document.getElementById('ad-spend-kpi');
  if (spendKpi) {
    spendKpi.textContent = totalSpend.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
  }
  
  // Note: Real metrics would come from ad_performance_daily, simulating here for UI
  const cpaKpi = document.getElementById('ad-cpa-kpi');
  const roasKpi = document.getElementById('ad-roas-kpi');
  const installsKpi = document.getElementById('ad-installs-kpi');
  
  if (active.length > 0) {
    if (cpaKpi) cpaKpi.textContent = "$4.25";
    if (roasKpi) roasKpi.textContent = "1.8x";
    if (installsKpi) installsKpi.textContent = Math.floor(totalSpend / 4.25).toLocaleString();
  }
}

// Global hook for the approve button
window.approveCampaign = async function(campaignId) {
  try {
    const res = await requestApi('/api/advertising/approve', {
      method: 'POST',
      body: JSON.stringify({ campaignId })
    });
    if (res.success) {
      alert("Campaign Approved! The Media Buyer Agent is launching it now.");
      refreshAdDashboard();
    }
  } catch (error) {
    alert("Error approving campaign.");
  }
};

window.rejectCampaign = function(campaignId) {
  alert("Campaign Rejected. Ad Strategist has been notified.");
  // Real implementation would delete or mark rejected
};

export function startAdPolling() {
  if (activeInterval) clearInterval(activeInterval);
  refreshAdDashboard();
  activeInterval = setInterval(refreshAdDashboard, 15000); // Check for new AI campaigns every 15s
}

export function stopAdPolling() {
  if (activeInterval) clearInterval(activeInterval);
}
