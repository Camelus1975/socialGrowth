// App Manager Module - Handles dynamic App creation and rendering
import { state } from './state.js';
import { API_URL, showToast, closeModal, requestApi } from './common.js';
import { selectActiveApp } from './app.js';
import { getTemplateForBusiness } from './industryTemplates.js';

import { getSupabaseClient } from './auth.js';

// Random gradient generator for new apps
function getRandomGradient() {
  const gradients = [
    'linear-gradient(135deg, #FF6B6B, #FF8E53)',
    'linear-gradient(135deg, #4F46E5, #3B82F6)',
    'linear-gradient(135deg, #10B981, #059669)',
    'linear-gradient(135deg, #8B5CF6, #D946EF)',
    'linear-gradient(135deg, #F59E0B, #EF4444)',
    'linear-gradient(135deg, #0EA5E9, #2DD4BF)'
  ];
  return gradients[Math.floor(Math.random() * gradients.length)];
}

// Generate a URL-friendly ID from a name
function generateAppId(name) {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '') + '_' + Math.floor(Math.random() * 1000);
}

// Render the dropdown list dynamically
export function renderAppSelectorDropdown() {
  const container = document.getElementById('dynamic-app-list');
  if (!container) return;
  
  container.innerHTML = '';
  
  const apps = Object.values(state.appsData);
  
  apps.forEach(app => {
    const div = document.createElement('div');
    div.className = 'app-option';
    div.style.display = 'flex';
    div.style.justifyContent = 'space-between';
    div.style.alignItems = 'center';
    
    // Main container for selection
    const selectDiv = document.createElement('div');
    selectDiv.style.flex = '1';
    selectDiv.style.display = 'flex';
    selectDiv.style.alignItems = 'center';
    selectDiv.onclick = () => selectActiveApp(app.id);
    
    selectDiv.innerHTML = `
      <span class="app-dot" style="background: ${app.logoColor || '#666'}; width: 8px; height: 8px; border-radius: 50%; margin-right: 8px;"></span>
      ${app.name} <span style="opacity: 0.6; font-size: 0.8em; margin-left: 4px;">(${app.category || 'App'})</span>
    `;
    
    const deleteBtn = document.createElement('button');
    deleteBtn.innerHTML = '🗑️';
    deleteBtn.title = 'Delete Business';
    deleteBtn.style.background = 'none';
    deleteBtn.style.border = 'none';
    deleteBtn.style.cursor = 'pointer';
    deleteBtn.style.padding = '4px 8px';
    deleteBtn.style.opacity = '0.6';
    deleteBtn.style.transition = 'opacity 0.2s';
    deleteBtn.onmouseover = () => deleteBtn.style.opacity = '1';
    deleteBtn.onmouseout = () => deleteBtn.style.opacity = '0.6';
    
    deleteBtn.onclick = (e) => {
      e.stopPropagation();
      deleteBusiness(app.id);
    };
    
    div.appendChild(selectDiv);
    div.appendChild(deleteBtn);
    
    container.appendChild(div);
  });
}

