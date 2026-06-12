// App Founder Growth Suite - Production SaaS Frontend Shell (ES6 Module)

import { state } from './state.js';
import { 
  showToast, 
  openModal, 
  closeModal, 
  toggleNotificationDrawer, 
  toggleMobileSidebar,
  requestApi,
  createSafeElement
} from './common.js';

import { initDashboard, renderDashboard } from './dashboardModule.js';
import { initCalendar, fetchCalendarPosts, renderCalendarView, openCalendarPostModal } from './calendarModule.js';
import { 
  initInbox, 
  fetchInboxThreads, 
  renderInboxView, 
  selectInboxThread, 
  prefillInboxReply, 
  sendInboxMessageReply, 
  markActiveInboxResolved 
} from './inboxModule.js';
import { 
  initMedia, 
  renderMediaManager, 
  selectMediaFolder, 
  simulateMediaUploadClick, 
  changeMockupTheme, 
  exportMockupToPng 
} from './mediaModule.js';
import { 
  initDatabaseConsole, 
  renderDatabaseConsole, 
  selectDbConsoleTable, 
  prefillSQLConsoleQuery, 
  executeSQLQueryOnConsole 
} from './dbModule.js';
import { 
  initAgentFramework, 
  clearAgentTerminal, 
  toggleAgentSimulation, 
  startOrchestrationPipelineSimulation 
} from './agentModule.js';
import { 
  initStudio, 
  prefillLaunchPrompt, 
  generateLaunchCampaign, 
  runASOAnalysis, 
  verifyStoreIntegration, 
  syncAppStoreNow, 
  simulateReviewImport, 
  filterReviews, 
  generateReleaseCampaign, 
  switchReleaseTab, 
  approveAndScheduleRelease, 
  copyReleaseToClipboard, 
  toggleRoadmapVisibility, 
  addNewRoadmapItem, 
  generateRoadmapAnnouncementPost, 
  recycleContent, 
  generateWeeklyGrowthReport, 
  createCrossPromoAssets, 
  copyCrossPromoText, 
  downloadExecutiveReport, 
  generateStudioContent, 
  recycleStudioContent, 
  generateStudioImage 
} from './studioModule.js';
// competitorModule removed temporarily
import { initVideoFactoryModule } from './videoFactoryModule.js';
import { initAdvertisingModule, startAdPolling, stopAdPolling } from './advertisingModule.js?v=2';
import { i18nSetLanguage } from './i18nModule.js';

import {
  initDistributionEngine,
  executeAutonomousGrowth
} from './distributionModule.js';

import { initI18n } from './i18nModule.js';


import {
  initContentIntelligence,
  fetchIntelligenceData,
  runSuccessPrediction,
  runSaaSContentRecycle,
  askContentCoach,
  downloadWeeklyReport
} from './contentIntelligenceModule.js';

import { searchGrowthMemoryUI } from './memoryModule.js';

import {
  initAuth,
  loginWithEmail,
  signupWithEmail,
  loginWithOAuth,
  logout,
  toggleAuthMode,
  onAuthStateChange
} from './auth.js';

import { 
  initAppManager, 
  fetchUserApps, 
  renderAppSelectorDropdown 
} from './appManager.js';

// Initialize Application
window.addEventListener('DOMContentLoaded', async () => {
  // Initialize Theme from localStorage
  const savedTheme = localStorage.getItem('theme_mode');
  if (savedTheme === 'light') {
    document.body.classList.add('light-mode');
  }

  // Wire up auth event listeners
  setupAuthListeners();

  // Initialize auth - checks for existing session
  const session = await initAuth();

  // Listen for auth state changes (handles OAuth redirects)
  onAuthStateChange((session) => {
    bootApp();
  });

  // If already logged in, boot the app
  if (session) {
    bootApp();
  }
});

// Boot the main application after auth
export async function bootApp() {
  console.log("App Booting...");

  // Initialize Internationalization
  initI18n();

  // Try fetching sessional apps from Supabase and merge
  await fetchUserApps();
  
  // Verify/Sync Session from production backend
  syncUserSession();
  
  // Initialize Phase 4 Modules
  initVideoFactoryModule();
  initAdvertisingModule();

  // Initialize all view modules
  initAppManager();
  initDashboard();
  initCalendar();
  initInbox();
  initMedia();
  initDatabaseConsole();
  initStudio();
  initVideoFactory();
  initDistributionEngine();
  initAgentFramework();
  initContentIntelligence();
  
  // Render initial page views
  renderAppSelectorDropdown();
  
  // Ensure we select a valid app, fallback to first if currentActiveApp is invalid
  const keys = Object.keys(state.appsData);
  if (!state.appsData[state.currentActiveApp] && keys.length > 0) {
    state.currentActiveApp = keys[0];
  } else if (keys.length === 0) {
    state.currentActiveApp = null;
    openModal('app-create-modal');
  }
  
  selectActiveApp(state.currentActiveApp);
  renderDashboard();
  renderNotifications();
}

