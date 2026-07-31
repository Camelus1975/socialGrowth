import { state } from './state.js';
import { requestApi, showToast, createSafeElement } from './common.js';
import { getSupabaseClient } from './auth.js';

export function initBrandKit() {
  window.addEventListener('appChanged', () => {
    if (state.currentAppId) {
      fetchBrandKit(state.currentAppId).then(() => {
        if (document.getElementById('brand-kit-container')) {
          renderBrandKit();
        }
      });
    }
  });

  window.addEventListener('viewChanged', (e) => {
    if (e.detail === 'brand-kit' || e.detail === 'settings') {
      if (document.getElementById('brand-kit-container')) {
        renderBrandKit();
      }
    }
  });

  // Initial load check
  if (state.currentAppId && document.getElementById('brand-kit-container')) {
    renderBrandKit();
  }
}

export async function fetchBrandKit(appId) {
  const defaultBrandKit = {
    primaryColor: '#6366f1',
    secondaryColor: '#8b5cf6',
    accentColor: '#ec4899',
    toneOfVoice: 'Professional',
    visualStyle: 'Modern Minimalist',
    targetPersona: '',
    keyPhrases: '',
    forbiddenWords: ''
  };

  try {
    const supabase = getSupabaseClient();
    if (supabase) {
      const { data, error } = await supabase
        .from('brand_kits')
        .select('*')
        .eq('app_id', appId)
        .single();
      
      if (error && error.code !== 'PGRST116') { // PGRST116 is not found
        console.error('Error fetching brand kit from Supabase:', error);
      }
      
      if (data) {
        state.brandKit = { ...defaultBrandKit, ...data };
        return state.brandKit;
      }
    } else {
      // Fallback to API if Supabase client is not available directly
      const data = await requestApi(`/api/brand-kit/${appId}`);
      if (data) {
        state.brandKit = { ...defaultBrandKit, ...data };
        return state.brandKit;
      }
    }
  } catch (error) {
    console.warn('Could not fetch brand kit, using defaults.', error);
  }

  state.brandKit = defaultBrandKit;
  return state.brandKit;
}