// Initialize App Manager Event Listeners
export function initAppManager() {
  const saveBtn = document.getElementById('app-modal-save-btn');
  if (saveBtn) {
    saveBtn.addEventListener('click', async () => {
      const nameInput = document.getElementById('new-app-name');
      const taglineInput = document.getElementById('new-app-tagline');
      const categorySelect = document.getElementById('new-app-category');
      const businessTypeSelect = document.getElementById('new-app-business-type');
      
      const name = nameInput.value.trim();
      const tagline = taglineInput.value.trim();
      const category = categorySelect.value;
      const businessType = businessTypeSelect?.value || 'saas';
      
      if (!name) {
        showToast('App Name is required', 'error');
        return;
      }
      
      const appId = generateAppId(name);
      const logoColor = getRandomGradient();
      const template = getTemplateForBusiness(businessType);
      
      const newApp = {
        id: appId,
        name,
        tagline,
        category,
        businessType,
        logoColor,
        metrics: template.kpis.reduce((acc, kpi) => {
          acc[kpi.id] = [0, 0, 0, 0, 0, 0];
          return acc;
        }, {}),
        roadmap: [
          { status: "planned", task: "Initial Launch", team: "Growth", progress: 0 }
        ]
      };
      
      // Attempt to save to Supabase via backend
      try {
        const supabase = getSupabaseClient();
        if (supabase) {
           const { data: { user } } = await supabase.auth.getUser();
           if (user) {
             const { error } = await supabase.from('businesses').insert({
               business_id: appId,
               user_id: user.id,
               name: name,
               tagline: tagline,
               category: category,
               business_type: businessType,
               logo_color: logoColor
             });
             
             if (error) {
               console.warn("Could not save to Supabase apps table.", error);
             } else {
               console.log("App saved to Supabase!");
             }
           }
        }
      } catch (err) {
        console.warn("Supabase integration error:", err);
      }
      
      // Update local state
      state.appsData[appId] = newApp;
      
      // If mock structure requires roadmap initialization
      if (!state.customRoadmapItems) state.customRoadmapItems = {};
      state.customRoadmapItems[appId] = [...newApp.roadmap];
      
      // Re-render dropdown
      renderAppSelectorDropdown();
      
      // Select the new app
      selectActiveApp(appId);
      
      // Reset form and close modal
      nameInput.value = '';
      taglineInput.value = '';
      closeModal('app-create-modal');
      
      showToast(`App "${name}" created successfully!`);
    });
  }
}

// Fetch apps from Supabase
export async function fetchUserApps() {
  try {
    const supabase = getSupabaseClient();
    if (supabase) {
      const { data, error } = await supabase.from('businesses').select('*');
      if (error) throw error;
      
      if (data && data.length > 0) {
        // Clear mock data so the dashboard doesn't aggregate it
        state.appsData = {};
        
        data.forEach(dbApp => {
          const industryTemplate = getTemplateForBusiness(dbApp.business_type || 'saas');
    
          const kpiData = {};
          industryTemplate.kpis.forEach(kpi => {
            kpiData[kpi.id] = (dbApp.metrics_history && dbApp.metrics_history[kpi.id]) ? dbApp.metrics_history[kpi.id] : [0, 0, 0, 0, 0, 0];
          });

          state.appsData[dbApp.business_id] = {
            id: dbApp.business_id,
            name: dbApp.name,
            tagline: dbApp.tagline,
            category: dbApp.category,
            businessType: dbApp.business_type || 'saas',
            categoryRank: "Active",
            rating: 5.0,
            socialGrowth: dbApp.social_growth || "+5%",
            conversionRate: dbApp.conversion_rate || "2.1%",
            logoColor: dbApp.logo_color || '#333',
            metrics: kpiData,
            roadmap: [
               { status: "planned", task: "Grow App", team: "Marketing", progress: 10 }
            ],
            analytics: {
              months: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"]
            }
          };
          if (!state.customRoadmapItems) state.customRoadmapItems = {};
          if (!state.customRoadmapItems[dbApp.business_id]) {
            state.customRoadmapItems[dbApp.business_id] = state.appsData[dbApp.business_id].roadmap;
          }
        });
      }
      // Re-render the dropdown list with the fetched apps
      renderAppSelectorDropdown();
    }
  } catch (err) {
    console.warn("Could not fetch apps from Supabase", err);
  }
}

// Delete an app from Supabase and local state
export async function deleteBusiness(appId) {
  if (!confirm('Are you sure you want to delete this business? This action cannot be undone.')) return;
  
  try {
    const supabase = getSupabaseClient();
    if (supabase) {
      const { error } = await supabase.from('businesses').delete().eq('business_id', appId);
      if (error) throw error;
      
      showToast('Business deleted successfully');
      
      // Update local state
      delete state.appsData[appId];
      if (state.customRoadmapItems) delete state.customRoadmapItems[appId];
      
      // Switch to another app or null
      const keys = Object.keys(state.appsData);
      if (state.currentActiveApp === appId) {
        if (keys.length > 0) {
          selectActiveApp(keys[0]);
        } else {
          selectActiveApp(null);
        }
      }
      
      // Re-render dropdown
      renderAppSelectorDropdown();
    }
  } catch (err) {
    console.error('Failed to delete business', err);
    showToast('Failed to delete business', 'error');
  }
}
