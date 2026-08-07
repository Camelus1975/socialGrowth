import { getSupabaseClient } from './auth.js';

export async function initWorkspaceV3(state) {
  const dropdownBtn = document.getElementById('workspace-selector-btn');
  const dropdownMenu = document.getElementById('workspace-dropdown-menu');
  const activeName = document.getElementById('active-workspace-name');
  
  if (!dropdownBtn || !dropdownMenu) return;
  
  let businesses = [];
  
  // Toggle dropdown
  dropdownBtn.addEventListener('click', (e) => {
    // Only toggle if we didn't click inside the menu
    if (!e.target.closest('.workspace-dropdown-item')) {
      dropdownMenu.classList.toggle('active');
    }
  });
  
  // Close when clicking outside
  document.addEventListener('click', (e) => {
    if (!dropdownBtn.contains(e.target)) {
      dropdownMenu.classList.remove('active');
    }
  });
  
  // Fetch from Supabase
  async function fetchWorkspaces() {
    const supabaseClient = getSupabaseClient();
    if (supabaseClient) {
      try {
        const { data, error } = await supabaseClient.from('businesses').select('*');
        if (data && data.length > 0) {
          businesses = data;
          renderBusinesses(data);
          
          // Only auto-select the first one if we don't have an active one yet
          if (activeName.textContent === 'My Brand' || activeName.textContent === 'Loading...' || !state.activeWorkspaceId) {
            activeName.textContent = data[0].name || 'My Brand';
            if (state) {
              state.activeWorkspace = data[0].name;
              state.activeWorkspaceId = data[0].business_id;
            }
            window.dispatchEvent(new CustomEvent('workspaceChanged'));
          }
        }
      } catch (err) {
        console.error('Could not fetch businesses:', err);
      }
    }
  }

  fetchWorkspaces();
  
  // Listen for agent-triggered workspace refreshes
  window.addEventListener('refreshWorkspaces', () => {
    fetchWorkspaces();
  });
  
  function renderBusinesses(data) {
    // Remove old business items (keep the 'Add New' button at the bottom)
    const existing = dropdownMenu.querySelectorAll('.biz-item');
    existing.forEach(el => el.remove());
    
    data.forEach(biz => {
      const el = document.createElement('div');
      el.className = 'workspace-dropdown-item biz-item';
      el.innerHTML = `<span>🏢</span> ${biz.name}`;
      el.addEventListener('click', () => {
        activeName.textContent = biz.name;
        dropdownMenu.classList.remove('active');
        if (state) {
          state.activeWorkspace = biz.name;
          state.activeWorkspaceId = biz.business_id;
        }
        window.dispatchEvent(new CustomEvent('workspaceChanged'));
      });
      // Insert before the 'Add Business' button
      dropdownMenu.insertBefore(el, dropdownMenu.lastElementChild);
    });
  }
}

// Global action to initiate AI business creation
export function initiateAddBusiness() {
  const dropdownMenu = document.getElementById('workspace-dropdown-menu');
  if (dropdownMenu) dropdownMenu.classList.remove('active');
  
  // Force click the copilot nav item to switch views
  const copilotNav = document.querySelector('.nav-item[data-args="copilot"]');
  if (copilotNav) copilotNav.click();
  
  // Inject AI interview prompt
  const history = document.getElementById('copilot-chat-history');
  if (history) {
    const msgDiv = document.createElement('div');
    msgDiv.style.padding = '16px';
    msgDiv.style.borderRadius = '12px';
    msgDiv.style.marginBottom = '12px';
    msgDiv.style.maxWidth = '85%';
    msgDiv.style.lineHeight = '1.6';
    msgDiv.style.background = 'rgba(99, 102, 241, 0.1)';
    msgDiv.style.alignSelf = 'flex-start';
    msgDiv.style.border = '1px solid rgba(99, 102, 241, 0.2)';
    msgDiv.innerHTML = `<strong>Agent:</strong> I can help you set up a new business workspace! To get started, what is the <strong>name</strong> and <strong>website URL</strong> of the brand you want to add?<br><br><em>(Providing the URL allows me to instantly scan the website, learn about your business, and generate a tailored brand profile!)</em>`;
    
    history.appendChild(msgDiv);
    history.scrollTop = history.scrollHeight;
  }
}

export async function deleteWorkspace() {
  const { state } = await import('./state.js');
  const { getSupabaseClient } = await import('./auth.js');
  const { closeModal, showToast } = await import('./common.js');
  
  if (!state.activeWorkspaceId) {
    showToast('No active workspace to delete!', 'error');
    return;
  }
  
  if (!confirm(`Are you absolutely sure you want to delete ${state.activeWorkspace}? This will delete all competitors, messages, and configurations.`)) {
    return;
  }
  
  const supabase = getSupabaseClient();
  const { error } = await supabase.from('businesses').delete().eq('business_id', state.activeWorkspaceId);
  
  if (error) {
    console.error("Failed to delete workspace:", error);
    showToast('Failed to delete workspace.', 'error');
    return;
  }
  
  showToast('Workspace deleted successfully.', 'success');
  closeModal('settings-modal');
  
  // Refresh workspaces
  state.activeWorkspaceId = null;
  state.activeWorkspace = null;
  document.getElementById('active-workspace-name').textContent = 'Loading...';
  window.dispatchEvent(new CustomEvent('refreshWorkspaces'));
}

// Brand Kit & Logo Management
window.selectedLogoFile = null;

