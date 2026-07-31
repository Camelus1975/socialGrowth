// Social Growth AI — Rebuilt V2 Application Core Router (ES6 Module)
import { state } from './state.js';
import { 
  showToast, 
  openModal, 
  closeModal, 
  toggleThemeMode,
  requestApi 
} from './common.js';

// ── Auth ──────────────────────────────────────────────────────────────────────
import {
  initAuth,
  loginWithEmail,
  signupWithEmail,
  loginWithOAuth,
  logout,
  toggleAuthMode,
  onAuthStateChange
} from './auth.js';

// ── Modules ───────────────────────────────────────────────────────────────────
import { initDashboard, renderDashboard } from './dashboardModule.js';
import { initIntelligenceDashboard } from './intelligenceDashboardModule.js';
import { initCommandCenter } from './commandCenterModule.js';
import { initCalendar, renderCalendarView } from './calendarModule.js';
import { initUniversalCRM } from './crmModule.js';
import { initRevenueIntelligence } from './revenueIntelligenceModule.js';
import { initSalesIntelligence } from './salesIntelligenceModule.js';
import { initCustomerIntelligence } from './customerIntelligenceModule.js';
import { initReputationCenter } from './reputationModule.js';
import { initAttributionEngine } from './attributionModule.js';
import { initInbox } from './inboxModule.js';
import { initMedia } from './mediaModule.js';
import { initDatabaseConsole } from './dbModule.js';
import { initMemoryEngine } from './memoryModule.js';
import { initCompetitorIntelligence } from './competitorIntelligenceModule.js';
import { initStudio, generateStudioContent } from './studioModule.js';
import { initCopilot } from './copilotModule.js';
import { initBrandKit } from './brandKitModule.js';
import { initOnboarding } from './onboardingModule.js';
import { initWeeklyReport } from './weeklyReportModule.js';
import { 
  initAppManager, 
  fetchUserApps, 
  renderAppSelectorDropdown, 
  setSelectActiveAppCallback 
} from './appManager.js';
import { initHealthScore } from './healthScoreModule.js';
import { initIndustryBenchmarks } from './industryBenchmarkModule.js';

import { initCommandPaletteV2 } from './commandPalette_v2.js';

// ── Entry Point ───────────────────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', async () => {
  console.log("OS V2 Booting...");

  // Restore theme preference
  const savedTheme = localStorage.getItem('theme_mode');
  if (savedTheme === 'light') {
    document.body.classList.add('light-mode');
  }

  // Wire auth button listeners BEFORE initAuth so they're ready
  setupAuthListeners();

  // Bind workspace / UI interactive events
  setupUIEventListeners();

  // Initialize auth — checks for existing Supabase session
  const session = await initAuth();

  // Listen for OAuth redirect callbacks
  onAuthStateChange((session) => {
    bootApp();
  });

  // If already logged in, boot immediately
  if (session) {
    bootApp();
  }
});

// ── Boot App (only after successful auth) ─────────────────────────────────────
async function bootApp() {
  console.log("OS V2 — bootApp()");

  // Set the application selection callback
  setSelectActiveAppCallback(selectActiveApp);

  // Fetch user businesses from Supabase
  await fetchUserApps();

  // Initialize all modular dashboard sub-engines
  initAppManager();
  initDashboard();
  initIntelligenceDashboard();
  initCommandCenter();
  initCalendar();
  initUniversalCRM();
  initRevenueIntelligence();
  initSalesIntelligence();
  initCustomerIntelligence();
  initReputationCenter();
  initAttributionEngine();
  initInbox();
  initMedia();
  initDatabaseConsole();
  initMemoryEngine();
  initCompetitorIntelligence();
  initStudio();
  initCopilot();
  initBrandKit();
  initOnboarding();
  initWeeklyReport();
  initHealthScore();
  initIndustryBenchmarks();

  // Initialize V2 fuzzy command search palette
  initCommandPaletteV2();

  // Render business selector dropdown
  renderAppSelectorDropdown();

  // Auto-select first app or prompt creation
  const keys = Object.keys(state.appsData);
  if (!state.appsData[state.currentActiveApp] && keys.length > 0) {
    state.currentActiveApp = keys[0];
  } else if (keys.length === 0) {
    state.currentActiveApp = null;
  }

  selectActiveApp(state.currentActiveApp);
  renderDashboard();
}

// ── Auth Button Listeners ─────────────────────────────────────────────────────
function setupAuthListeners() {
  // Login button
  const loginBtn = document.getElementById('auth-login-btn');
  if (loginBtn) {
    loginBtn.addEventListener('click', () => {
      const email = document.getElementById('auth-email')?.value;
      const password = document.getElementById('auth-password')?.value;
      if (email && password) {
        loginWithEmail(email, password).then(success => {
          if (success) bootApp();
        });
      }
    });
  }

  // Signup button
  const signupBtn = document.getElementById('auth-signup-btn');
  if (signupBtn) {
    signupBtn.addEventListener('click', () => {
      const email = document.getElementById('auth-signup-email')?.value;
      const password = document.getElementById('auth-signup-password')?.value;
      if (email && password) {
        signupWithEmail(email, password).then(success => {
          if (success) bootApp();
        });
      }
    });
  }

  // Toggle login/signup forms
  const showSignup = document.getElementById('auth-show-signup');
  if (showSignup) showSignup.addEventListener('click', (e) => { e.preventDefault(); toggleAuthMode(); });
  
  const showLogin = document.getElementById('auth-show-login');
  if (showLogin) showLogin.addEventListener('click', (e) => { e.preventDefault(); toggleAuthMode(); });

  // OAuth buttons
  const googleBtn = document.getElementById('auth-google-btn');
  if (googleBtn) googleBtn.addEventListener('click', () => loginWithOAuth('google'));

  const githubBtn = document.getElementById('auth-github-btn');
  if (githubBtn) githubBtn.addEventListener('click', () => loginWithOAuth('github'));

  // Enter key support for login
  const passwordInput = document.getElementById('auth-password');
  if (passwordInput) {
    passwordInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') document.getElementById('auth-login-btn')?.click();
    });
  }
}

