// App Founder Growth Suite - Common UI Utilities
import { state } from './state.js';

// Auto-detect API URL: same-origin in production, localhost in development
export const API_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'http://127.0.0.1:3000'
  : '';  // Empty string = same-origin requests (frontend served by Express)

// Try to refresh the Supabase token
async function refreshToken() {
  try {
    const { getSupabaseClient } = await import('./auth.js');
    const supabase = getSupabaseClient();
    if (!supabase) return null;
    const { data, error } = await supabase.auth.refreshSession();
    if (!error && data.session) {
      localStorage.setItem('supabase_jwt_token', data.session.access_token);
      return data.session.access_token;
    }
  } catch (e) {
    console.warn('Token refresh failed:', e.message);
  }
  return null;
}

// Secure helper to fetch from Express API (with auto-retry on 401)
export async function requestApi(path, options = {}) {
  let token = localStorage.getItem('supabase_jwt_token') || 'mock-supabase-jwt-token';
  
  const doFetch = async (authToken) => {
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`,
      'X-App-Language': state.language || 'en',
      ...options.headers
    };
    return fetch(`${API_URL}${path}`, { ...options, headers });
  };
  
  let res = await doFetch(token);
  
  // If 401, try refreshing the token and retry once
  if (res.status === 401) {
    const newToken = await refreshToken();
    if (newToken) {
      res = await doFetch(newToken);
    } else {
      console.error("Token refresh failed. Forcing logout.");
      localStorage.removeItem('supabase_jwt_token');
      window.location.reload();
      return null;
    }
  }
  
  if (!res.ok) {
    if (res.status === 402 && window.billingModule) {
      window.billingModule.handleBillingError(res);
      throw new Error(`Insufficient Growth Credits.`);
    }

    let errBody = {};
    try {
      errBody = await res.json();
      console.error("API Error Details:", errBody);
    } catch(e) {}
    
    let errMsg = `API Error: ${res.status} - ${errBody.error || res.statusText}`;
    if (errBody.details) errMsg += ` DETAILS: ${errBody.details}`;
    throw new Error(errMsg);
  }
  return res.json();
}

// Toast Notifications
export function showToast(message, type = 'success') {
  const toast = document.getElementById('toast-notification');
  const toastMsg = document.getElementById('toast-message');
  if (!toast || !toastMsg) return;
  
  toastMsg.textContent = message; // Safe textContent to prevent XSS
  
  toast.style.border = type === 'success' ? '1px solid var(--accent-green)' : '1px solid var(--accent-red)';
  const iconSpan = toast.querySelector('span');
  if (iconSpan) {
    iconSpan.style.color = type === 'success' ? 'var(--accent-green)' : 'var(--accent-red)';
    iconSpan.textContent = type === 'success' ? '✓' : '⚠';
  }
  
  toast.style.display = 'flex';
  setTimeout(() => {
    toast.style.display = 'none';
  }, 3000);
}

// Custom CSS Modals Handler
export function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.add('active');
  }
}

export function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.remove('active');
  }
}

// Notification Drawer Toggle
export function toggleNotificationDrawer() {
  const drawer = document.getElementById('notif-drawer');
  if (drawer) {
    drawer.classList.toggle('active');
  }
}

// Mobile Responsive Hamburger Menu
export function toggleMobileSidebar() {
  const sidebar = document.querySelector('aside');
  const overlay = document.getElementById('mobile-sidebar-overlay');
  if (sidebar) {
    sidebar.classList.toggle('mobile-active');
  }
  if (overlay) {
    overlay.classList.toggle('active');
  }
}

// Safe Node Creator to prevent XSS injections
export function createSafeElement(tag, classes = [], text = '') {
  const el = document.createElement(tag);
  classes.forEach(c => el.classList.add(c));
  if (text) el.textContent = text;
  return el;
}

// Theme Toggle
export function initTheme() {
  const savedTheme = localStorage.getItem('theme_mode');
  if (savedTheme === 'dark') {
    document.body.classList.remove('light-mode');
  } else {
    document.body.classList.add('light-mode');
  }
}

export function toggleThemeMode() {
  const isLight = document.body.classList.toggle('light-mode');
  localStorage.setItem('theme_mode', isLight ? 'light' : 'dark');
  showToast(`${isLight ? 'Light' : 'Dark'} mode active!`, "success");
}// --- Media Viewer ---
window.openMediaViewer = function(url, type) {
  let modal = document.getElementById('global-media-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'global-media-modal';
    modal.className = 'custom-modal-overlay';
    modal.innerHTML = `
      <div class="custom-modal-content" style="width: 50vw; min-width: 500px; max-width: 90vw; padding: 16px; position: relative;">
        <button class="btn btn-secondary" style="position: absolute; top: -12px; right: -12px; z-index: 1000; border-radius: 50%; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; background: var(--bg-surface, #1e293b); border: 1px solid var(--border-glass, rgba(255,255,255,0.2)); color: white; cursor: pointer;" onclick="document.getElementById('global-media-modal').style.display='none'; document.getElementById('global-media-container').innerHTML='';">✕</button>
        <div id="global-media-container" style="display: flex; justify-content: center; align-items: center; width: 100%; max-height: 82vh; overflow: hidden; border-radius: 12px;">
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  }
  
  const container = document.getElementById('global-media-container');
  const isVid = type === 'video' || (typeof url === 'string' && (url.endsWith('.mp4') || url.endsWith('.webm')));
  if (isVid) {
    container.innerHTML = `<video src="${url}" controls autoplay style="width: 100%; max-height: 82vh; border-radius: 8px; object-fit: contain;"></video>`;
  } else {
    container.innerHTML = `<img src="${url}" style="width: 100%; max-height: 82vh; border-radius: 8px; object-fit: contain;" />`;
  }
  
  modal.style.display = 'flex';
};
