// App Founder Growth Suite - Supabase Authentication Module
import { API_URL, showToast, closeModal } from './common.js';

// Initialize Supabase client from CDN (loaded in index.html)
const SUPABASE_URL = window.__SUPABASE_URL__ || '';
const SUPABASE_ANON_KEY = window.__SUPABASE_ANON_KEY__ || '';

let supabaseClient = null;

export function getSupabaseClient() {
  return supabaseClient;
}

// Fetch config from backend and initialize Supabase
export async function initAuth() {
  try {
    const res = await fetch(`${API_URL}/api/auth/config`);
    if (res.ok) {
      const config = await res.json();
      if (config.supabaseUrl && config.supabaseAnonKey && window.supabase) {
        if (!supabaseClient) {
          supabaseClient = window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey);
        }
      }
    }
  } catch (e) {
    console.warn('Could not fetch auth config, auth features disabled.');
  }

  // Check if user is already logged in
  const session = await getSession();
  if (session) {
    hideLoginScreen();
    storeToken(session.access_token);
    return session;
  } else {
    showLoginScreen();
    return null;
  }
}

// Get current session
async function getSession() {
  if (!supabaseClient) return null;
  try {
    const { data: { session }, error } = await supabaseClient.auth.getSession();
    if (error || !session) return null;
    return session;
  } catch (e) {
    return null;
  }
}

// Store token in localStorage for API requests
function storeToken(token) {
  if (token) {
    localStorage.setItem('supabase_jwt_token', token);
  }
}

// Login with email/password
export async function loginWithEmail(email, password) {
  if (!supabaseClient) {
    showToast('Auth service not configured', 'error');
    return false;
  }

  const loginBtn = document.getElementById('auth-login-btn');
  const errorEl = document.getElementById('auth-error-message');
  
  if (loginBtn) {
    loginBtn.disabled = true;
    loginBtn.textContent = 'Signing in...';
  }
  if (errorEl) errorEl.textContent = '';

  try {
    const { data, error } = await supabaseClient.auth.signInWithPassword({
      email: email,
      password: password
    });

    if (error) {
      if (errorEl) errorEl.textContent = error.message;
      return false;
    }

    storeToken(data.session.access_token);
    hideLoginScreen();
    showToast('Welcome back! Signed in successfully.');
    return true;
  } catch (err) {
    if (errorEl) errorEl.textContent = 'Connection error. Please try again.';
    return false;
  } finally {
    if (loginBtn) {
      loginBtn.disabled = false;
      loginBtn.textContent = 'Sign In';
    }
  }
}

// Sign up with email/password
export async function signupWithEmail(email, password) {
  if (!supabaseClient) {
    showToast('Auth service not configured', 'error');
    return false;
  }

  const signupBtn = document.getElementById('auth-signup-btn');
  const errorEl = document.getElementById('auth-error-message');

  if (signupBtn) {
    signupBtn.disabled = true;
    signupBtn.textContent = 'Creating account...';
  }
  if (errorEl) errorEl.textContent = '';

  try {
    const { data, error } = await supabaseClient.auth.signUp({
      email: email,
      password: password
    });

    if (error) {
      if (errorEl) errorEl.textContent = error.message;
      return false;
    }

    if (data.session) {
      // Auto-confirmed, log in directly
      storeToken(data.session.access_token);
      hideLoginScreen();
      showToast('Account created! Welcome to Growth Suite.');
      return true;
    } else {
      // Email confirmation required
      if (errorEl) {
        errorEl.style.color = 'var(--accent-green)';
        errorEl.textContent = 'Check your email for a confirmation link!';
      }
      return false;
    }
  } catch (err) {
    if (errorEl) errorEl.textContent = 'Connection error. Please try again.';
    return false;
  } finally {
    if (signupBtn) {
      signupBtn.disabled = false;
      signupBtn.textContent = 'Create Account';
    }
  }
}

// Login with OAuth provider (Google, GitHub)
export async function loginWithOAuth(provider) {
  if (!supabaseClient) {
    showToast('Auth service not configured', 'error');
    return;
  }

  const { error } = await supabaseClient.auth.signInWithOAuth({
    provider: provider,
    options: {
      redirectTo: window.location.origin
    }
  });

  if (error) {
    showToast(error.message, 'error');
  }
}

// Logout
export async function logout() {
  if (supabaseClient) {
    await supabaseClient.auth.signOut();
  }
  localStorage.removeItem('supabase_jwt_token');
  showLoginScreen();
  showToast('Signed out successfully.');
}

// Listen for auth state changes (handles OAuth redirects)
export function onAuthStateChange(callback) {
  if (!supabaseClient) return;
  supabaseClient.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_IN' && session) {
      storeToken(session.access_token);
      hideLoginScreen();
      if (callback) callback(session);
    } else if (event === 'SIGNED_OUT') {
      localStorage.removeItem('supabase_jwt_token');
      showLoginScreen();
    }
  });
}