// ── Workspace UI Event Routing ────────────────────────────────────────────────
function setupUIEventListeners() {
  // Global Event Delegation for data-action bindings
  document.addEventListener('click', (e) => {
    const target = e.target.closest('[data-action]');
    if (!target) return;

    const action = target.getAttribute('data-action');
    const argsStr = target.getAttribute('data-args');
    const args = argsStr ? argsStr.split('|') : [];

    switch (action) {
      case 'switchView':
        switchWorkspace(args[0], target);
        break;
      case 'openModal':
        openModal(args[0]);
        break;
      case 'closeModal':
        closeModal(args[0]);
        break;
      case 'toggleAppSelectorDropdown':
        document.getElementById('app-selector-dropdown')?.classList.toggle('active');
        break;
      case 'toggleThemeMode':
        toggleThemeMode();
        break;
    }
  });

  // Close app selector dropdown if clicking outside
  window.addEventListener('click', (e) => {
    if (!e.target.closest('.app-selector-container')) {
      document.getElementById('app-selector-dropdown')?.classList.remove('active');
    }
  });
}

// ── Workspace Routing & Animations ────────────────────────────────────────────
export function switchWorkspace(viewId, element) {
  // Highlight active sidebar navigation links
  const navLinks = document.querySelectorAll('.nav-link');
  navLinks.forEach(link => link.classList.remove('active'));
  
  if (element) {
    element.classList.add('active');
  } else {
    // Fallback programmatic navigation styling
    navLinks.forEach(link => {
      const argsAttr = link.getAttribute('data-args');
      if (argsAttr && argsAttr.includes(viewId)) {
        link.classList.add('active');
      }
    });
  }

  // Swap active panel view with animations
  const viewPanels = document.querySelectorAll('.view-panel');
  viewPanels.forEach(panel => panel.classList.remove('active'));

  const activePanel = document.getElementById(`view-${viewId}`);
  if (activePanel) {
    activePanel.classList.add('active');
  }

  // Smooth scroll to top when changing workspaces
  window.scrollTo({ top: 0, behavior: 'smooth' });

  // Update Breadcrumb/Title header text
  const viewTitles = {
    'unified-intelligence-dash': 'Home Mission Control',
    'growth-command-center': 'Goal Center',
    'agent-orchestration': 'AI Agent Network',
    'launch-center': 'Campaign Hub',
    'content-studio': 'Creative Studio',
    'social-calendar': 'Publish Scheduler',
    'competitor-intelligence': 'Market Intelligence',
    'social-analytics': 'Business Intelligence',
    'revenue-intelligence': 'Revenue Intelligence',
    'brand-kit': 'Brand Kit & Memory',
    'db-console': 'Developer Console'
  };

  const titleHeader = document.getElementById('current-view-title');
  if (titleHeader && viewTitles[viewId]) {
    titleHeader.textContent = viewTitles[viewId];
  }

  state.setActiveView(viewId);
}

// ── Developer Mode Toggle ─────────────────────────────────────────────────────
window.toggleDevMode = function() {
  document.body.classList.toggle('dev-mode-active');
  const isActive = document.body.classList.contains('dev-mode-active');
  showToast(isActive ? "Developer Workspace Unlocked" : "Developer Mode Hidden", "success");
};

// ── Global Creative Studio Wrapper ────────────────────────────────────────────
window.generateStudioContent = function() {
  const promptInput = document.getElementById('studio-prompt-input')?.value;
  if (!promptInput) {
    showToast("Please enter a creative concept prompt.", "warning");
    return;
  }
  generateStudioContent(promptInput);
};

// ── Select Active Application & Refresh views ────────────────────────────────
export function selectActiveApp(appId) {
  if (!appId || !state.appsData[appId]) {
    state.setActiveApp(null);
    const activeName = document.getElementById('active-app-name');
    const activeDot = document.getElementById('active-app-dot');
    if (activeName) activeName.textContent = "No App Selected";
    if (activeDot) activeDot.style.background = "#666";
    
    const sidebarName = document.getElementById('sidebar-app-name');
    if (sidebarName) sidebarName.textContent = "No App Selected";
    return;
  }
  
  state.setActiveApp(appId);
  const app = state.appsData[appId];
  
  // Update Selector Button
  const activeName = document.getElementById('active-app-name');
  const activeDot = document.getElementById('active-app-dot');
  if (activeName) activeName.textContent = app.name;
  if (activeDot) activeDot.style.background = app.logoColor;
  
  // Update Sidebar Footer Active App Name
  const sidebarName = document.getElementById('sidebar-app-name');
  if (sidebarName) sidebarName.textContent = app.name;
  
  // Close Dropdown
  const dropdown = document.getElementById('app-selector-dropdown');
  if (dropdown) dropdown.classList.remove('active');
  
  // Refresh layout data
  refreshViewData();
}

export function refreshViewData() {
  renderDashboard();
  renderCalendarView();
}
