import { initAuth, onAuthStateChange, logout, saveUserProfile, initAvatarPicker } from './auth.js';
import { showToast, openModal, closeModal, toggleThemeMode, initTheme } from './common.js';
import { initCopilotV3 } from './copilot_v3.js';
import { initGrowthV3 } from './growth_v3.js';
import { initInboxV3 } from './inbox_v3.js';
import { initCalendarV3 } from './calendar_v3.js';
import { initWorkspaceV3, initiateAddBusiness, deleteWorkspace, initBrandKitController, openBrandKitModal, saveBrandKit } from './workspace_v3.js';
import { initMediaV3 } from './media_v3.js';
import { initCreditsSystem, openCreditWalletModal } from './credits_v3.js';

// Social Growth AI - V3 Architecture Entry Point

window.__V3_OS__ = true; // Signal we are in V3
window.openCreditWalletModal = openCreditWalletModal;

import { state } from './state.js';

// Initialize Application
document.addEventListener('DOMContentLoaded', async () => {
  initTheme();
  setupUIEventListeners();
  initAvatarPicker();
  initBrandKitController();
  initCreditsSystem();
  
  // Initialize specific V3 modules
  initCopilotV3(state);
  initGrowthV3();
  initInboxV3();
  initCalendarV3();
  initMediaV3();
  initWorkspaceV3(state);
  
  const loginScreen = document.getElementById('auth-login-screen');
  const appContainer = document.getElementById('app-container');
  
  const handleUserLogin = (user) => {
    state.user = user;
    loginScreen.style.display = 'none';
    appContainer.style.display = 'flex';
    
    const savedLocalName = localStorage.getItem('user_full_name');
    const savedLocalAvatar = localStorage.getItem('user_avatar_url');
    const userName = user.user_metadata?.full_name || savedLocalName || user.email?.split('@')[0] || 'Founder';
    const avatarUrl = user.user_metadata?.avatar_url || savedLocalAvatar || 'https://i.pravatar.cc/150?u=' + user.id;
    
    document.getElementById('user-header-name').textContent = userName;
    document.getElementById('user-header-avatar').src = avatarUrl;
    
    // Auto-fill profile modal if available
    const profileNameInput = document.getElementById('profile-modal-name');
    if (profileNameInput) profileNameInput.value = userName;
    
    // Tell workspace selector to fetch businesses now that we're logged in
    window.dispatchEvent(new CustomEvent('refreshWorkspaces'));
    
    populateHomeFeed();
  };

  const handleUserLogout = () => {
    loginScreen.style.display = 'flex';
    appContainer.style.display = 'none';
  };

  // Initialize Supabase
  const session = await initAuth();
  if (session && session.user) {
    handleUserLogin(session.user);
  } else {
    handleUserLogout();
  }
  
  onAuthStateChange((session) => {
    if (session && session.user) {
      handleUserLogin(session.user);
    } else {
      handleUserLogout();
    }
  });

  // Keep legacy simulate auth wrapper for backward compatibility with common.js logic
  window.simulateSbAuthVerify = async (provider) => {
    const supabase = window.supabaseClient;
    if (supabase) {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: provider,
        options: {
          redirectTo: window.location.origin
        }
      });
      if (error) {
        showToast("Auth failed: " + error.message, "error");
      }
    }
  };
});

// Setup global event delegation
function setupUIEventListeners() {
  document.addEventListener('click', (e) => {
    const target = e.target.closest('[data-action]');
    if (!target) return;

    const action = target.getAttribute('data-action');
    const argsStr = target.getAttribute('data-args');
    const args = argsStr ? argsStr.split('|') : [];

    switch (action) {
      case 'switchWorkspace':
        switchWorkspace(args[0]);
        // Update active class on nav
        document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
        if (target.classList.contains('nav-item')) {
          target.classList.add('active');
        } else {
          // If FAB triggered it, highlight copilot nav item
          document.querySelector('.nav-item[data-args="copilot"]').classList.add('active');
        }
        break;
      case 'openModal':
        openModal(args[0]);
        if (args[0] === 'user-profile-modal') {
          const headerAvatar = document.getElementById('user-header-avatar');
          const previewImg = document.getElementById('profile-modal-avatar-preview');
          const urlInput = document.getElementById('profile-modal-avatar-url');
          const nameInput = document.getElementById('profile-modal-name');
          const headerName = document.getElementById('user-header-name');
          
          if (headerAvatar && previewImg) previewImg.src = headerAvatar.src;
          if (headerAvatar && urlInput) urlInput.value = headerAvatar.src;
          if (headerName && nameInput) nameInput.value = headerName.textContent;
        }
        break;
      case 'closeModal':
        closeModal(args[0]);
        break;
      case 'toggleThemeMode':
        toggleThemeMode();
        break;
      case 'simulateSbAuthSignout':
        logout();
        break;
      case 'saveUserProfile':
        saveUserProfile();
        break;
      case 'initiateAddBusiness':
        initiateAddBusiness();
        break;
      case 'deleteCurrentWorkspace':
        deleteWorkspace();
        break;
      case 'openBrandKitModal':
        openBrandKitModal();
        break;
      case 'openCreditWallet':
        openCreditWalletModal(target.getAttribute('data-tab') || args[0] || 'overview');
        break;
      case 'claimDailyReward':
        if (window.claimReward) window.claimReward(args[0] || 'daily_login');
        break;
      case 'purchaseCreditPack':
        if (window.purchaseCreditPack) window.purchaseCreditPack(args[0]);
        break;
    }
  });
}

function switchWorkspace(workspaceId) {
  state.activeWorkspace = workspaceId;
  
  // Hide all panels
  document.querySelectorAll('.view-panel').forEach(panel => {
    panel.style.display = 'none';
    panel.classList.remove('active');
  });
  
  // Show target panel
  const targetPanel = document.getElementById('view-' + workspaceId);
  if (targetPanel) {
    if (workspaceId === 'copilot' || workspaceId === 'inbox') {
      targetPanel.style.display = 'flex';
    } else {
      targetPanel.style.display = 'block';
    }
    targetPanel.classList.add('active');

    if (workspaceId === 'credits' && window.renderCreditsView) {
      window.renderCreditsView();
    }
  }
}

// Data Population Helpers
function populateHomeFeed() {
  const feed = document.getElementById('action-feed-container');
  feed.innerHTML = `
    <div style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); padding: 20px; border-radius: 12px; margin-bottom: 16px;">
      <h3 style="margin-top:0; color: #f87171;">[Urgent] Approve your content for this week</h3>
      <p style="color: #9ca3af;">The AI has generated 5 posts based on your brand guidelines.</p>
      <button class="btn btn-primary">Review & Approve</button>
    </div>
    <div style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); padding: 20px; border-radius: 12px; margin-bottom: 16px;">
      <h3 style="margin-top:0; color: #60a5fa;">[Opportunity] High engagement on recent TikTok</h3>
      <p style="color: #9ca3af;">3 high-value leads asked for pricing.</p>
      <button class="btn btn-primary">Reply to Leads</button>
    </div>
  `;
}