// UI Helpers
function showLoginScreen() {
  const loginScreen = document.getElementById('auth-login-screen');
  const appContainer = document.getElementById('app-container');
  if (loginScreen) loginScreen.style.display = 'flex';
  if (appContainer) appContainer.style.display = 'none';
}

function hideLoginScreen() {
  const loginScreen = document.getElementById('auth-login-screen');
  const appContainer = document.getElementById('app-container');
  if (loginScreen) loginScreen.style.display = 'none';
  if (appContainer) appContainer.style.display = '';
}

// Toggle between login and signup forms
export function toggleAuthMode() {
  const loginForm = document.getElementById('auth-login-form');
  const signupForm = document.getElementById('auth-signup-form');
  const errorEl = document.getElementById('auth-error-message');
  
  if (errorEl) errorEl.textContent = '';
  
  if (loginForm && signupForm) {
    if (loginForm.style.display === 'none') {
      loginForm.style.display = 'block';
      signupForm.style.display = 'none';
    } else {
      loginForm.style.display = 'none';
      signupForm.style.display = 'block';
    }
  }
}

// Avatar Picker & Live Preview Controller
export function initAvatarPicker() {
  const fileInput = document.getElementById('avatar-file-input');
  const urlInput = document.getElementById('profile-modal-avatar-url');
  const previewImg = document.getElementById('profile-modal-avatar-preview');
  const clearBtn = document.getElementById('clear-avatar-btn');
  const presetOptions = document.querySelectorAll('.preset-avatar-option');

  if (fileInput) {
    fileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        window.selectedAvatarFile = file;
        const reader = new FileReader();
        reader.onload = (evt) => {
          if (previewImg) previewImg.src = evt.target.result;
          if (urlInput) urlInput.value = '';
        };
        reader.readAsDataURL(file);
      }
    });
  }

  if (urlInput) {
    urlInput.addEventListener('input', (e) => {
      const url = e.target.value.trim();
      if (url && previewImg) {
        window.selectedAvatarFile = null;
        previewImg.src = url;
      }
    });
  }

  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      window.selectedAvatarFile = null;
      if (urlInput) urlInput.value = '';
      const headerAvatar = document.getElementById('user-header-avatar');
      if (previewImg && headerAvatar) previewImg.src = headerAvatar.src;
    });
  }

  if (presetOptions) {
    presetOptions.forEach(opt => {
      opt.addEventListener('click', () => {
        window.selectedAvatarFile = null;
        const src = opt.src;
        if (previewImg) previewImg.src = src;
        if (urlInput) urlInput.value = src;
        presetOptions.forEach(p => p.style.borderColor = 'transparent');
        opt.style.borderColor = 'var(--accent-color, #6366f1)';
      });
    });
  }
}

export async function saveUserProfile() {
  const saveBtn = document.getElementById('save-profile-btn');
  if (!saveBtn) return;
  const originalText = saveBtn.textContent;
  saveBtn.textContent = 'Saving...';
  saveBtn.disabled = true;
  
  const newName = document.getElementById('profile-modal-name')?.value || '';
  const avatarPreview = document.getElementById('profile-modal-avatar-preview');
  let newAvatarUrl = avatarPreview ? avatarPreview.src : '';
  
  try {
    if (window.selectedAvatarFile && window.supabaseClient) {
      const file = window.selectedAvatarFile;
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}_avatar.${fileExt}`;
      const filePath = `${fileName}`;
      
      const { data, error } = await window.supabaseClient.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });
        
      if (!error) {
        const { data: { publicUrl } } = window.supabaseClient.storage
          .from('avatars')
          .getPublicUrl(filePath);
        newAvatarUrl = publicUrl;
      } else {
        console.warn('Supabase avatars storage error, using data URL fallback:', error.message);
      }
    }
    
    // Save to Supabase Auth user metadata
    if (window.supabaseClient) {
      try {
        await window.supabaseClient.auth.updateUser({
          data: { full_name: newName, avatar_url: newAvatarUrl }
        });
      } catch (sbErr) {
        console.warn('Auth updateUser error:', sbErr.message);
      }
    }
    
    // Local persistence
    localStorage.setItem('user_full_name', newName);
    localStorage.setItem('user_avatar_url', newAvatarUrl);
    
    // Update Header UI instantly
    const headerName = document.getElementById('user-header-name');
    const avatar = document.getElementById('user-header-avatar');
    if (headerName && newName) headerName.textContent = newName;
    if (avatar && newAvatarUrl) avatar.src = newAvatarUrl;
    
    showToast('Profile & Avatar updated successfully!', 'success');
    closeModal('user-profile-modal');
  } catch (err) {
    console.error('Error saving profile:', err);
    showToast('Error saving profile.', 'error');
  } finally {
    saveBtn.textContent = originalText;
    saveBtn.disabled = false;
  }
}