export function initBrandKitController() {
  const fileInput = document.getElementById('brand-logo-file-input');
  const urlInput = document.getElementById('brand-logo-url-input');
  const previewImg = document.getElementById('brand-logo-preview');
  const clearBtn = document.getElementById('clear-logo-btn');
  const colorPicker = document.getElementById('brand-primary-color');
  const colorHex = document.getElementById('brand-primary-color-hex');

  if (fileInput) {
    fileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        window.selectedLogoFile = file;
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
        window.selectedLogoFile = null;
        previewImg.src = url;
      }
    });
  }

  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      window.selectedLogoFile = null;
      if (urlInput) urlInput.value = '';
      if (previewImg) previewImg.src = `https://ui-avatars.com/api/?name=Brand&background=6366f1&color=fff&size=512`;
    });
  }

  if (colorPicker && colorHex) {
    colorPicker.addEventListener('input', (e) => {
      colorHex.value = e.target.value;
    });
    colorHex.addEventListener('input', (e) => {
      colorPicker.value = e.target.value;
    });
  }
}

export async function openBrandKitModal() {
  const { state } = await import('./state.js');
  const { requestApi, openModal, showToast } = await import('./common.js');
  
  if (!state.activeWorkspaceId) {
    showToast('Please select a business workspace first!', 'error');
    return;
  }
  
  openModal('brand-kit-modal');
  
  const previewImg = document.getElementById('brand-logo-preview');
  const urlInput = document.getElementById('brand-logo-url-input');
  const colorPicker = document.getElementById('brand-primary-color');
  const colorHex = document.getElementById('brand-primary-color-hex');
  const toneInput = document.getElementById('brand-tone-input');
  const visualInput = document.getElementById('brand-visual-style-input');

  try {
    const res = await requestApi(`/api/brand-kit/${state.activeWorkspaceId}`);
    const bk = res.brandKit || {};
    
    if (bk.logo_url) {
      if (previewImg) previewImg.src = bk.logo_url;
      if (urlInput) urlInput.value = bk.logo_url;
    } else {
      const appName = encodeURIComponent(state.activeWorkspace || 'Brand');
      if (previewImg) previewImg.src = `https://ui-avatars.com/api/?name=${appName}&background=6366f1&color=fff&size=512`;
      if (urlInput) urlInput.value = '';
    }

    if (bk.primary_color) {
      if (colorPicker) colorPicker.value = bk.primary_color;
      if (colorHex) colorHex.value = bk.primary_color;
    }
    if (toneInput) toneInput.value = bk.tone_of_voice || '';
    if (visualInput) visualInput.value = bk.visual_style || '';
  } catch (err) {
    console.warn('Could not load brand kit data:', err.message);
  }
}

export async function saveBrandKit() {
  const { state } = await import('./state.js');
  const { requestApi, closeModal, showToast } = await import('./common.js');
  const { getSupabaseClient } = await import('./auth.js');

  if (!state.activeWorkspaceId) {
    showToast('No active workspace selected!', 'error');
    return;
  }

  const saveBtn = document.getElementById('save-brand-kit-btn');
  if (saveBtn) {
    saveBtn.textContent = 'Saving Logo...';
    saveBtn.disabled = true;
  }

  const previewImg = document.getElementById('brand-logo-preview');
  const urlInput = document.getElementById('brand-logo-url-input');
  const colorHex = document.getElementById('brand-primary-color-hex');
  const toneInput = document.getElementById('brand-tone-input');
  const visualInput = document.getElementById('brand-visual-style-input');

  let finalLogoUrl = urlInput?.value.trim() || previewImg?.src || '';

  try {
    // If a local logo file was selected, upload to Supabase storage
    const supabase = getSupabaseClient();
    if (window.selectedLogoFile && supabase) {
      const file = window.selectedLogoFile;
      const fileExt = file.name.split('.').pop();
      const filePath = `logos/${state.activeWorkspaceId}_${Date.now()}.${fileExt}`;
      
      const { data, error } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (!error) {
        const { data: { publicUrl } } = supabase.storage
          .from('avatars')
          .getPublicUrl(filePath);
        finalLogoUrl = publicUrl;
      } else {
        console.warn('Supabase logo upload error, using current preview URL:', error.message);
      }
    }

    // Save to brand_kits table via API
    await requestApi(`/api/brand-kit/${state.activeWorkspaceId}`, {
      method: 'POST',
      body: JSON.stringify({
        logo_url: finalLogoUrl,
        primary_color: colorHex?.value || '#6366f1',
        tone_of_voice: toneInput?.value || 'Professional',
        visual_style: visualInput?.value || 'Modern Minimalist'
      })
    });

    // Update discovery_profile in businesses table so discovery engine uses the logo
    if (supabase) {
      const { data: biz } = await supabase
        .from('businesses')
        .select('discovery_profile')
        .eq('business_id', state.activeWorkspaceId)
        .maybeSingle();

      if (biz) {
        const dp = biz.discovery_profile || {};
        dp.brandKit = dp.brandKit || {};
        dp.brandKit.logoUrl = finalLogoUrl;
        dp.brandKit.colors = dp.brandKit.colors || {};
        dp.brandKit.colors.primary = colorHex?.value || '#6366f1';

        await supabase
          .from('businesses')
          .update({ discovery_profile: dp })
          .eq('business_id', state.activeWorkspaceId);
      }
    }

    showToast('Business Logo & Brand Kit saved successfully!', 'success');
    closeModal('brand-kit-modal');
  } catch (err) {
    console.error('Error saving brand kit:', err);
    showToast('Failed to save Brand Kit: ' + err.message, 'error');
  } finally {
    if (saveBtn) {
      saveBtn.textContent = 'Save Brand Kit & Logo';
      saveBtn.disabled = false;
    }
  }
}

