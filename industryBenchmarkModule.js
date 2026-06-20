import { state } from './state.js';
import { createSafeElement } from './common.js';

export function initIndustryBenchmarks() {
  state.on('viewChanged', (viewId) => {
    if (viewId === 'industry-benchmarks') {
      renderBenchmarksView();
    }
  });

  state.on('appChanged', () => {
    if (state.currentActiveView === 'industry-benchmarks') {
      renderBenchmarksView();
    }
  });
}

export function renderBenchmarksView() {
  const container = document.getElementById('benchmarks-grid');
  if (!container) return;
  
  container.innerHTML = '';
  
  const app = state.appsData[state.currentActiveApp];
  if (!app) {
    container.innerHTML = '<div style="padding: 20px; color: var(--text-sub);">Please select a business to view Industry Benchmarks.</div>';
    return;
  }
  
  const type = app.type || 'SaaS';
  const industryTitle = createSafeElement('h4', [], `Comparing against Top 10% of ${type.toUpperCase()} Businesses`);
  industryTitle.style.color = 'white';
  industryTitle.style.marginBottom = '20px';
  container.appendChild(industryTitle);
  
  const grid = createSafeElement('div');
  grid.style.display = 'grid';
  grid.style.gridTemplateColumns = 'repeat(auto-fit, minmax(300px, 1fr))';
  grid.style.gap = '20px';
  
  const benchmarks = [
    { name: 'Customer Acquisition Cost (CAC)', yourValue: '$120', indValue: '$150', status: 'better' },
    { name: 'Lifetime Value (LTV)', yourValue: '$1,200', indValue: '$900', status: 'better' },
    { name: 'Monthly Churn Rate', yourValue: '4.5%', indValue: '3.0%', status: 'worse' },
    { name: 'Lead Conversion Rate', yourValue: '12%', indValue: '8%', status: 'better' },
    { name: 'Average Deal Size', yourValue: '$300', indValue: '$350', status: 'worse' },
    { name: 'Sales Cycle Length', yourValue: '14 days', indValue: '21 days', status: 'better' }
  ];
  
  benchmarks.forEach(b => {
    const card = createSafeElement('div');
    card.style.background = 'var(--bg-card)';
    card.style.border = '1px solid var(--border-glass)';
    card.style.borderRadius = 'var(--radius-lg)';
    card.style.padding = '20px';
    
    const header = createSafeElement('div');
    header.style.display = 'flex';
    header.style.justifyContent = 'space-between';
    header.style.marginBottom = '16px';
    
    const title = createSafeElement('div', [], b.name);
    title.style.color = 'var(--text-muted)';
    title.style.fontWeight = '600';
    
    const statusBadge = createSafeElement('span', [], b.status === 'better' ? 'Top 10%' : 'Below Avg');
    statusBadge.style.fontSize = '0.75rem';
    statusBadge.style.padding = '4px 8px';
    statusBadge.style.borderRadius = '12px';
    statusBadge.style.background = b.status === 'better' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)';
    statusBadge.style.color = b.status === 'better' ? 'var(--accent-green)' : '#ef4444';
    
    header.appendChild(title);
    header.appendChild(statusBadge);
    
    const vsContainer = createSafeElement('div');
    vsContainer.style.display = 'flex';
    vsContainer.style.alignItems = 'center';
    vsContainer.style.gap = '20px';
    
    const yourDiv = createSafeElement('div');
    const yourLabel = createSafeElement('div', [], 'You');
    yourLabel.style.fontSize = '0.8rem';
    yourLabel.style.color = 'var(--text-sub)';
    const yourVal = createSafeElement('div', [], b.yourValue);
    yourVal.style.fontSize = '1.5rem';
    yourVal.style.color = 'white';
    yourVal.style.fontWeight = 'bold';
    yourDiv.appendChild(yourLabel);
    yourDiv.appendChild(yourVal);
    
    const indDiv = createSafeElement('div');
    const indLabel = createSafeElement('div', [], 'Industry Avg');
    indLabel.style.fontSize = '0.8rem';
    indLabel.style.color = 'var(--text-sub)';
    const indVal = createSafeElement('div', [], b.indValue);
    indVal.style.fontSize = '1.5rem';
    indVal.style.color = 'var(--text-muted)';
    indDiv.appendChild(indLabel);
    indDiv.appendChild(indVal);
    
    vsContainer.appendChild(yourDiv);
    vsContainer.appendChild(indDiv);
    
    card.appendChild(header);
    card.appendChild(vsContainer);
    grid.appendChild(card);
  });
  
  container.appendChild(grid);
}
