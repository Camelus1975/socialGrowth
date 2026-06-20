import { state } from './state.js';
import { createSafeElement } from './common.js';

export function initRevenueIntelligence() {
  state.on('viewChanged', (viewId) => {
    if (viewId === 'revenue-intelligence') {
      renderRevenueIntelligenceView();
    }
  });

  state.on('appChanged', () => {
    if (state.currentActiveView === 'revenue-intelligence') {
      renderRevenueIntelligenceView();
    }
  });
}

export function renderRevenueIntelligenceView() {
  const container = document.getElementById('revenue-kpi-grid');
  if (!container) return;
  
  container.innerHTML = '';
  
  // Cleanup previously added graph container if it exists
  const parent = container.parentNode;
  const existingGraph = parent.querySelector('.revenue-graph-placeholder');
  if (existingGraph) {
    existingGraph.remove();
  }
  
  const app = state.appsData[state.currentActiveApp];
  if (!app) {
    container.innerHTML = '<div style="padding: 20px; color: var(--text-sub);">Please select a business to view revenue metrics.</div>';
    return;
  }
  
  // Simulated Revenue KPIs
  const kpis = [
    { label: "Total MRR", value: "$12,450", trend: "+12.4%", color: "var(--accent-green)" },
    { label: "Customer Acquisition Cost (CAC)", value: "$45", trend: "-2.1%", color: "var(--accent)" },
    { label: "Lifetime Value (LTV)", value: "$1,200", trend: "+5.0%", color: "var(--accent-blue)" },
    { label: "Return on Ad Spend (ROAS)", value: "3.4x", trend: "+0.2x", color: "var(--accent-purple)" }
  ];
  
  kpis.forEach(kpi => {
    const card = createSafeElement('div', ['kpi-card']);
    card.style.background = 'var(--bg-card)';
    card.style.border = '1px solid var(--border-glass)';
    card.style.padding = '20px';
    card.style.borderRadius = 'var(--radius-lg)';
    
    const label = createSafeElement('div', [], kpi.label);
    label.style.color = 'var(--text-sub)';
    label.style.fontSize = '0.9rem';
    label.style.marginBottom = '10px';
    
    const value = createSafeElement('div', [], kpi.value);
    value.style.fontSize = '2rem';
    value.style.fontWeight = 'bold';
    value.style.color = 'white';
    value.style.marginBottom = '5px';
    
    const trend = createSafeElement('div', [], kpi.trend);
    trend.style.color = kpi.color;
    trend.style.fontSize = '0.85rem';
    trend.style.fontWeight = '600';
    
    card.appendChild(label);
    card.appendChild(value);
    card.appendChild(trend);
    container.appendChild(card);
  });
  
  // Add a placeholder graph area
  const graphContainer = createSafeElement('div', ['revenue-graph-placeholder']);
  graphContainer.style.marginTop = '30px';
  graphContainer.style.background = 'var(--bg-card)';
  graphContainer.style.border = '1px solid var(--border-glass)';
  graphContainer.style.padding = '20px';
  graphContainer.style.borderRadius = 'var(--radius-lg)';
  graphContainer.style.height = '300px';
  graphContainer.style.display = 'flex';
  graphContainer.style.alignItems = 'center';
  graphContainer.style.justifyContent = 'center';
  graphContainer.style.color = 'var(--text-sub)';
  graphContainer.innerText = '[Revenue Growth Graph Rendered Here]';
  
  container.parentNode.appendChild(graphContainer);
}
