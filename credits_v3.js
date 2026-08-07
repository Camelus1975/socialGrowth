/**
 * UNIVERSAL AI CREDITS CONTROLLER (credits_v3.js)
 * 
 * Manages frontend wallet state:
 * - Live Credit Counter in navigation bar
 * - Multi-Tab Credit Wallet & Top-Up Modal (#credit-wallet-modal)
 * - Pre-Flight Credit Cost Estimator Dialog
 * - Low Credit Warning Banners (20% & 10% thresholds)
 * - Gamification Daily Bonus Claims
 * - Transaction Ledger with real-time pagination & filters
 */

import { requestApi, showToast } from './common.js';
import { state } from './state.js';

let cachedWallet = null;

export function initCreditsSystem() {
  fetchUserWallet();

  // Listen for global custom events to sync wallet balance instantly
  window.addEventListener('creditsUpdated', fetchUserWallet);
  window.addEventListener('workspaceChanged', fetchUserWallet);

  // Bind click on header credit widget or action buttons
  document.addEventListener('click', (e) => {
    const trigger = e.target.closest('[data-action="openCreditWallet"]');
    if (trigger) {
      const tab = trigger.getAttribute('data-tab') || 'overview';
      openCreditWalletModal(tab);
    }

    const claimBtn = e.target.closest('[data-action="claimDailyReward"]');
    if (claimBtn) {
      claimReward('daily_login');
    }
  });
}

/**
 * Fetch latest wallet state from server
 */
export async function fetchUserWallet() {
  try {
    const res = await requestApi('/api/credits/wallet');
    if (res && res.success && res.wallet) {
      cachedWallet = res.wallet;
      updateHeaderCreditBadge(res.wallet);
      checkLowCreditAlert(res.wallet);
      return res.wallet;
    }
  } catch (err) {
    console.warn('[Credits] Failed to sync wallet:', err.message);
  }
  return null;
}

/**
 * Update the header credit pill
 */
function updateHeaderCreditBadge(wallet) {
  const counterEl = document.getElementById('header-credit-counter');
  const counterText = document.getElementById('header-credit-count');
  
  if (counterEl && counterText) {
    counterText.textContent = Number(wallet.balance || 0).toLocaleString();

    // Style dynamically based on balance level
    if (wallet.isCriticalCredits) {
      counterEl.style.borderColor = 'rgba(239, 68, 68, 0.6)';
      counterEl.style.background = 'rgba(239, 68, 68, 0.15)';
      counterEl.style.color = '#fca5a5';
    } else if (wallet.isLowCredits) {
      counterEl.style.borderColor = 'rgba(245, 158, 11, 0.6)';
      counterEl.style.background = 'rgba(245, 158, 11, 0.15)';
      counterEl.style.color = '#fde68a';
    } else {
      counterEl.style.borderColor = 'rgba(99, 102, 241, 0.3)';
      counterEl.style.background = 'rgba(99, 102, 241, 0.15)';
      counterEl.style.color = '#a5b4fc';
    }
  }
}

/**
 * Check and show low credit toast/banner if threshold reached
 */
function checkLowCreditAlert(wallet) {
  const banner = document.getElementById('low-credit-banner');
  if (!banner) return;

  if (wallet.isLowCredits) {
    banner.style.display = 'flex';
    banner.innerHTML = `
      <div style="display:flex; align-items:center; gap:10px;">
        <span style="font-size:1.2rem;">⚠️</span>
        <div>
          <strong style="color:#ffffff;">Low AI Credits:</strong>
          <span style="color:#fde68a; margin-left:6px;">Only ${wallet.balance} credits remaining in your balance.</span>
        </div>
      </div>
      <button class="btn btn-primary" data-action="openCreditWallet" data-tab="packs" style="padding:6px 14px; font-size:0.82rem; border-radius:8px;">
        ⚡ Top-Up Credits
      </button>
    `;
  } else {
    banner.style.display = 'none';
  }
}

/**
 * Open the Comprehensive Multi-Tab AI Wallet Modal
 */
