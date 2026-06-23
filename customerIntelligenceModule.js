import { state } from './state.js';
import { createSafeElement } from './common.js';

export function initCustomerIntelligence() {
  state.on('viewChanged', (viewId) => {
    if (viewId === 'customer-intelligence') {
      renderCustomerIntelligenceView();
    }
  });

  state.on('appChanged', () => {
    if (state.currentActiveView === 'customer-intelligence') {
      renderCustomerIntelligenceView();
    }
  });
}

export function renderCustomerIntelligenceView() {
  const container = document.getElementById('customer-intelligence-container');
  if (!container) return;
  
  container.innerHTML = '';
  
  const app = state.appsData[state.currentActiveApp];
  if (!app) {
    container.innerHTML = '<div class="mod-style-cGFkZGlu">Please select a business to view customer intelligence.</div>';
    return;
  }
  
  // Create a grid layout
  const grid = createSafeElement('div');
  grid.style.display = 'grid';
  grid.style.gridTemplateColumns = 'repeat(2, 1fr)';
  grid.style.gap = '24px';
  
  // 1. Voice of Customer / Sentiment Analysis
  const sentimentCard = createSafeElement('div');
  sentimentCard.style.background = 'var(--bg-card)';
  sentimentCard.style.border = '1px solid var(--border-glass)';
  sentimentCard.style.padding = '20px';
  sentimentCard.style.borderRadius = 'var(--radius-lg)';
  
  const sentimentTitle = createSafeElement('h4', [], 'Voice of Customer (Sentiment)');
  sentimentTitle.style.color = 'white';
  sentimentTitle.style.marginBottom = '20px';
  
  const sentimentStats = createSafeElement('div');
  sentimentStats.style.display = 'flex';
  sentimentStats.style.gap = '20px';
  sentimentStats.style.marginBottom = '20px';
  
  const positive = createSafeElement('div');
  positive.innerHTML = '<span class="mod-style-Y29sb3I6">78%</span><br/><span class="mod-style-Y29sb3I6">Positive</span>';
  
  const neutral = createSafeElement('div');
  neutral.innerHTML = '<span class="mod-style-Y29sb3I6">15%</span><br/><span class="mod-style-Y29sb3I6">Neutral</span>';
  
  const negative = createSafeElement('div');
  negative.innerHTML = '<span class="mod-style-Y29sb3I6">7%</span><br/><span class="mod-style-Y29sb3I6">Negative</span>';
  
  sentimentStats.appendChild(positive);
  sentimentStats.appendChild(neutral);
  sentimentStats.appendChild(negative);
  
  // Common Pain points
  const painPointsTitle = createSafeElement('h5', [], 'Identified Pain Points');
  painPointsTitle.style.color = 'var(--text-muted)';
  painPointsTitle.style.marginBottom = '10px';
  
  const painPointsList = createSafeElement('ul');
  painPointsList.style.paddingLeft = '20px';
  painPointsList.style.color = 'white';
  painPointsList.style.fontSize = '0.9rem';
  
  ['Onboarding friction for non-technical users', 'Missing zapier integration', 'Pricing confusion on Pro tier'].forEach(p => {
    const li = createSafeElement('li', [], p);
    li.style.marginBottom = '8px';
    painPointsList.appendChild(li);
  });
  
  sentimentCard.appendChild(sentimentTitle);
  sentimentCard.appendChild(sentimentStats);
  sentimentCard.appendChild(painPointsTitle);
  sentimentCard.appendChild(painPointsList);
  
  // 2. Churn Risk Predictions
  const churnCard = createSafeElement('div');
  churnCard.style.background = 'var(--bg-card)';
  churnCard.style.border = '1px solid var(--border-glass)';
  churnCard.style.padding = '20px';
  churnCard.style.borderRadius = 'var(--radius-lg)';
  
  const churnTitle = createSafeElement('h4', [], 'AI Churn Risk Alerts');
  churnTitle.style.color = 'white';
  churnTitle.style.marginBottom = '20px';
  
  const churnList = [
    { client: "Acme Corp", reason: "Low platform usage last 14 days", risk: "High", color: "var(--accent-red)" },
    { client: "TechFlow", reason: "Multiple support tickets regarding billing", risk: "Medium", color: "var(--accent-purple)" },
    { client: "Global Industries", reason: "Champion sponsor left company", risk: "High", color: "var(--accent-red)" }
  ];
  
  churnList.forEach(c => {
    const row = createSafeElement('div');
    row.style.background = 'rgba(255,255,255,0.02)';
    row.style.padding = '12px';
    row.style.borderRadius = '6px';
    row.style.marginBottom = '10px';
    row.style.borderLeft = `3px solid ${c.color}`;
    
    const clientName = createSafeElement('strong', [], c.client);
    clientName.style.color = 'white';
    clientName.style.display = 'block';
    
    const reason = createSafeElement('span', [], c.reason);
    reason.style.color = 'var(--text-sub)';
    reason.style.fontSize = '0.85rem';
    
    row.appendChild(clientName);
    row.appendChild(reason);
    churnCard.appendChild(row);
  });
  
  grid.appendChild(sentimentCard);
  grid.appendChild(churnCard);
  container.appendChild(grid);
}