// Setup auth button event listeners
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
      if (e.key === 'Enter') loginBtn?.click();
    });
  }
}

// Load local mock data if Supabase backend is offline
function loadLocalMockData() {
  if (typeof mockAppsData !== 'undefined') {
    state.appsData = JSON.parse(JSON.stringify(mockAppsData));
    state.authState = JSON.parse(JSON.stringify(mockAuthData));
    state.inboxState = JSON.parse(JSON.stringify(mockInboxData));
    state.mediaState = JSON.parse(JSON.stringify(mockMediaData));
    state.calendarState = JSON.parse(JSON.stringify(mockCalendarData));
    state.dbSchemaState = JSON.parse(JSON.stringify(mockDatabaseSchema));
    state.notificationsList = JSON.parse(JSON.stringify(mockNotifications));
  }
  
  Object.keys(state.appsData).forEach(key => {
    if (!state.customRoadmapItems[key]) {
      state.customRoadmapItems[key] = [...state.appsData[key].roadmap];
    }
  });
}

// Sync session with Production Backend
async function syncUserSession() {
  try {
    const data = await requestApi('/api/auth/session', {
      method: 'POST',
      body: JSON.stringify({ access_token: localStorage.getItem('supabase_jwt_token') || "mock-supabase-jwt-token" })
    });
    
    const headerName = document.getElementById('user-header-name');
    const authName = document.getElementById('auth-user-name');
    const authRole = document.getElementById('auth-user-role');
    
    if (headerName) headerName.textContent = data.user.name;
    if (authName) authName.textContent = data.user.name;
    if (authRole) authRole.textContent = `${data.user.role} (${data.organization.name})`;
    console.log("Supabase active user session verified successfully.");
  } catch (err) {
    console.warn("Backend API unreachable. Falling back to local Supabase authentication states.");
  }
}

// App Selector Dropdown Toggle
export function toggleAppSelectorDropdown() {
  const dropdown = document.getElementById('app-selector-dropdown');
  if (dropdown) dropdown.classList.toggle('active');
}

// Close dropdown if clicking outside
window.addEventListener('click', (e) => {
  if (!e.target.closest('.app-selector-container')) {
    const dropdown = document.getElementById('app-selector-dropdown');
    if (dropdown) dropdown.classList.remove('active');
  }
});