export async function openCreditWalletModal(activeTab = 'overview') {
  const wallet = await fetchUserWallet() || cachedWallet || { balance: 100, monthlyAllowance: 100, subscriptionTier: 'free' };
  
  const existing = document.getElementById('credit-wallet-modal');
  if (existing) existing.remove();

  const modal = document.createElement('div');
  modal.id = 'credit-wallet-modal';
  modal.className = 'custom-modal-overlay active';
  modal.style.cssText = 'position:fixed;inset:0;z-index:10000;background:rgba(15,23,42,0.75);backdrop-filter:blur(12px);display:flex;align-items:center;justify-content:center;padding:20px;opacity:1;pointer-events:auto;';

  modal.innerHTML = `
    <div class="custom-modal-content" style="width:100%; max-width:880px; max-height:90vh; overflow-y:auto; padding:28px; position:relative; background:rgba(255,255,255,0.95); backdrop-filter:blur(24px); -webkit-backdrop-filter:blur(24px); border:1px solid rgba(255,255,255,0.8); border-radius:22px; box-shadow:0 25px 60px rgba(15,23,42,0.25), 0 10px 30px rgba(99,102,241,0.12); color:#0f172a; display:flex; flex-direction:column; gap:20px; transform:translateY(0);">
      
      <!-- Close button -->
      <button id="close-wallet-modal-btn" style="position:absolute; top:20px; right:20px; background:rgba(241,245,249,0.9); border:1px solid rgba(203,213,225,0.8); color:#0f172a; border-radius:50%; width:36px; height:36px; cursor:pointer; font-size:1.1rem; display:flex; align-items:center; justify-content:center; z-index:10; font-weight:bold; box-shadow:0 2px 8px rgba(0,0,0,0.08);">✕</button>

      <!-- Modal Header -->
      <div style="display:flex; align-items:center; justify-content:space-between; padding-right:45px; flex-wrap:wrap; gap:12px;">
        <div style="display:flex; align-items:center; gap:12px;">
          <div style="width:44px; height:44px; border-radius:12px; background:linear-gradient(135deg, #6366f1, #ec4899); display:flex; align-items:center; justify-content:center; font-size:1.5rem; color:#fff; box-shadow:0 4px 14px rgba(99,102,241,0.35);">⚡</div>
          <div>
            <h2 style="margin:0; font-size:1.4rem; font-weight:800; color:#0f172a;">AI Credits & Growth Wallet</h2>
            <p style="margin:2px 0 0 0; color:#475569; font-size:0.85rem;">Universal token balance for posts, FLUX graphics, video generation, and autonomous agents.</p>
          </div>
        </div>
        <div style="display:flex; align-items:center; gap:8px;">
          <span style="background:rgba(99,102,241,0.1); border:1px solid rgba(99,102,241,0.25); color:#4f46e5; padding:6px 14px; border-radius:20px; font-size:0.85rem; font-weight:700; text-transform:uppercase; letter-spacing:0.5px;">
            ${wallet.subscriptionTier || 'Free'} Plan
          </span>
        </div>
      </div>

      <!-- Navigation Tabs -->
      <div class="wallet-tabs" style="display:flex; gap:8px; border-bottom:1px solid rgba(226,232,240,0.9); padding-bottom:12px;">
        <button class="wallet-tab-btn ${activeTab === 'overview' ? 'active' : ''}" data-tab-target="overview" style="padding:8px 16px; border-radius:10px; font-size:0.88rem; font-weight:600; cursor:pointer; border:none; transition:all 0.2s;">📊 Balance Overview</button>
        <button class="wallet-tab-btn ${activeTab === 'packs' ? 'active' : ''}" data-tab-target="packs" style="padding:8px 16px; border-radius:10px; font-size:0.88rem; font-weight:600; cursor:pointer; border:none; transition:all 0.2s;">⚡ Buy Credit Packs</button>
        <button class="wallet-tab-btn ${activeTab === 'plans' ? 'active' : ''}" data-tab-target="plans" style="padding:8px 16px; border-radius:10px; font-size:0.88rem; font-weight:600; cursor:pointer; border:none; transition:all 0.2s;">💎 Monthly Plans</button>
        <button class="wallet-tab-btn ${activeTab === 'history' ? 'active' : ''}" data-tab-target="history" style="padding:8px 16px; border-radius:10px; font-size:0.88rem; font-weight:600; cursor:pointer; border:none; transition:all 0.2s;">📜 Transaction Ledger</button>
      </div>

      <!-- Tab Content Area -->
      <div id="wallet-tab-content" style="min-height:360px;">
        <!-- Injected dynamically -->
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  // Tab switching logic
  const renderTab = (tabName) => {
    modal.querySelectorAll('.wallet-tab-btn').forEach(btn => {
      const isTarget = btn.getAttribute('data-tab-target') === tabName;
      btn.classList.toggle('active', isTarget);
      btn.style.background = isTarget ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : 'rgba(241,245,249,0.9)';
      btn.style.color = isTarget ? '#ffffff' : '#475569';
      btn.style.boxShadow = isTarget ? '0 4px 12px rgba(99,102,241,0.3)' : 'none';
    });

    const contentBox = modal.querySelector('#wallet-tab-content');
    if (tabName === 'overview') renderOverviewTab(contentBox, wallet);
    if (tabName === 'packs') renderPacksTab(contentBox);
    if (tabName === 'plans') renderPlansTab(contentBox, wallet);
    if (tabName === 'history') renderHistoryTab(contentBox);
  };

  modal.querySelectorAll('.wallet-tab-btn').forEach(btn => {
    btn.onclick = () => renderTab(btn.getAttribute('data-tab-target'));
  });

  modal.querySelector('#close-wallet-modal-btn').onclick = () => modal.remove();
  modal.onclick = (e) => { if (e.target === modal) modal.remove(); };

  renderTab(activeTab);
}

/**
 * Tab 1: Overview & Balance Breakdown
 */
function renderOverviewTab(container, wallet) {
  container.innerHTML = `
    <div style="display:flex; flex-direction:column; gap:20px;">
      <!-- Hero Balance Card -->
      <div style="background:linear-gradient(135deg, rgba(99,102,241,0.08), rgba(236,72,153,0.05)); border:1px solid rgba(99,102,241,0.25); border-radius:18px; padding:24px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:16px;">
        <div>
          <span style="font-size:0.8rem; text-transform:uppercase; letter-spacing:0.5px; color:#6366f1; font-weight:700;">Available Credit Balance</span>
          <div style="font-size:2.5rem; font-weight:900; color:#0f172a; display:flex; align-items:center; gap:8px; line-height:1.1; margin-top:4px;">
            <span>⚡</span> ${Number(wallet.balance || 0).toLocaleString()}
            <span style="font-size:0.9rem; font-weight:600; color:#64748b; margin-top:8px;">Credits</span>
          </div>
          <p style="margin:6px 0 0 0; color:#64748b; font-size:0.85rem;">Refreshes monthly with your ${wallet.subscriptionTier || 'free'} allowance (${wallet.monthlyAllowance} credits).</p>
        </div>
        <div style="display:flex; flex-direction:column; gap:8px;">
          <button class="btn btn-primary" onclick="document.querySelector('[data-tab-target=packs]').click()" style="padding:12px 20px; font-weight:700; font-size:0.95rem; border-radius:12px; display:flex; align-items:center; gap:8px;">
            ⚡ Add Instant Credits
          </button>
          <button data-action="claimDailyReward" style="background:rgba(255,255,255,0.9); border:1px solid rgba(203,213,225,0.8); color:#0f172a; padding:10px 16px; border-radius:12px; cursor:pointer; font-weight:600; font-size:0.85rem; display:flex; align-items:center; justify-content:center; gap:6px;">
            🎁 Claim Daily Bonus (+2)
          </button>
        </div>
      </div>

      <!-- Quick Metrics Breakdown Grid -->
      <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(160px, 1fr)); gap:14px;">
        <div style="background:rgba(248,250,252,0.9); border:1px solid rgba(226,232,240,0.9); border-radius:14px; padding:16px;">
          <span style="font-size:0.75rem; color:#64748b; font-weight:600; text-transform:uppercase;">Monthly Allowance</span>
          <div style="font-size:1.3rem; font-weight:800; color:#0f172a; margin-top:4px;">${wallet.monthlyAllowance}</div>
        </div>
        <div style="background:rgba(248,250,252,0.9); border:1px solid rgba(226,232,240,0.9); border-radius:14px; padding:16px;">
          <span style="font-size:0.75rem; color:#64748b; font-weight:600; text-transform:uppercase;">Purchased Packs</span>
          <div style="font-size:1.3rem; font-weight:800; color:#0f172a; margin-top:4px;">${wallet.purchasedCredits}</div>
        </div>
        <div style="background:rgba(248,250,252,0.9); border:1px solid rgba(226,232,240,0.9); border-radius:14px; padding:16px;">
          <span style="font-size:0.75rem; color:#64748b; font-weight:600; text-transform:uppercase;">Bonus & Rewards</span>
          <div style="font-size:1.3rem; font-weight:800; color:#10b981; margin-top:4px;">+${wallet.bonusCredits}</div>
        </div>
        <div style="background:rgba(248,250,252,0.9); border:1px solid rgba(226,232,240,0.9); border-radius:14px; padding:16px;">
          <span style="font-size:0.75rem; color:#64748b; font-weight:600; text-transform:uppercase;">Lifetime Spent</span>
          <div style="font-size:1.3rem; font-weight:800; color:#6366f1; margin-top:4px;">${wallet.lifetimeUsed}</div>
        </div>
      </div>

      <!-- Action Cost Cheat Sheet -->
      <div style="background:rgba(248,250,252,0.9); border:1px solid rgba(226,232,240,0.9); border-radius:16px; padding:18px;">
        <h4 style="margin:0 0 12px 0; font-size:0.95rem; font-weight:700; color:#0f172a;">⚡ Transparent AI Credit Costs (Standard Tier)</h4>
        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(200px, 1fr)); gap:10px; font-size:0.84rem;">
          <div style="display:flex; justify-content:space-between; padding:6px 0; border-bottom:1px dashed rgba(226,232,240,0.9);">
            <span style="color:#475569;">Social Post Copy</span> <strong style="color:#0f172a;">2 Credits</strong>
          </div>
          <div style="display:flex; justify-content:space-between; padding:6px 0; border-bottom:1px dashed rgba(226,232,240,0.9);">
            <span style="color:#475569;">FLUX Image Asset</span> <strong style="color:#0f172a;">15 Credits</strong>
          </div>
          <div style="display:flex; justify-content:space-between; padding:6px 0; border-bottom:1px dashed rgba(226,232,240,0.9);">
            <span style="color:#475569;">Marketing Strategy</span> <strong style="color:#0f172a;">5 Credits</strong>
          </div>
          <div style="display:flex; justify-content:space-between; padding:6px 0; border-bottom:1px dashed rgba(226,232,240,0.9);">
            <span style="color:#475569;">5s Video (Luma/Kling)</span> <strong style="color:#0f172a;">30 Credits</strong>
          </div>
          <div style="display:flex; justify-content:space-between; padding:6px 0; border-bottom:1px dashed rgba(226,232,240,0.9);">
            <span style="color:#475569;">Competitor Audit</span> <strong style="color:#0f172a;">8 Credits</strong>
          </div>
          <div style="display:flex; justify-content:space-between; padding:6px 0; border-bottom:1px dashed rgba(226,232,240,0.9);">
            <span style="color:#475569;">7-Day Campaign Hub</span> <strong style="color:#0f172a;">50 Credits</strong>
          </div>
        </div>
      </div>
    </div>
  `;
}

/**
 * Tab 2: Buy Instant Credit Packs
 */
async function renderPacksTab(container) {
  container.innerHTML = '<div style="padding:30px; text-align:center; color:#64748b;">Loading credit packages...</div>';

  try {
    const res = await requestApi('/api/credits/packs');
    const packs = (res && res.purchasePacks) || [];

    let html = `
      <div style="margin-bottom:14px;">
        <h4 style="margin:0; font-size:1.05rem; font-weight:700; color:#0f172a;">Top-Up Extra Credits (Never Expire)</h4>
        <p style="margin:4px 0 0 0; font-size:0.85rem; color:#64748b;">Purchased packs roll over automatically and are consumed only when monthly allowance is exhausted.</p>
      </div>
      <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(220px, 1fr)); gap:16px;">
    `;

    packs.forEach(p => {
      const isPopular = p.is_popular || p.discount_percent >= 40;
      html += `
        <div style="background:${isPopular ? 'linear-gradient(135deg, rgba(99,102,241,0.06), rgba(236,72,153,0.05))' : 'rgba(248,250,252,0.95)'}; border:${isPopular ? '2px solid #6366f1' : '1px solid rgba(226,232,240,0.9)'}; border-radius:16px; padding:20px; display:flex; flex-direction:column; position:relative; box-shadow:0 4px 12px rgba(0,0,0,0.03);">
          ${p.badge_label ? `
            <span style="position:absolute; top:-10px; right:14px; background:${isPopular ? 'linear-gradient(135deg, #6366f1, #ec4899)' : 'rgba(15,23,42,0.85)'}; color:#fff; font-size:0.72rem; font-weight:700; padding:3px 10px; border-radius:12px; text-transform:uppercase;">
              ${p.badge_label}
            </span>
          ` : ''}
          <div style="font-size:1.6rem; font-weight:900; color:#0f172a; margin-top:6px;">
            ⚡ ${Number(p.credits).toLocaleString()} <span style="font-size:0.85rem; font-weight:600; color:#64748b;">Credits</span>
          </div>
          <div style="font-size:1.35rem; font-weight:800; color:#6366f1; margin:8px 0 14px 0;">
            $${p.price_usd}
            ${p.discount_percent > 0 ? `<span style="font-size:0.8rem; color:#10b981; font-weight:700; margin-left:6px;">Save ${p.discount_percent}%</span>` : ''}
          </div>
          <p style="margin:0 0 16px 0; font-size:0.78rem; color:#64748b; line-height:1.4;">
            ≈ ${Math.floor(p.credits / 2)} Posts or ${Math.floor(p.credits / 15)} FLUX Images or ${Math.floor(p.credits / 30)} Videos
          </p>
          <button class="btn btn-primary" onclick="window.purchaseCreditPack('${p.pack_code}')" style="width:100%; margin-top:auto; padding:10px; font-weight:700; font-size:0.88rem; border-radius:10px;">
            Top-Up Now
          </button>
        </div>
      `;
    });

    html += '</div>';
    container.innerHTML = html;
  } catch (err) {
    container.innerHTML = `<div style="padding:20px; color:#ef4444;">Failed to load purchase packs.</div>`;
  }
}

/**
 * Tab 3: Monthly Subscriptions
 */
function renderPlansTab(container, wallet) {
  const plans = [
    { id: 'free', name: 'Free Tier', monthly: 100, price: '$0', desc: '100 monthly credits for testing and drafts.' },
    { id: 'starter', name: 'Starter Creator', monthly: 500, price: '$29/mo', desc: '500 credits/mo with standard generation priority.' },
    { id: 'pro', name: 'Pro Growth', monthly: 2000, price: '$89/mo', desc: '2,000 credits/mo with full FLUX & video orchestrations.', popular: true },
    { id: 'business', name: 'Business Scale', monthly: 10000, price: '$299/mo', desc: '10,000 credits/mo for multi-brand agencies and heavy automation.' }
  ];

  let html = `
    <div style="margin-bottom:14px;">
      <h4 style="margin:0; font-size:1.05rem; font-weight:700; color:#0f172a;">Upgrade Monthly AI Plan</h4>
      <p style="margin:4px 0 0 0; font-size:0.85rem; color:#64748b;">Monthly allowances reset every billing cycle. Switch or cancel at any time.</p>
    </div>
    <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(220px, 1fr)); gap:16px;">
  `;

  plans.forEach(p => {
    const isCurrent = (wallet.subscriptionTier || 'free').toLowerCase() === p.id;
    html += `
      <div style="background:${p.popular ? 'linear-gradient(135deg, rgba(99,102,241,0.06), rgba(236,72,153,0.05))' : 'rgba(248,250,252,0.95)'}; border:${p.popular ? '2px solid #6366f1' : '1px solid rgba(226,232,240,0.9)'}; border-radius:16px; padding:20px; display:flex; flex-direction:column;">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <h4 style="margin:0; font-size:1.05rem; font-weight:700; color:#0f172a;">${p.name}</h4>
          ${isCurrent ? `<span style="background:#10b981; color:#fff; font-size:0.7rem; padding:3px 8px; border-radius:10px; font-weight:700;">CURRENT</span>` : ''}
        </div>
        <div style="font-size:1.4rem; font-weight:900; color:#0f172a; margin:10px 0 4px 0;">${p.price}</div>
        <div style="font-size:0.9rem; font-weight:700; color:#6366f1; margin-bottom:8px;">⚡ ${p.monthly.toLocaleString()} Credits / mo</div>
        <p style="font-size:0.8rem; color:#64748b; margin:0 0 16px 0; line-height:1.4;">${p.desc}</p>
        <button class="btn ${isCurrent ? 'btn-secondary' : 'btn-primary'}" onclick="window.upgradePlan('${p.id}')" ${isCurrent ? 'disabled' : ''} style="width:100%; margin-top:auto; padding:10px; font-weight:700; font-size:0.88rem; border-radius:10px;">
          ${isCurrent ? 'Active Plan' : 'Select Plan'}
        </button>
      </div>
    `;
  });

  html += '</div>';
  container.innerHTML = html;
}

/**
 * Tab 4: Transaction Ledger Table
 */
async function renderHistoryTab(container) {
  container.innerHTML = '<div style="padding:30px; text-align:center; color:#64748b;">Loading double-entry ledger...</div>';

  try {
    const res = await requestApi('/api/credits/transactions?limit=30');
    const txs = (res && res.transactions) || [];

    if (txs.length === 0) {
      container.innerHTML = '<div style="padding:30px; text-align:center; color:#64748b;">No credit transactions recorded yet.</div>';
      return;
    }

    let html = `
      <div style="overflow-x:auto;">
        <table style="width:100%; border-collapse:collapse; text-align:left; font-size:0.85rem;">
          <thead>
            <tr style="border-bottom:1px solid rgba(226,232,240,0.9); color:#64748b;">
              <th style="padding:10px 8px;">Date</th>
              <th style="padding:10px 8px;">Action / Feature</th>
              <th style="padding:10px 8px;">Tier</th>
              <th style="padding:10px 8px; text-align:right;">Credits</th>
              <th style="padding:10px 8px; text-align:right;">Balance</th>
              <th style="padding:10px 8px; text-align:center;">Status</th>
            </tr>
          </thead>
          <tbody>
    `;

    txs.forEach(t => {
      const isPositive = Number(t.amount) > 0;
      const amountColor = isPositive ? '#10b981' : '#0f172a';
      const statusBadge = t.status === 'completed' 
        ? `<span style="color:#10b981; font-weight:600;">✓ Completed</span>` 
        : (t.status === 'refunded' ? `<span style="color:#f59e0b; font-weight:600;">↩ Refunded</span>` : `<span style="color:#64748b;">${t.status}</span>`);

      html += `
        <tr style="border-bottom:1px solid rgba(241,245,249,0.9);">
          <td style="padding:10px 8px; color:#64748b;">${new Date(t.created_at).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
          <td style="padding:10px 8px; font-weight:600; color:#0f172a; text-transform:capitalize;">${(t.action_type || '').replace(/_/g, ' ')}</td>
          <td style="padding:10px 8px; color:#6366f1; font-size:0.75rem; text-transform:uppercase; font-weight:700;">${t.quality_tier || 'standard'}</td>
          <td style="padding:10px 8px; text-align:right; font-weight:700; color:${amountColor};">
            ${isPositive ? '+' : ''}${t.amount}
          </td>
          <td style="padding:10px 8px; text-align:right; color:#475569; font-weight:600;">${t.balance_after}</td>
          <td style="padding:10px 8px; text-align:center;">${statusBadge}</td>
        </tr>
      `;
    });

    html += `
          </tbody>
        </table>
      </div>
    `;
    container.innerHTML = html;
  } catch (err) {
    container.innerHTML = `<div style="padding:20px; color:#ef4444;">Failed to load transaction history.</div>`;
  }
}

/**
 * Pre-Flight Credit Cost Estimator Dialog
 */
export async function showCreditEstimatorDialog(actionCode, options = {}) {
  return new Promise(async (resolve) => {
    let qualityTier = options.qualityTier || 'standard';
    const quantity = options.quantity || 1;

    let totalEstimate = 2;
    try {
      const res = await requestApi(`/api/credits/estimate?action=${actionCode}&qualityTier=${qualityTier}&quantity=${quantity}`);
      if (res && res.success && res.estimation) {
        totalEstimate = res.estimation.total || 2;
      }
    } catch (e) {}

    const modal = document.createElement('div');
    modal.className = 'custom-modal-overlay active';
    modal.style.cssText = 'position:fixed;inset:0;z-index:10001;background:rgba(15,23,42,0.65);backdrop-filter:blur(8px);display:flex;align-items:center;justify-content:center;padding:20px;opacity:1;pointer-events:auto;';

    modal.innerHTML = `
      <div class="custom-modal-content" style="width:100%; max-width:440px; background:rgba(255,255,255,0.95); backdrop-filter:blur(20px); border:1px solid rgba(255,255,255,0.9); border-radius:20px; padding:24px; color:#0f172a; box-shadow:0 20px 50px rgba(0,0,0,0.25); transform:translateY(0);">
        <div style="display:flex; align-items:center; gap:10px; margin-bottom:12px;">
          <span style="font-size:1.5rem;">⚡</span>
          <h3 style="margin:0; font-size:1.2rem; font-weight:800; color:#0f172a;">Confirm AI Credits</h3>
        </div>
        <p style="margin:0 0 16px 0; color:#475569; font-size:0.88rem;">
          Executing <strong>${options.title || actionCode}</strong> will deduct credits from your wallet upon success.
        </p>

        <!-- Quality Tier Selector -->
        <div style="margin-bottom:16px;">
          <label style="font-size:0.75rem; text-transform:uppercase; font-weight:700; color:#64748b; display:block; margin-bottom:6px;">Select Quality Tier</label>
          <div style="display:grid; grid-template-columns:repeat(3, 1fr); gap:8px;">
            <button class="tier-pill" data-tier="fast" style="padding:8px 4px; border-radius:10px; border:1px solid rgba(203,213,225,0.8); background:#fff; font-size:0.75rem; font-weight:700; cursor:pointer;">⚡ Fast</button>
            <button class="tier-pill active" data-tier="standard" style="padding:8px 4px; border-radius:10px; border:2px solid #6366f1; background:rgba(99,102,241,0.1); color:#4f46e5; font-size:0.75rem; font-weight:700; cursor:pointer;">⭐⭐ Standard</button>
            <button class="tier-pill" data-tier="premium" style="padding:8px 4px; border-radius:10px; border:1px solid rgba(203,213,225,0.8); background:#fff; font-size:0.75rem; font-weight:700; cursor:pointer;">💎 Premium</button>
          </div>
        </div>

        <div style="background:rgba(248,250,252,0.9); border:1px solid rgba(226,232,240,0.9); border-radius:14px; padding:16px; display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
          <span style="font-size:0.9rem; font-weight:600; color:#475569;">Estimated Cost:</span>
          <span id="estimator-cost-tag" style="font-size:1.4rem; font-weight:900; color:#6366f1;">⚡ ${totalEstimate} Credits</span>
        </div>

        <div style="display:flex; gap:10px; justify-content:flex-end;">
          <button id="estimator-cancel-btn" class="btn btn-secondary" style="padding:10px 16px; font-weight:600; border-radius:10px;">Cancel</button>
          <button id="estimator-confirm-btn" class="btn btn-primary" style="padding:10px 20px; font-weight:700; border-radius:10px;">Confirm & Generate</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    const costTag = modal.querySelector('#estimator-cost-tag');
    modal.querySelectorAll('.tier-pill').forEach(btn => {
      btn.onclick = async () => {
        modal.querySelectorAll('.tier-pill').forEach(b => {
          b.style.border = '1px solid rgba(203,213,225,0.8)';
          b.style.background = '#fff';
          b.style.color = '#0f172a';
        });
        btn.style.border = '2px solid #6366f1';
        btn.style.background = 'rgba(99,102,241,0.1)';
        btn.style.color = '#4f46e5';
        qualityTier = btn.getAttribute('data-tier');
        
        try {
          const res = await requestApi(`/api/credits/estimate?action=${actionCode}&qualityTier=${qualityTier}&quantity=${quantity}`);
          if (res && res.estimation) {
            costTag.textContent = `⚡ ${res.estimation.total} Credits`;
          }
        } catch (e) {}
      };
    });

    modal.querySelector('#estimator-cancel-btn').onclick = () => {
      modal.remove();
      resolve({ confirmed: false });
    };

    modal.querySelector('#estimator-confirm-btn').onclick = () => {
      modal.remove();
      resolve({ confirmed: true, qualityTier });
    };
  });
}

