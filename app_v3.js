import { initAuth, onAuthStateChange } from './auth.js';
import { showToast } from './common.js';

// Social Growth AI - V3 Architecture Entry Point

window.__V3_OS__ = true; // Signal we are in V3

// Core state
const state = {
  activeWorkspace: 'home',
  user: null
};

// Initialize Application
document.addEventListener('DOMContentLoaded', async () => {
  setupUIEventListeners();
  
  const loginScreen = document.getElementById('auth-login-screen');
  const appLayout = document.getElementById('app-layout');
  
  // Initialize Supabase
  await initAuth();
  
  onAuthStateChange((user) => {
    if (user) {
      state.user = user;
      loginScreen.style.display = 'none';
      appLayout.style.display = 'flex';
      
      const userName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'Founder';
      const avatarUrl = user.user_metadata?.avatar_url || 'https://i.pravatar.cc/150?u=' + user.id;
      
      document.getElementById('user-header-name').textContent = userName;
      document.getElementById('user-header-avatar').src = avatarUrl;
      
      populateHomeFeed();
    } else {
      loginScreen.style.display = 'flex';
      appLayout.style.display = 'none';
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
          document.querySelector('.nav-item[data-args=\"copilot\"]').classList.add('active');
        }
        break;
      case 'openModal':
        // Legacy interop or custom modal logic
        console.log('Open modal:', args[0]);
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
    targetPanel.style.display = 'block';
    targetPanel.classList.add('active');
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