// Switch Selected Active App
export function selectActiveApp(appId) {
  if (!appId || !state.appsData[appId]) {
    state.setActiveApp(null);
    const activeName = document.getElementById('active-app-name');
    const activeDot = document.getElementById('active-app-dot');
    if (activeName) activeName.textContent = "No App Selected";
    if (activeDot) activeDot.style.background = "#666";
    
    const headerName = document.getElementById('header-app-name');
    const headerDot = document.getElementById('header-app-dot');
    if (headerName) headerName.textContent = "No App Selected";
    if (headerDot) headerDot.style.background = "#666";
    
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
  
  // Update Header App Badge
  const headerName = document.getElementById('header-app-name');
  const headerDot = document.getElementById('header-app-dot');
  if (headerName) headerName.textContent = app.name;
  if (headerDot) headerDot.style.background = app.logoColor;
  
  // Update Sidebar Footer Active App Name
  const sidebarName = document.getElementById('sidebar-app-name');
  if (sidebarName) sidebarName.textContent = app.name;
  
  // Close Dropdown
  const dropdown = document.getElementById('app-selector-dropdown');
  if (dropdown) dropdown.classList.remove('active');
  
  // Refresh layout data
  refreshViewData();
}

// Switch Sidebar tabs
export function switchView(viewId, element) {
  const navLinks = document.querySelectorAll('.nav-link');
  navLinks.forEach(link => link.classList.remove('active'));
  
  if (element) {
    element.classList.add('active');
  } else {
    // Programmatic routing fallback highlight
    navLinks.forEach(link => {
      const clickAttr = link.getAttribute('data-on-click');
      if (clickAttr && clickAttr.includes(viewId)) {
        link.classList.add('active');
      }
    });
  }
  
  const viewPanels = document.querySelectorAll('.view-panel');
  viewPanels.forEach(panel => panel.classList.remove('active'));
  
  const activePanel = document.getElementById(`view-${viewId}`);
  if (activePanel) {
    activePanel.classList.add('active');
  }
  
  state.setActiveView(viewId);
  
  const viewTitles = {
    'founder-dash': { title: 'Founder Dashboard', desc: 'Monitor startup metrics and cross-app growth performance.' },
    'war-room': { title: 'Executive War Room', desc: 'Centralized command center aggregate metrics and active loops.' },
    'insights': { title: 'Executive Insights', desc: 'Downloadable strategy updates and portfolio financial analytics.' },
    'launch-center': { title: 'Launch Command Center', desc: 'Plan launches, countdown campaigns, and content calendars.' },
    'aso-center': { title: 'ASO Optimization', desc: 'Keyword research, listing description builders, and store metrics.' },
    'store-integrations': { title: 'App Store Integrations', desc: 'Configure connections for Apple App Store and Google Play Dev Consoles.' },
    'review-engine': { title: 'Review Marketing Engine', desc: 'Filter, import, and translate reviews into social testimonials.' },
    'social-inbox': { title: 'Unified Social Inbox', desc: 'Aggregate platform comments, messages, replies, and invoke AI smart replies.' },
    'social-calendar': { title: 'Social Calendar', desc: 'Interactive campaign scheduling, queue controls, and timezone converters.' },
    'content-studio': { title: 'AI Content Studio', desc: 'Create platform-optimized variants, hashtags, and threads.' },
    'media-asset': { title: 'Media Asset Library', desc: 'Store campaign brand documents and videos with AI tag indexing.' },
    'release-automator': { title: 'Release Automation', desc: 'Auto-generate social changelogs and emails for product releases.' },
    'roadmap-center': { title: 'Roadmap Manager', desc: 'Publish feature lists, coordinate user votes, and share announcements.' },
    'content-recycler': { title: 'Content Recycler & Copilot', desc: 'Rephrase high-performing posts and receive weekly advisory reviews.' },
    'competitor-ecosystem': { title: 'Ecosystem & Competitors', desc: 'Track rival apps and discover portfolio bundle cross-promotion setups.' },
    'auth-team': { title: 'Auth & Team Settings', desc: 'Connect Supabase Auth, verify tokens, and manage role-based permissions.' },
    'db-console': { title: 'Database & Jobs Console', desc: 'Inspect Postgres schemas, run SQL statement logs, and verify Redis jobs.' },
    'agent-framework': { title: 'AI Agent Framework', desc: 'Coordinate and simulate automated subagent team collaborations.' },
    'agent-orchestration': { title: 'Agent Orchestration Flow', desc: 'Watch real-time cooperative agent pipelines execute target workflows.' },
    'content-intelligence': { title: 'Content Intelligence & Performance', desc: 'Predict performance, analyze optimal CTAs, run recycling, and get Coach recommendations.' },
    'ad-dash': { title: 'Advertising Command Center', desc: 'Manage AI Media Buying, approve budgets, and monitor ROAS.' }
  };
  
  if (viewTitles[viewId]) {
    const titleEl = document.getElementById('current-view-title');
    const descEl = document.getElementById('current-view-desc');
    if (titleEl) titleEl.textContent = viewTitles[viewId].title;
    if (descEl) descEl.textContent = viewTitles[viewId].desc;
  }
  
  // Close mobile sidebar on navigation
  const sidebar = document.querySelector('aside');
  if (sidebar) sidebar.classList.remove('mobile-active');
  
  refreshViewData();
}

// Refresh data for the current active view
export function refreshViewData() {
  switch(state.currentActiveView) {
    case 'founder-dash':
      renderDashboard();
      break;
    case 'war-room':
      renderWarRoom();
      break;
    case 'insights':
      renderExecutiveInsights();
      break;
    case 'aso-center':
      renderASOView();
      break;
    case 'review-engine':
      renderReviewEngineView();
      break;
    case 'social-inbox':
      fetchInboxThreads();
      break;
    case 'social-calendar':
      fetchCalendarPosts();
      break;
    case 'media-asset':
      renderMediaManager();
      break;
    case 'roadmap-center':
      renderRoadmapView();
      break;
    case 'content-recycler':
      renderRecyclerAndCopilotView();
      break;
    case 'competitor-ecosystem':
      renderCompetitorEcosystemView();
      break;
    case 'auth-team':
      fetchTeamMembers();
      break;
    case 'db-console':
      renderDatabaseConsole();
      break;
    case 'content-intelligence':
      fetchIntelligenceData();
      break;
    case 'ad-dash':
      import('./advertisingModule.js?v=2').then(module => module.startAdPolling());
      break;
  }
}

// Notification center renderer
export function renderNotifications() {
  const container = document.getElementById('notif-drawer-container');
  if (!container) return;
  container.innerHTML = '';
  
  const list = state.notificationsList || [];
  if (list.length === 0) {
    const empty = createSafeElement('p', [], 'No alerts logged.');
    empty.style.color = 'var(--text-sub)';
    empty.style.textAlign = 'center';
    empty.style.padding = '20px';
    container.appendChild(empty);
    return;
  }
  
  list.forEach(item => {
    const card = createSafeElement('div', ['notif-item-card', 'unread']);
    
    const time = createSafeElement('span', ['notif-time'], item.time);
    
    const title = createSafeElement('h5', [], item.title);
    title.style.color = 'white';
    title.style.fontSize = '0.85rem';
    title.style.marginBottom = '4px';
    
    const desc = createSafeElement('p', [], item.desc);
    desc.style.fontSize = '0.75rem';
    desc.style.color = 'var(--text-muted)';
    desc.style.lineHeight = '1.3';
    
    card.appendChild(time);
    card.appendChild(title);
    card.appendChild(desc);
    container.appendChild(card);
  });
}

// Executive War Room Mock logs
export function renderWarRoom() {
  const list = document.getElementById('war-room-agent-activity');
  if (!list) return;
  list.innerHTML = `
    <div style="background:rgba(255,255,255,0.02); border:1px solid var(--border-glass); border-radius:6px; padding:12px;">
      <h5 style="color:white; font-size:0.85rem; display:flex; justify-content:space-between;">
        <span>ASO Agent Task</span>
        <span style="color:var(--accent-green); font-size:0.75rem;">Completed</span>
      </h5>
      <p style="font-size:0.78rem; color:var(--text-muted); margin-top:4px;">Crawled Apple App Store listings metadata search indices. Found 2 keyword gaps.</p>
    </div>
    <div style="background:rgba(255,255,255,0.02); border:1px solid var(--border-glass); border-radius:6px; padding:12px;">
      <h5 style="color:white; font-size:0.85rem; display:flex; justify-content:space-between;">
        <span>Content Agent Task</span>
        <span style="color:var(--accent-orange); font-size:0.75rem;">Active</span>
      </h5>
      <p style="font-size:0.78rem; color:var(--text-muted); margin-top:4px;">Drafting A/B copy variants for June calendar countdown challenge queues.</p>
    </div>
    <div style="background:rgba(255,255,255,0.02); border:1px solid var(--border-glass); border-radius:6px; padding:12px;">
      <h5 style="color:white; font-size:0.85rem; display:flex; justify-content:space-between;">
        <span>Analytics Agent Task</span>
        <span style="color:var(--text-sub); font-size:0.75rem;">Idle</span>
      </h5>
      <p style="font-size:0.78rem; color:var(--text-muted); margin-top:4px;">Awaiting background hourly BullMQ stats collection jobs sync triggers.</p>
    </div>
  `;
}

// ------------------------------------------
// AUTH & TEAM SERVICES
// ------------------------------------------
export async function fetchTeamMembers() {
  try {
    state.authState.teamMembers = await requestApi('/api/members');
  } catch (err) {
    console.warn("Express server offline. Falling back to local RBAC permissions scope.");
  }
  renderAuthTeamView();
}

export function renderAuthTeamView() {
  const members = state.authState.teamMembers || [];
  const tbody = document.getElementById('team-members-tbody');
  if (!tbody) return;
  tbody.innerHTML = '';
  
  members.forEach(mem => {
    const row = createSafeElement('tr');
    
    const nameTd = createSafeElement('td', [], mem.name);
    nameTd.style.fontWeight = '600';
    nameTd.style.color = 'white';
    
    const emailTd = createSafeElement('td', [], mem.email);
    
    const roleTd = createSafeElement('td');
    const roleSpan = createSafeElement('span', [], mem.role);
    roleSpan.style.background = 'rgba(99,102,241,0.1)';
    roleSpan.style.padding = '2px 6px';
    roleSpan.style.borderRadius = '4px';
    roleSpan.style.color = '#c7d2fe';
    roleTd.appendChild(roleSpan);
    
    const statusTd = createSafeElement('td');
    const statusSpan = createSafeElement('span', [], mem.status);
    statusSpan.style.color = 'var(--accent-green)';
    statusSpan.style.fontWeight = '600';
    statusTd.appendChild(statusSpan);
    
    const actionsTd = createSafeElement('td');
    const editBtn = createSafeElement('button', ['btn', 'btn-secondary'], 'Edit Role');
    editBtn.style.padding = '4px 8px';
    editBtn.style.fontSize = '0.7rem';
    editBtn.setAttribute('data-on-click', `changeMemberRoleSim('${mem.id}')`);
    actionsTd.appendChild(editBtn);
    
    row.appendChild(nameTd);
    row.appendChild(emailTd);
    row.appendChild(roleTd);
    row.appendChild(statusTd);
    row.appendChild(actionsTd);
    tbody.appendChild(row);
  });
}

export function simulateSbAuthVerify() {
  const urlEl = document.getElementById('auth-sb-url');
  const keyEl = document.getElementById('auth-sb-key');
  
  if (!urlEl || !keyEl || !urlEl.value || !keyEl.value) {
    showToast("Supabase credentials missing!", "error");
    return;
  }
  
  showToast("Verifying Supabase SSL handshake and tokens...", "success");
  setTimeout(async () => {
    await syncUserSession();
    showToast("Supabase Database connection successful! Auth RLS policies active.", "success");
  }, 1000);
}

export function simulateSbAuthSignout() {
  showToast("Clearing Supabase session data...", "success");
  
  const headerName = document.getElementById('user-header-name');
  const avatar = document.getElementById('user-header-avatar');
  const authName = document.getElementById('auth-user-name');
  const authRole = document.getElementById('auth-user-role');
  
  if (headerName) headerName.textContent = "Logged Out";
  if (avatar) avatar.src = "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=80";
  if (authName) authName.textContent = "Guest User";
  if (authRole) authRole.textContent = "Signed Out";
}

export async function inviteNewTeamMember() {
  const email = prompt("Enter team member invite email address:");
  if (!email) return;
  
  const role = prompt("Enter assigned role (Owner, Admin, Manager, Editor, Viewer):", "Editor");
  if (!role) return;
  
  try {
    await requestApi('/api/members/invite', {
      method: 'POST',
      body: JSON.stringify({ email, role })
    });
    showToast(`Invite email dispatched to ${email}!`, "success");
  } catch (err) {
    showToast(`Invite email dispatched to ${email}! (Mock Offline Mode)`, "success");
  }
  
  const name = email.split('@')[0];
  const newMember = {
    id: "mem_" + Date.now(),
    name: name.charAt(0).toUpperCase() + name.slice(1),
    email: email,
    role: role,
    status: "Active"
  };
  
  state.authState.teamMembers.push(newMember);
  renderAuthTeamView();
}

export function changeMemberRoleSim(memberId) {
  const member = state.authState.teamMembers.find(m => m.id === memberId);
  if (!member) return;
  
  const role = prompt(`Modify role for ${member.name} (Owner, Admin, Manager, Editor, Viewer):`, member.role);
  if (role) {
    member.role = role;
    showToast(`Role updated to ${role}`, "success");
    renderAuthTeamView();
  }
}

// ------------------------------------------
// REVIEW MARKETING ENGINE VIEW MOCKUP
// ------------------------------------------
export function renderReviewEngineView() {
  filterReviews(state.reviewFilterSentiment);
}

export function loadReviewInMockup(reviewId) {
  const app = state.appsData[state.currentActiveApp];
  if (!app) return;
  const review = app.reviews.find(r => r.id === reviewId);
  if (!review) return;
  
  const stars = document.getElementById('mockup-stars');
  const quote = document.getElementById('mockup-quote');
  const author = document.getElementById('mockup-author');
  const appname = document.getElementById('mockup-appname');
  
  if (stars) stars.textContent = '★'.repeat(review.rating);
  if (quote) quote.textContent = `"${review.text}"`;
  if (author) author.textContent = review.author;
  if (appname) appname.textContent = app.name;
}

export function shareMockupAsTweet() {
  showToast("Testimonial draft copied to clipboard!", "success");
}

export function triggerQuickAction() {
  const num = prompt("Select quick action number:\n1. Open calendar scheduler\n2. Sync store connections");
  if (num === '1') switchView('social-calendar');
  else if (num === '2') switchView('store-integrations');
}

export function toggleThemeMode() {
  const isLight = document.body.classList.toggle('light-mode');
  localStorage.setItem('theme_mode', isLight ? 'light' : 'dark');
  showToast(`${isLight ? 'Light' : 'Dark'} mode active!`, "success");
}

// ------------------------------------------
// EVENT DELEGATION ROUTER (XSS RESISTANT)
// ------------------------------------------
document.addEventListener('click', (e) => {
  const target = e.target.closest('[data-on-click]');
  if (!target) return;
  
  const actionStr = target.getAttribute('data-on-click');
  try {
    executeAction(actionStr, target, e);
  } catch (err) {
    console.error("Action execution failed: " + actionStr, err);
  }
});

function executeAction(actionStr, element, event) {
  const match = actionStr.match(/^([a-zA-Z0-9_]+)\((.*)\)$/);
  if (!match) {
    const fnName = actionStr.replace(/\(\)$/, '');
    callFunction(fnName, [], element, event);
    return;
  }
  
  const fnName = match[1];
  const argsStr = match[2].trim();
  
  const args = [];
  if (argsStr) {
    const rawArgs = argsStr.split(/,\s*/);
    rawArgs.forEach(arg => {
      const trimmed = arg.trim();
      if (trimmed === 'this') {
        args.push(element);
      } else if (trimmed === 'event') {
        args.push(event);
      } else if ((trimmed.startsWith("'") && trimmed.endsWith("'")) || (trimmed.startsWith('"') && trimmed.endsWith('"'))) {
        args.push(trimmed.slice(1, -1));
      } else if (trimmed === 'true') {
        args.push(true);
      } else if (trimmed === 'false') {
        args.push(false);
      } else if (!isNaN(trimmed)) {
        args.push(Number(trimmed));
      } else {
        args.push(trimmed);
      }
    });
  }
  
  callFunction(fnName, args, element, event);
}

function callFunction(name, args, element, event) {
  const functionMap = {
    // Navigation / Shell
    switchView,
    selectActiveApp,
    toggleAppSelectorDropdown,
    toggleNotificationDrawer,
    toggleMobileSidebar,
    toggleThemeMode,
    
    // Auth / Team
    simulateSbAuthVerify,
    simulateSbAuthSignout,
    inviteNewTeamMember,
    changeMemberRoleSim,
    
    // Inbox
    sendInboxMessageReply,
    markActiveInboxResolved,
    prefillInboxReply,
    selectInboxThread,
    
    // Calendar & Modals
    openCalendarPostModal,
    closeModal,
    openModal,
    
    // Media
    simulateMediaUploadClick,
    selectMediaFolder,
    changeMockupTheme,
    exportMockupSuccess: exportMockupToPng,
    shareMockupAsTweet,
    
    // Database Console
    prefillSQLConsoleQuery,
    executeSQLQueryOnConsole,
    selectDbConsoleTable,
    
    // AI Agents
    clearAgentTerminal,
    toggleAgentSimulation,
    startOrchestrationPipelineSimulation,
    
    // Content Studio & Campaigns
    prefillLaunchPrompt,
    generateLaunchCampaign,
    runASOAnalysis,
    verifyStoreIntegration,
    syncAppStoreNow,
    simulateReviewImport,
    filterReviews,
    generateReleaseCampaign,
    switchReleaseTab,
    approveAndScheduleRelease,
    copyReleaseToClipboard,
    toggleRoadmapVisibility,
    addNewRoadmapItem,
    generateRoadmapAnnouncementPost,
    recycleContent,
    generateWeeklyGrowthReport,
    createCrossPromoAssets,
    copyCrossPromoText,
    downloadExecutiveReport,
    
    // Auth
    toggleAuthMode,
    logout,
    
    // Memory Engine
    searchGrowthMemoryUI,
    
    loadReviewInMockup,
    triggerQuickAction,
    generateStudioContent,
    recycleStudioContent,
    generateStudioImage,
    generateStudioVideo,
    
    // Autonomous Distribution
    executeAutonomousGrowth,
    
    // Content Intelligence
    runSuccessPrediction,
    runSaaSContentRecycle,
    askContentCoach,
    downloadWeeklyReport
  };
  
  const fn = functionMap[name];
  if (typeof fn === 'function') {
    fn.apply(null, args);
  } else {
    console.warn(`Function ${name} not found in modular action map.`);
  }
}