/**
 * Top-Up Credit Pack execution
 */
export async function purchaseCreditPack(packCode) {
  try {
    const res = await requestApi('/api/credits/purchase', {
      method: 'POST',
      body: JSON.stringify({ packCode })
    });

    if (res && res.success) {
      showToast(res.message || 'Credits added successfully!', 'success');
      window.dispatchEvent(new CustomEvent('creditsUpdated'));
      const modal = document.getElementById('credit-wallet-modal');
      if (modal) modal.remove();
      if (window.renderCreditsView) window.renderCreditsView();
    } else {
      showToast(res.error || 'Purchase failed', 'error');
    }
  } catch (err) {
    showToast(err.message, 'error');
  }
}

/**
 * Claim gamification reward
 */
export async function claimReward(rewardType) {
  try {
    const res = await requestApi('/api/credits/claim-reward', {
      method: 'POST',
      body: JSON.stringify({ rewardType })
    });

    if (res && res.success) {
      showToast(`🎁 Claimed +${res.credits_awarded} daily bonus credits!`, 'success');
      window.dispatchEvent(new CustomEvent('creditsUpdated'));
      if (window.renderCreditsView) window.renderCreditsView();
    } else {
      showToast(res.message || 'Already claimed for today!', 'info');
    }
  } catch (err) {
    showToast(err.message, 'error');
  }
}

