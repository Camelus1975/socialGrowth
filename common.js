// App Founder Growth Suite - Common UI Utilities
import { state } from './state.js';

// Auto-detect API URL: same-origin in production, localhost in development
export const API_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'http://127.0.0.1:3000'
  : '';  // Empty string = same-origin requests (frontend served by Express)

// Secure helper to fetch from Express API
export async function requestApi(path, options = {}) {
  const token = localStorage.getItem('supabase_jwt_token') || 'mock-supabase-jwt-token';
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
    'X-App-Language': state.language || 'en',
    ...options.headers
  };
  
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers
  });
  
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
  if (sidebar) {
    sidebar.classList.toggle('mobile-active');
  }
}

// Safe Node Creator to prevent XSS injections
export function createSafeElement(tag, classes = [], text = '') {
  const el = document.createElement(tag);
  classes.forEach(c => el.classList.add(c));
  if (text) el.textContent = text;
  return el;
}
