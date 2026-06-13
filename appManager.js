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
    // Use onclick directly to bypass data-on-click which requires global scope
    div.onclick = () => selectActiveApp(app.id);
    
    div.innerHTML = `
      <span class="app-dot" style="background: ${app.logoColor || '#666'}; width: 8px; height: 8px; border-radius: 50%; margin-right: 8px;"></span>
      ${app.name} <span style="opacity: 0.6; font-size: 0.8em; margin-left: 4px;">(${app.category || 'App'})</span>
    `;
    
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