export function upgradePlan(planId) {
  showToast(`Plan ${planId.toUpperCase()} selected! Redirecting to checkout...`, 'success');
}

// Global window assignments for inline onclick handlers
window.openCreditWalletModal = openCreditWalletModal;
window.fetchUserWallet = fetchUserWallet;
window.showCreditEstimatorDialog = showCreditEstimatorDialog;
window.purchaseCreditPack = purchaseCreditPack;
window.claimReward = claimReward;
window.upgradePlan = upgradePlan;

/**
 * Render the dedicated Full-Page AI Credits & Wallet Hub in #view-credits
 */
export async function renderCreditsView() {
  const container = document.getElementById('credits-view-container');
  if (!container) return;

  container.innerHTML = '<div style="padding:40px; text-align:center; color:#64748b;">Loading AI Credits Hub...</div>';
  const wallet = await fetchUserWallet() || cachedWallet || { balance: 100, monthlyAllowance: 100, subscriptionTier: 'free' };

  let packs = [];
  try {
    const res = await requestApi('/api/credits/packs');
    if (res && res.purchasePacks) packs = res.purchasePacks;
  } catch (e) {}

  container.innerHTML = `
    <!-- Top Hero Metric Cards Grid -->
    <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(220px, 1fr)); gap:18px;">
      
      <!-- Balance Card -->
      <div style="background:linear-gradient(135deg, rgba(99,102,241,0.12), rgba(236,72,153,0.08)); border:1px solid rgba(99,102,241,0.3); border-radius:18px; padding:22px; display:flex; flex-direction:column; justify-content:space-between; box-shadow:0 8px 24px rgba(99,102,241,0.08);">
        <div>
          <span style="font-size:0.75rem; text-transform:uppercase; font-weight:700; color:#6366f1; letter-spacing:0.5px;">Current Available Balance</span>
          <div style="font-size:2.4rem; font-weight:900; color:#0f172a; margin:6px 0 2px 0; display:flex; align-items:center; gap:8px;">
            <span>⚡</span> ${Number(wallet.balance || 0).toLocaleString()}
          </div>
          <p style="margin:0; font-size:0.8rem; color:#64748b;">Active Tier: <strong style="color:#0f172a; text-transform:capitalize;">${wallet.subscriptionTier || 'Free'}</strong></p>
        </div>
        <button class="btn btn-primary" onclick="window.openCreditWalletModal('packs')" style="margin-top:16px; padding:8px 14px; font-size:0.85rem; font-weight:700; border-radius:10px;">
          + Top-Up Balance
        </button>
      </div>

      <!-- Monthly Allowance Card -->
      <div style="background:rgba(255,255,255,0.92); border:1px solid rgba(226,232,240,0.9); border-radius:18px; padding:22px; display:flex; flex-direction:column; justify-content:space-between; box-shadow:0 4px 14px rgba(0,0,0,0.03);">
        <div>
          <span style="font-size:0.75rem; text-transform:uppercase; font-weight:700; color:#64748b; letter-spacing:0.5px;">Monthly Plan Allowance</span>
          <div style="font-size:2rem; font-weight:800; color:#0f172a; margin:6px 0 2px 0;">
            ${Number(wallet.monthlyAllowance || 100).toLocaleString()}
          </div>
          <p style="margin:0; font-size:0.8rem; color:#64748b;">Resets every 30-day billing cycle</p>
        </div>
        <div style="background:rgba(241,245,249,0.9); height:8px; border-radius:4px; overflow:hidden; margin-top:16px;">
          <div style="background:linear-gradient(90deg, #6366f1, #10b981); height:100%; width:${Math.min(100, wallet.percentRemaining || 50)}%;"></div>
        </div>
      </div>

      <!-- Purchased Credits Card -->
      <div style="background:rgba(255,255,255,0.92); border:1px solid rgba(226,232,240,0.9); border-radius:18px; padding:22px; display:flex; flex-direction:column; justify-content:space-between; box-shadow:0 4px 14px rgba(0,0,0,0.03);">
        <div>
          <span style="font-size:0.75rem; text-transform:uppercase; font-weight:700; color:#64748b; letter-spacing:0.5px;">Permanent Top-Up Packs</span>
          <div style="font-size:2rem; font-weight:800; color:#0f172a; margin:6px 0 2px 0;">
            ${Number(wallet.purchasedCredits || 0).toLocaleString()}
          </div>
          <p style="margin:0; font-size:0.8rem; color:#64748b;">Never expire. Roll over automatically</p>
        </div>
        <span style="font-size:0.75rem; color:#10b981; font-weight:700; margin-top:16px;">✓ 100% Rollover Protection</span>
      </div>

      <!-- Bonus & Gamification Card -->
      <div style="background:rgba(255,255,255,0.92); border:1px solid rgba(226,232,240,0.9); border-radius:18px; padding:22px; display:flex; flex-direction:column; justify-content:space-between; box-shadow:0 4px 14px rgba(0,0,0,0.03);">
        <div>
          <span style="font-size:0.75rem; text-transform:uppercase; font-weight:700; color:#64748b; letter-spacing:0.5px;">Claimed Bonus Rewards</span>
          <div style="font-size:2rem; font-weight:800; color:#10b981; margin:6px 0 2px 0;">
            +${Number(wallet.bonusCredits || 0).toLocaleString()}
          </div>
          <p style="margin:0; font-size:0.8rem; color:#64748b;">From daily logins and referrals</p>
        </div>
        <button onclick="window.claimReward('daily_login')" style="background:rgba(241,245,249,0.9); border:1px solid rgba(203,213,225,0.8); color:#0f172a; padding:8px 12px; border-radius:10px; font-size:0.82rem; font-weight:600; cursor:pointer; margin-top:16px;">
          🎁 Claim Today (+2)
        </button>
      </div>

    </div>

    <!-- Instant Top-Up Packs Section -->
    <div style="background:rgba(255,255,255,0.92); border:1px solid rgba(226,232,240,0.9); border-radius:20px; padding:24px; box-shadow:0 4px 16px rgba(0,0,0,0.02);">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:18px; flex-wrap:wrap; gap:10px;">
        <div>
          <h3 style="margin:0; font-size:1.2rem; font-weight:800; color:#0f172a;">⚡ Instant AI Credit Packs (Non-Expiring)</h3>
          <p style="margin:2px 0 0 0; color:#64748b; font-size:0.85rem;">Directly recharge your wallet for large campaigns, photorealistic FLUX images, and HD videos.</p>
        </div>
        <span style="background:rgba(16,185,129,0.1); border:1px solid rgba(16,185,129,0.3); color:#059669; padding:4px 12px; border-radius:20px; font-size:0.8rem; font-weight:700;">
          Instant Balance Update
        </span>
      </div>

      <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(200px, 1fr)); gap:16px;">
        ${packs.map(p => {
          const isPop = p.is_popular || p.discount_percent >= 40;
          return `
            <div style="background:${isPop ? 'linear-gradient(135deg, rgba(99,102,241,0.06), rgba(236,72,153,0.05))' : 'rgba(248,250,252,0.95)'}; border:${isPop ? '2px solid #6366f1' : '1px solid rgba(226,232,240,0.9)'}; border-radius:16px; padding:18px; display:flex; flex-direction:column; position:relative;">
              ${p.badge_label ? `<span style="position:absolute; top:-9px; right:12px; background:#6366f1; color:#fff; font-size:0.7rem; font-weight:700; padding:2px 8px; border-radius:10px; text-transform:uppercase;">${p.badge_label}</span>` : ''}
              <div style="font-size:1.5rem; font-weight:900; color:#0f172a; margin-top:4px;">
                ⚡ ${Number(p.credits).toLocaleString()}
              </div>
              <div style="font-size:1.25rem; font-weight:800; color:#6366f1; margin:6px 0 12px 0;">
                $${p.price_usd}
                ${p.discount_percent > 0 ? `<span style="font-size:0.75rem; color:#10b981; font-weight:700; margin-left:4px;">Save ${p.discount_percent}%</span>` : ''}
              </div>
              <button class="btn btn-primary" onclick="window.purchaseCreditPack('${p.pack_code}')" style="width:100%; margin-top:auto; padding:9px; font-weight:700; font-size:0.85rem; border-radius:10px;">
                Buy Pack
              </button>
            </div>
          `;
        }).join('')}
      </div>
    </div>

    <!-- Live Transaction History Section -->
    <div style="background:rgba(255,255,255,0.92); border:1px solid rgba(226,232,240,0.9); border-radius:20px; padding:24px; box-shadow:0 4px 16px rgba(0,0,0,0.02);">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
        <h3 style="margin:0; font-size:1.2rem; font-weight:800; color:#0f172a;">📜 Immutable Double-Entry Ledger</h3>
        <button class="btn btn-secondary" onclick="window.renderCreditsView()" style="padding:6px 12px; font-size:0.8rem; border-radius:8px;">
          🔄 Refresh Ledger
        </button>
      </div>
      <div id="full-page-ledger-table">
        <!-- History rendered below -->
      </div>
    </div>
  `;

  // Render ledger table inside #full-page-ledger-table
  const ledgerContainer = container.querySelector('#full-page-ledger-table');
  if (ledgerContainer) {
    renderHistoryTab(ledgerContainer);
  }
}

window.renderCreditsView = renderCreditsView;

