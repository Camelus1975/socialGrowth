// Universal CRM Module for Business Growth OS
import { state } from './state.js';
import { createSafeElement } from './common.js';
import { getTemplateForBusiness } from './industryTemplates.js';

export function initUniversalCRM() {
  state.on('viewChanged', (viewId) => {
    if (viewId === 'universal-crm') {
      renderCRMView();
    }
  });

  state.on('appChanged', () => {
    if (state.currentActiveView === 'universal-crm') {
      renderCRMView();
    }
  });
}

function getMockLeads(businessType) {
  // Generate some realistic looking mock leads based on business type
  if (businessType === 'restaurant') {
    return [
      { id: 1, name: "John Doe", detail: "Party of 4", stage: "Lead", value: 120 },
      { id: 2, name: "Sarah Smith", detail: "Anniversary Dinner", stage: "Reservation Made", value: 150 },
      { id: 3, name: "Mike Johnson", detail: "Corporate Lunch", stage: "Dined", value: 450 }
    ];
  } else if (businessType === 'dental') {
    return [
      { id: 1, name: "Emily Clark", detail: "Teeth Whitening", stage: "Lead", value: 200 },
      { id: 2, name: "James Wilson", detail: "Invisalign Consult", stage: "Consultation Booked", value: 3500 },
      { id: 3, name: "Linda Davis", detail: "Root Canal", stage: "Treatment Accepted", value: 1200 }
    ];
  } else if (businessType === 'ecommerce') {
     return [
      { id: 1, name: "Alex Brown", detail: "Cart: Sneakers", stage: "Abandoned Cart", value: 130 },
      { id: 2, name: "Sam Taylor", detail: "Order #4592", stage: "Purchased", value: 45 },
      { id: 3, name: "Jordan Lee", detail: "Order #4421, #4599", stage: "Repeat Customer", value: 210 }
    ];
  } else {
    // Default / SaaS
    return [
      { id: 1, name: "Acme Corp", detail: "Enterprise Plan", stage: "Lead", value: 5000 },
      { id: 2, name: "TechStart Inc", detail: "Pro Plan", stage: "Trial", value: 299 },
      { id: 3, name: "Global Solutions", detail: "Pro Plan (Annual)", stage: "Customer", value: 3000 }
    ];
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
  const stages = template.crmStages;
  const mockLeads = getMockLeads(app.businessType);
  
  // Header
  const header = createSafeElement('div');
  header.style.display = 'flex';
  header.style.justifyContent = 'space-between';
  header.style.alignItems = 'center';
  header.style.marginBottom = '20px';
  
  const title = createSafeElement('h2', [], `CRM & Pipeline (${app.name})`);
  title.style.color = 'white';
  
  const addBtn = createSafeElement('button', ['btn', 'btn-primary'], '+ Add Contact');
  
  header.appendChild(title);
  header.appendChild(addBtn);
  container.appendChild(header);
  
  // Kanban Board Container
  const board = createSafeElement('div');
  board.style.display = 'flex';
  board.style.gap = '20px';
  board.style.overflowX = 'auto';
  board.style.paddingBottom = '20px';
  
  stages.forEach(stageName => {
    const col = createSafeElement('div');
    col.style.flex = '1';
    col.style.minWidth = '300px';
    col.style.background = 'var(--bg-card)';
    col.style.border = '1px solid var(--border-glass)';
    col.style.borderRadius = 'var(--radius-lg)';
    col.style.padding = '15px';
    
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
    
    const stageLeads = mockLeads.filter(l => l.stage === stageName);
    const countBadge = createSafeElement('span', [], stageLeads.length.toString());
    countBadge.style.background = 'var(--bg-dark)';
    countBadge.style.padding = '2px 8px';
    countBadge.style.borderRadius = '12px';
    countBadge.style.fontSize = '0.8rem';
    countBadge.style.color = 'var(--text-sub)';
    
    colHeader.appendChild(stageTitle);
    colHeader.appendChild(countBadge);
    col.appendChild(colHeader);
    
    // Render Cards
    stageLeads.forEach(lead => {
      const card = createSafeElement('div');
      card.style.background = 'rgba(255,255,255,0.03)';
      card.style.border = '1px solid rgba(255,255,255,0.1)';
      card.style.padding = '12px';
      card.style.borderRadius = 'var(--radius-sm)';
      card.style.marginBottom = '10px';
      card.style.cursor = 'grab';
      
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
      col.appendChild(card);
    });
    
    board.appendChild(col);
  });
  
  container.appendChild(board);
}