export function renderBrandKit() {
  const container = document.getElementById('brand-kit-container');
  if (!container) return;

  const bk = state.brandKit || {
    primaryColor: '#6366f1',
    secondaryColor: '#8b5cf6',
    accentColor: '#ec4899',
    toneOfVoice: 'Professional',
    visualStyle: 'Modern Minimalist',
    targetPersona: '',
    keyPhrases: '',
    forbiddenWords: ''
  };

  container.innerHTML = '';
  
  // Create wrapper
  const wrapper = createSafeElement('div', ['brand-kit-wrapper']);
  wrapper.style.padding = '20px';
  wrapper.style.background = 'rgba(255, 255, 255, 0.05)';
  wrapper.style.backdropFilter = 'blur(10px)';
  wrapper.style.borderRadius = '12px';
  wrapper.style.border = '1px solid rgba(255, 255, 255, 0.1)';
  wrapper.style.color = 'var(--text-light, #fff)';
  wrapper.style.display = 'flex';
  wrapper.style.flexDirection = 'column';
  wrapper.style.gap = '20px';

  // 1. Color Palette Section
  const colorSection = createSafeElement('div', ['bk-section']);
  colorSection.innerHTML = `<h3>Color Palette</h3>`;
  
  const colorsContainer = createSafeElement('div');
  colorsContainer.style.display = 'flex';
  colorsContainer.style.gap = '20px';
  colorsContainer.style.flexWrap = 'wrap';

  const createColorPicker = (id, label, value) => {
    const div = createSafeElement('div');
    div.style.display = 'flex';
    div.style.flexDirection = 'column';
    div.style.gap = '5px';
    
    const lbl = createSafeElement('label', [], label);
    lbl.style.fontSize = '0.9rem';
    
    const inputWrapper = createSafeElement('div');
    inputWrapper.style.display = 'flex';
    inputWrapper.style.alignItems = 'center';
    inputWrapper.style.gap = '10px';
    
    const colorInput = createSafeElement('input');
    colorInput.type = 'color';
    colorInput.id = id;
    colorInput.value = value;
    colorInput.style.width = '40px';
    colorInput.style.height = '40px';
    colorInput.style.border = 'none';
    colorInput.style.borderRadius = '8px';
    colorInput.style.cursor = 'pointer';
    colorInput.style.padding = '0';
    colorInput.style.background = 'transparent';
    
    const textInput = createSafeElement('input');
    textInput.type = 'text';
    textInput.id = `${id}-text`;
    textInput.value = value;
    textInput.style.width = '80px';
    textInput.style.padding = '8px';
    textInput.style.borderRadius = '6px';
    textInput.style.border = '1px solid rgba(255,255,255,0.2)';
    textInput.style.background = 'rgba(0,0,0,0.2)';
    textInput.style.color = '#fff';

    // Sync inputs and update preview
    colorInput.addEventListener('input', (e) => {
      textInput.value = e.target.value;
      updatePreview();
    });
    textInput.addEventListener('input', (e) => {
      if (/^#[0-9A-Fa-f]{6}$/i.test(e.target.value)) {
        colorInput.value = e.target.value;
        updatePreview();
      }
    });

    inputWrapper.appendChild(colorInput);
    inputWrapper.appendChild(textInput);
    div.appendChild(lbl);
    div.appendChild(inputWrapper);
    return div;
  };

  colorsContainer.appendChild(createColorPicker('bk-primary', 'Primary Color', bk.primaryColor));
  colorsContainer.appendChild(createColorPicker('bk-secondary', 'Secondary Color', bk.secondaryColor));
  colorsContainer.appendChild(createColorPicker('bk-accent', 'Accent Color', bk.accentColor));

  // Preview Card
  const previewCard = createSafeElement('div', ['bk-preview-card']);
  previewCard.style.marginTop = '20px';
  previewCard.style.padding = '20px';
  previewCard.style.borderRadius = '12px';
  previewCard.style.background = '#fff';
  previewCard.style.color = '#333';
  previewCard.style.maxWidth = '400px';
  previewCard.style.boxShadow = '0 4px 15px rgba(0,0,0,0.2)';
  previewCard.innerHTML = `
    <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 15px;">
      <div id="bk-preview-avatar" style="width: 40px; height: 40px; border-radius: 50%; background: ${bk.primaryColor}"></div>
      <div>
        <div style="font-weight: bold; font-size: 1rem;">Your Brand</div>
        <div style="font-size: 0.8rem; color: #666;">@yourbrand</div>
      </div>
    </div>
    <div style="margin-bottom: 15px; font-size: 0.95rem;">
      This is a preview of how your brand colors might look in a generated post.
      <span id="bk-preview-hashtag" style="color: ${bk.secondaryColor}; font-weight: bold;">#BrandKit</span>
    </div>
    <button id="bk-preview-btn" style="background: ${bk.accentColor}; color: #fff; border: none; padding: 8px 16px; border-radius: 20px; font-weight: bold; cursor: default;">Action Button</button>
  `;

  colorSection.appendChild(colorsContainer);
  colorSection.appendChild(previewCard);

  function updatePreview() {
    const pColor = document.getElementById('bk-primary').value;
    const sColor = document.getElementById('bk-secondary').value;
    const aColor = document.getElementById('bk-accent').value;
    
    const avatar = document.getElementById('bk-preview-avatar');
    const hashtag = document.getElementById('bk-preview-hashtag');
    const btn = document.getElementById('bk-preview-btn');
    
    if (avatar) avatar.style.background = pColor;
    if (hashtag) hashtag.style.color = sColor;
    if (btn) btn.style.background = aColor;
  }

  // 2. Tone of Voice & Style Section
  const styleSection = createSafeElement('div', ['bk-section']);
  styleSection.style.display = 'flex';
  styleSection.style.flexDirection = 'column';
  styleSection.style.gap = '15px';
  styleSection.innerHTML = `<h3>Tone of Voice & Style</h3>`;

  const createSelect = (id, label, options, selectedValue) => {
    const div = createSafeElement('div');
    div.style.display = 'flex';
    div.style.flexDirection = 'column';
    div.style.gap = '5px';
    
    const lbl = createSafeElement('label', [], label);
    lbl.style.fontSize = '0.9rem';
    
    const select = createSafeElement('select');
    select.id = id;
    select.style.padding = '10px';
    select.style.borderRadius = '6px';
    select.style.border = '1px solid rgba(255,255,255,0.2)';
    select.style.background = 'rgba(0,0,0,0.4)';
    select.style.color = '#fff';
    
    options.forEach(opt => {
      const option = document.createElement('option');
      option.value = opt;
      option.textContent = opt;
      if (opt === selectedValue) option.selected = true;
      select.appendChild(option);
    });
    
    div.appendChild(lbl);
    div.appendChild(select);
    return div;
  };

  const tones = ['Professional', 'Casual', 'Bold & Hype', 'Witty & Humorous', 'Thought Leader'];
  const visualStyles = ['Modern Minimalist', 'Cyberpunk Tech', 'Corporate Sleek', 'Vibrant & Warm', '3D Render Glass'];
  
  styleSection.appendChild(createSelect('bk-tone', 'Tone of Voice', tones, bk.toneOfVoice));
  styleSection.appendChild(createSelect('bk-visual', 'Visual Style', visualStyles, bk.visualStyle));

  const personaDiv = createSafeElement('div');
  personaDiv.style.display = 'flex';
  personaDiv.style.flexDirection = 'column';
  personaDiv.style.gap = '5px';
  const personaLbl = createSafeElement('label', [], 'Target Persona Summary');
  personaLbl.style.fontSize = '0.9rem';
  const personaInput = createSafeElement('textarea');
  personaInput.id = 'bk-persona';
  personaInput.value = bk.targetPersona;
  personaInput.placeholder = 'e.g., Tech-savvy millennials looking for productivity tools...';
  personaInput.style.padding = '10px';
  personaInput.style.borderRadius = '6px';
  personaInput.style.border = '1px solid rgba(255,255,255,0.2)';
  personaInput.style.background = 'rgba(0,0,0,0.4)';
  personaInput.style.color = '#fff';
  personaInput.style.minHeight = '80px';
  personaInput.style.resize = 'vertical';
  
  personaDiv.appendChild(personaLbl);
  personaDiv.appendChild(personaInput);
  styleSection.appendChild(personaDiv);

  // 3. Copy Directives Section
  const copySection = createSafeElement('div', ['bk-section']);
  copySection.style.display = 'flex';
  copySection.style.flexDirection = 'column';
  copySection.style.gap = '15px';
  copySection.innerHTML = `<h3>Copy Directives</h3>`;

  const createTextInput = (id, label, placeholder, value) => {
    const div = createSafeElement('div');
    div.style.display = 'flex';
    div.style.flexDirection = 'column';
    div.style.gap = '5px';
    
    const lbl = createSafeElement('label', [], label);
    lbl.style.fontSize = '0.9rem';
    
    const input = createSafeElement('input');
    input.type = 'text';
    input.id = id;
    input.value = value;
    input.placeholder = placeholder;
    input.style.padding = '10px';
    input.style.borderRadius = '6px';
    input.style.border = '1px solid rgba(255,255,255,0.2)';
    input.style.background = 'rgba(0,0,0,0.4)';
    input.style.color = '#fff';
    
    div.appendChild(lbl);
    div.appendChild(input);
    return div;
  };

  copySection.appendChild(createTextInput('bk-key-phrases', 'Key Phrases (comma-separated)', 'e.g., Level up, Boost productivity', bk.keyPhrases));
  copySection.appendChild(createTextInput('bk-forbidden-words', 'Forbidden Words (comma-separated)', 'e.g., Cheap, Fake, Click here', bk.forbiddenWords));

  // 4. Save Button
  const saveBtn = createSafeElement('button', ['primary-btn'], 'Save Brand Kit');
  saveBtn.style.padding = '12px 24px';
  saveBtn.style.background = 'linear-gradient(90deg, var(--accent-purple), var(--accent-pink))';
  saveBtn.style.color = '#fff';
  saveBtn.style.border = 'none';
  saveBtn.style.borderRadius = '8px';
  saveBtn.style.cursor = 'pointer';
  saveBtn.style.fontWeight = 'bold';
  saveBtn.style.marginTop = '10px';
  saveBtn.style.alignSelf = 'flex-start';

  saveBtn.addEventListener('click', async () => {
    if (!state.currentAppId) {
      showToast('No active app selected.', 'error');
      return;
    }

    const updatedKit = {
      app_id: state.currentAppId,
      primaryColor: document.getElementById('bk-primary').value,
      secondaryColor: document.getElementById('bk-secondary').value,
      accentColor: document.getElementById('bk-accent').value,
      toneOfVoice: document.getElementById('bk-tone').value,
      visualStyle: document.getElementById('bk-visual').value,
      targetPersona: document.getElementById('bk-persona').value,
      keyPhrases: document.getElementById('bk-key-phrases').value,
      forbiddenWords: document.getElementById('bk-forbidden-words').value,
      updated_at: new Date().toISOString()
    };

    try {
      saveBtn.textContent = 'Saving...';
      saveBtn.disabled = true;

      const supabase = getSupabaseClient();
      if (supabase) {
        const { error } = await supabase
          .from('brand_kits')
          .upsert(updatedKit, { onConflict: 'app_id' });
        
        if (error) throw error;
      } else {
        await requestApi(`/api/brand-kit/${state.currentAppId}`, {
          method: 'POST',
          body: JSON.stringify(updatedKit)
        });
      }

      state.brandKit = updatedKit;
      showToast('Brand Kit updated! AI Agents will now enforce these guidelines.');
    } catch (error) {
      console.error('Error saving brand kit:', error);
      showToast('Failed to save Brand Kit.', 'error');
    } finally {
      saveBtn.textContent = 'Save Brand Kit';
      saveBtn.disabled = false;
    }
  });

  // Assemble
  wrapper.appendChild(colorSection);
  wrapper.appendChild(styleSection);
  wrapper.appendChild(copySection);
  wrapper.appendChild(saveBtn);

  container.appendChild(wrapper);
}
