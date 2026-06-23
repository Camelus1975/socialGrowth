// Billing & Growth Credit Module
// Handles client-side billing logic, UI updates, and Stripe interactions

import { requestApi } from './common.js';

let currentBalance = 0;
let currentPlan = 'free';

export async function initBillingModule() {
  console.log('[Billing] Initializing...');
  await refreshBillingStatus();
  
  // Attach to window for global inline onclick handlers
  window.billingModule = {
    showUpgradeModal,
    checkout,
    openPortal,
    getCurrentBalance: () => currentBalance,
    getCurrentPlan: () => currentPlan
  };
}

export async function refreshBillingStatus() {
  try {
    const data = await requestApi('/api/billing/status');
    if (data && !data.error) {
      currentBalance = data.credit_balance || 0;
      currentPlan = data.plan_id || 'free';
      updateCreditsUI();
    }
  } catch (err) {
    console.warn('[Billing] Failed to fetch billing status:', err);
  }
}

function updateCreditsUI() {
  const pillText = document.getElementById('header-credits-text');
  if (pillText) {
    pillText.textContent = `Credits: ${currentBalance}`;
    
    // Turn red if low
    if (currentBalance <= 5) {
      pillText.style.color = 'var(--accent-red)';
    } else {
      pillText.style.color = 'var(--text-primary)';
    }
  }
}

export function showUpgradeModal() {
  const modal = document.getElementById('billing-modal');
  if (modal) {
    modal.style.display = 'flex';
  }
}

export async function checkout(planId, isPack = false) {
  try {
    // Show loading state on buttons ideally, but simple implementation for now
    const res = await requestApi('/api/billing/checkout', {
      method: 'POST',
      body: JSON.stringify({ planId, isPack })
    });
    
    if (res.error) {
      alert(res.error);
      return;
    }

    if (res.url) {
      window.location.href = res.url;
    }
  } catch (err) {
    console.error('[Billing] Checkout error:', err);
    alert('Failed to start checkout process.');
  }
}

export async function openPortal() {
  try {
    const res = await requestApi('/api/billing/portal', {
      method: 'POST'
    });
    
    if (res.error) {
      alert(res.error);
      return;
    }

    if (res.url) {
      window.location.href = res.url;
    }
  } catch (err) {
    console.error('[Billing] Portal error:', err);
    alert('Failed to open billing portal.');
  }
}

// Global helper to catch AI Gateway 402 errors and trigger the upgrade modal
export function handleBillingError(response) {
  if (response && response.status === 402) {
    // Attempt to parse JSON to see if it's explicitly our OUT_OF_CREDITS error
    // but typically utils.js _fetchAPI already parses JSON.
    showUpgradeModal();
    return true; // Handled
  }
  return false; // Not a billing error
}
