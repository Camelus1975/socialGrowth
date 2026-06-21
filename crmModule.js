// Universal CRM Module for Business Growth OS
import { state } from './state.js';
import { createSafeElement, showToast } from './common.js';
import { getTemplateForBusiness } from './industryTemplates.js';
import { getSupabaseClient } from './auth.js';

let currentMockLeads = [];

export function initUniversalCRM() {
  state.on('viewChanged', (viewId) => {
    if (viewId === 'universal-crm') {
      loadLeadsFromSupabase(state.currentActiveApp);
    }
  });

  state.on('appChanged', () => {
    if (state.currentActiveView === 'universal-crm') {
      loadLeadsFromSupabase(state.currentActiveApp);
    }
  });
  
  // Initial load if already on the tab
  if (state.currentActiveView === 'universal-crm') {
    loadLeadsFromSupabase(state.currentActiveApp);
  }
}

async function loadLeadsFromSupabase(appId) {
  if (!appId) return;
  const supabase = getSupabaseClient();
  if (!supabase) return;

  try {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('app_id', appId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    if (!data || data.length === 0) {
      // Auto-seed mock leads for a better UX when it's empty
      const app = state.appsData[appId];
      if (app) {
        const mockData = getMockLeads(app.businessType).map(m => ({
          app_id: appId,
          name: m.name,
          detail: m.detail,
          stage: m.stage,
          value: m.value
        }));
        
        const { data: inserted, error: insertError } = await supabase
          .from('customers')
          .insert(mockData)
          .select();
          
        if (!insertError && inserted) {
          currentMockLeads = inserted;
        } else {
           currentMockLeads = [];
        }
      }
    } else {
      currentMockLeads = data;
    }
    
    renderCRMView();
  } catch (err) {
    console.error('Failed to load leads from Supabase, falling back to local mocks', err);
    // Graceful fallback for the prototype if the SQL migration hasn't been run
    const app = state.appsData[appId];
    if (app) {
      currentMockLeads = getMockLeads(app.businessType);
    }
    renderCRMView();
  }
}

function getMockLeads(businessType) {
  if (businessType === 'restaurant') {
    return [
      { id: 'lead_1', name: "John Doe", detail: "Party of 4", stage: "Lead", value: 120 },
      { id: 'lead_2', name: "Sarah Smith", detail: "Anniversary Dinner", stage: "Reservation Made", value: 150 },
      { id: 'lead_3', name: "Mike Johnson", detail: "Corporate Lunch", stage: "Dined", value: 450 }
    ];
  } else if (businessType === 'dental') {
    return [
      { id: 'lead_1', name: "Emily Clark", detail: "Teeth Whitening", stage: "Lead", value: 200 },
      { id: 'lead_2', name: "James Wilson", detail: "Invisalign Consult", stage: "Consultation Booked", value: 3500 },
      { id: 'lead_3', name: "Linda Davis", detail: "Root Canal", stage: "Treatment Accepted", value: 1200 }
    ];
  } else if (businessType === 'ecommerce') {
     return [
      { id: 'lead_1', name: "Alex Brown", detail: "Cart: Sneakers", stage: "Abandoned Cart", value: 130 },
      { id: 'lead_2', name: "Sam Taylor", detail: "Order #4592", stage: "Purchased", value: 45 },
      { id: 'lead_3', name: "Jordan Lee", detail: "Order #4421, #4599", stage: "Repeat Customer", value: 210 }
    ];
  } else {
    return [
      { id: 'lead_1', name: "Acme Corp", detail: "Enterprise Plan", stage: "Lead", value: 5000 },
      { id: 'lead_2', name: "TechStart Inc", detail: "Pro Plan", stage: "Trial", value: 299 },
      { id: 'lead_3', name: "Global Solutions", detail: "Pro Plan (Annual)", stage: "Customer", value: 3000 }
    ];
  }
}

function handleDragStart(e, leadId) {
  e.dataTransfer.setData('text/plain', leadId);
  e.dataTransfer.effectAllowed = 'move';
  setTimeout(() => {
    e.target.style.opacity = '0.5';
  }, 0);
}

function handleDragEnd(e) {
  e.target.style.opacity = '1';
  document.querySelectorAll('.crm-stage-col').forEach(col => {
    col.style.border = '1px solid var(--border-glass)';
  });
}

function handleDragOver(e) {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
  const col = e.target.closest('.crm-stage-col');
  if (col) {
    col.style.border = '1px dashed var(--accent)';
  }
}

function handleDragLeave(e) {
  const col = e.target.closest('.crm-stage-col');
  if (col) {
    col.style.border = '1px solid var(--border-glass)';
  }
}

async function handleDrop(e, targetStage) {
  e.preventDefault();
  const col = e.target.closest('.crm-stage-col');
  if (col) {
    col.style.border = '1px solid var(--border-glass)';
  }
  
  const leadId = e.dataTransfer.getData('text/plain');
  const leadIndex = currentMockLeads.findIndex(l => String(l.id) === String(leadId));
  
  if (leadIndex > -1 && currentMockLeads[leadIndex].stage !== targetStage) {
    currentMockLeads[leadIndex].stage = targetStage;
    showToast(`Moved ${currentMockLeads[leadIndex].name} to ${targetStage}`, "success");
    renderCRMView(); // Optimistic UI update
    
    // Save to DB
    const supabase = getSupabaseClient();
    if (supabase) {
      await supabase.from('customers').update({ stage: targetStage }).eq('id', leadId);
    }
  }
}

export function renderCRMView() {
  const container = document.getElementById('view-universal-crm');
  if (!container) return;
  
  container.innerHTML = '';
  
  const app = state.appsData[state.currentActiveApp];
  if (!app) {
    container.innerHTML = '<div style="padding: 20px; color: var(--text-sub);">Please select a business to view the CRM.</div>';
    return;
  }
  
  const template = getTemplateForBusiness(app.businessType);
  const stages = template.crmStages || ["Lead", "Negotiation", "Closed Won", "Closed Lost"];
  
  // Header
  const header = createSafeElement('div');
  header.style.display = 'flex';
  header.style.justifyContent = 'space-between';
  header.style.alignItems = 'center';
  header.style.marginBottom = '20px';
  
  const title = createSafeElement('h2', [], `CRM & Pipeline (${app.name})`);
  title.style.color = 'white';
  
  const addBtn = createSafeElement('button', ['btn', 'btn-primary'], '+ Add Contact');
  addBtn.onclick = async () => {
    const name = prompt("Enter customer name:");
    if (!name) return;
    const detail = prompt("Enter customer details (optional):") || "";
    
    const supabase = getSupabaseClient();
    if (!supabase) return;
    
    const newLead = {
      app_id: app.business_id,
      name,
      detail,
      stage: stages[0],
      value: 0
    };
    
    showToast("Adding contact...", "info");
    
    const { data, error } = await supabase.from('customers').insert([newLead]).select();
    if (!error && data) {
      currentMockLeads.push(data[0]);
      renderCRMView();
      showToast("Contact added successfully!", "success");
    } else {
      showToast("Failed to add contact", "error");
    }
  };
  
  header.appendChild(title);
  header.appendChild(addBtn);
  container.appendChild(header);
  
  // Kanban Board Container
  const board = createSafeElement('div');
  board.style.display = 'flex';
  board.style.gap = '20px';
  board.style.overflowX = 'auto';
  board.style.paddingBottom = '20px';
  board.style.minHeight = '60vh';
  
  stages.forEach(stageName => {
    const col = createSafeElement('div', ['crm-stage-col']);
    col.style.flex = '1';
    col.style.minWidth = '300px';
    col.style.background = 'var(--bg-card)';
    col.style.border = '1px solid var(--border-glass)';
    col.style.borderRadius = 'var(--radius-lg)';
    col.style.padding = '15px';
    col.style.display = 'flex';
    col.style.flexDirection = 'column';
    col.dataset.stage = stageName;
    
    // Setup Drag/Drop Events for Column
    col.addEventListener('dragover', handleDragOver);
    col.addEventListener('dragleave', handleDragLeave);
    col.addEventListener('drop', (e) => handleDrop(e, stageName));
    
    // Column Header
    const colHeader = createSafeElement('div');
    colHeader.style.display = 'flex';
    colHeader.style.justifyContent = 'space-between';
    colHeader.style.marginBottom = '15px';
    colHeader.style.borderBottom = '1px solid var(--border-glass)';
    colHeader.style.paddingBottom = '10px';
    
    const stageTitle = createSafeElement('h4', [], stageName);
    stageTitle.style.color = 'white';
    stageTitle.style.margin = '0';
    
    const stageLeads = currentMockLeads.filter(l => l.stage === stageName);
    const stageValue = stageLeads.reduce((sum, l) => sum + l.value, 0);
    
    const countBadge = createSafeElement('span', [], `${stageLeads.length} ($${stageValue.toLocaleString()})`);
    countBadge.style.background = 'var(--bg-dark)';
    countBadge.style.padding = '2px 8px';
    countBadge.style.borderRadius = '12px';
    countBadge.style.fontSize = '0.8rem';
    countBadge.style.color = 'var(--text-sub)';
    
    colHeader.appendChild(stageTitle);
    colHeader.appendChild(countBadge);
    col.appendChild(colHeader);
    
    // Cards Container
    const cardsContainer = createSafeElement('div');
    cardsContainer.style.flex = '1';
    cardsContainer.style.minHeight = '50px'; // allow drop target even if empty
    
    // Render Cards
    stageLeads.forEach(lead => {
      const card = createSafeElement('div', ['crm-card']);
      card.draggable = true;
      card.style.background = 'rgba(255,255,255,0.03)';
      card.style.border = '1px solid rgba(255,255,255,0.1)';
      card.style.padding = '12px';
      card.style.borderRadius = 'var(--radius-sm)';
      card.style.marginBottom = '10px';
      card.style.cursor = 'grab';
      card.style.transition = 'opacity 0.2s, transform 0.2s';
      card.dataset.id = lead.id;
      
      card.addEventListener('dragstart', (e) => handleDragStart(e, lead.id));
      card.addEventListener('dragend', handleDragEnd);
      
      const leadName = createSafeElement('div', [], lead.name);
      leadName.style.fontWeight = '600';
      leadName.style.color = 'white';
      leadName.style.marginBottom = '5px';
      
      const leadDetail = createSafeElement('div', [], lead.detail);
      leadDetail.style.fontSize = '0.8rem';
      leadDetail.style.color = 'var(--text-sub)';
      leadDetail.style.marginBottom = '10px';
      
      const valBadge = createSafeElement('div', [], `$${lead.value.toLocaleString()}`);
      valBadge.style.display = 'inline-block';
      valBadge.style.background = 'rgba(34, 197, 94, 0.1)';
      valBadge.style.color = 'var(--accent-green)';
      valBadge.style.padding = '2px 6px';
      valBadge.style.borderRadius = '4px';
      valBadge.style.fontSize = '0.75rem';
      valBadge.style.fontWeight = 'bold';
      
      card.appendChild(leadName);
      card.appendChild(leadDetail);
      card.appendChild(valBadge);
      cardsContainer.appendChild(card);
    });
    
    col.appendChild(cardsContainer);
    board.appendChild(col);
  });
  
  container.appendChild(board);
}
