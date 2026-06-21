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
    }
  }
  
  if (!res.ok) {
    let errBody = {};
    try {
      errBody = await res.json();
      console.error("API Error Details:", errBody);
    } catch(e) {}
    throw new Error(`API Error: ${res.status} - ${errBody.details || errBody.error || 'Unknown'}`);
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
