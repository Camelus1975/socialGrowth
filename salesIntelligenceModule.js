import { state } from './state.js';
import { createSafeElement } from './common.js';

export function initSalesIntelligence() {
  state.on('viewChanged', (viewId) => {
    if (viewId === 'sales-intelligence') {
      renderSalesIntelligenceView();
    }
  });

  state.on('appChanged', () => {
    if (state.currentActiveView === 'sales-intelligence') {
      renderSalesIntelligenceView();
    }
  });
}

export function renderSalesIntelligenceView() {
  const container = document.getElementById('sales-pipeline-board');
  if (!container) return;
  
  container.innerHTML = '';
  
  const app = state.appsData[state.currentActiveApp];
  if (!app) {
    container.innerHTML = '<div class="mod-style-cGFkZGlu">Please select a business to view sales metrics.</div>';
    return;
  }
  
  // Create a grid for sales intelligence
  const grid = createSafeElement('div');
  grid.style.display = 'grid';
  grid.style.gridTemplateColumns = 'repeat(2, 1fr)';
  grid.style.gap = '24px';
  
  // Pipeline Conversion Funnel
  const funnelCard = createSafeElement('div');
  funnelCard.style.background = 'var(--bg-card)';
  funnelCard.style.border = '1px solid var(--border-glass)';
  funnelCard.style.padding = '20px';
  funnelCard.style.borderRadius = 'var(--radius-lg)';
  
  const funnelTitle = createSafeElement('h4', [], 'Pipeline Conversion Funnel');
  funnelTitle.style.color = 'white';
  funnelTitle.style.marginBottom = '20px';
  
  const funnelStats = [
    { stage: "Leads", count: 1240, conv: "100%" },
    { stage: "Qualified", count: 450, conv: "36%" },
    { stage: "Proposals", count: 120, conv: "26%" },
    { stage: "Won Deals", count: 45, conv: "37%" }
  ];
  
  funnelStats.forEach(stat => {
    const row = createSafeElement('div');
    row.style.display = 'flex';
    row.style.justifyContent = 'space-between';
    row.style.padding = '12px 0';
    row.style.borderBottom = '1px solid var(--border-glass)';
    
    const stageName = createSafeElement('span', [], stat.stage);
    stageName.style.color = 'var(--text-sub)';
    
    const statValues = createSafeElement('div');
    statValues.style.display = 'flex';
    statValues.style.gap = '15px';
    
    const countBadge = createSafeElement('span', [], stat.count.toString());
    countBadge.style.color = 'white';
    countBadge.style.fontWeight = 'bold';
    
    const convBadge = createSafeElement('span', [], stat.conv);
    convBadge.style.color = 'var(--accent-green)';
    
    statValues.appendChild(countBadge);
    statValues.appendChild(convBadge);
    
    row.appendChild(stageName);
    row.appendChild(statValues);
    funnelCard.appendChild(row);
  });
  
  // Forecast
  const forecastCard = createSafeElement('div');
  forecastCard.style.background = 'var(--bg-card)';
  forecastCard.style.border = '1px solid var(--border-glass)';
  forecastCard.style.padding = '20px';
  forecastCard.style.borderRadius = 'var(--radius-lg)';
  
  const forecastTitle = createSafeElement('h4', [], 'Q3 Revenue Forecast');
  forecastTitle.style.color = 'white';
  forecastTitle.style.marginBottom = '20px';
  
  const forecastValue = createSafeElement('div', [], '$48,500');
  forecastValue.style.fontSize = '2.5rem';
  forecastValue.style.fontWeight = 'bold';
  forecastValue.style.color = 'var(--accent-blue)';
  forecastValue.style.marginBottom = '10px';
  
  const forecastDesc = createSafeElement('p', [], 'Based on current pipeline velocity and historical 37% close rate.');
  forecastDesc.style.color = 'var(--text-sub)';
  forecastDesc.style.fontSize = '0.85rem';
  forecastDesc.style.lineHeight = '1.5';
  
  forecastCard.appendChild(funnelTitle);
  funnelCard.appendChild(forecastTitle); // bug fix in line below
  
  forecastCard.innerHTML = '';
  forecastCard.appendChild(forecastTitle);
  forecastCard.appendChild(forecastValue);
  forecastCard.appendChild(forecastDesc);
  
  grid.appendChild(funnelCard);
  grid.appendChild(forecastCard);
  
  container.appendChild(grid);
}
