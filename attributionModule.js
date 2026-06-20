import { state } from './state.js';
import { createSafeElement } from './common.js';

export function initAttributionEngine() {
  state.on('viewChanged', (viewId) => {
    if (viewId === 'attribution-engine') {
      renderAttributionView();
    }
  });

  state.on('appChanged', () => {
    if (state.currentActiveView === 'attribution-engine') {
      renderAttributionView();
    }
  });
}

export function renderAttributionView() {
  const container = document.getElementById('attribution-funnel');
  if (!container) return;
  
  container.innerHTML = '';
  
  const app = state.appsData[state.currentActiveApp];
  if (!app) {
    container.innerHTML = '<div style="padding: 20px; color: var(--text-sub);">Please select a business to view attribution metrics.</div>';
    return;
  }
  
  // Marketing ROI & Attribution Layout
  const wrapper = createSafeElement('div');
  wrapper.style.display = 'flex';
  wrapper.style.flexDirection = 'column';
  wrapper.style.gap = '24px';
  
  const headerCard = createSafeElement('div');
  headerCard.style.background = 'var(--bg-card)';
  headerCard.style.border = '1px solid var(--border-glass)';
  headerCard.style.padding = '20px';
  headerCard.style.borderRadius = 'var(--radius-lg)';
  headerCard.style.display = 'flex';
  headerCard.style.justifyContent = 'space-between';
  headerCard.style.alignItems = 'center';
  
  const title = createSafeElement('h4', [], 'Multi-Touch Attribution (Last 30 Days)');
  title.style.color = 'white';
  title.style.margin = '0';
  
  const totalRevenue = createSafeElement('div');
  totalRevenue.innerHTML = '<span style="color:var(--text-sub);font-size:0.8rem;margin-right:10px;">Attributed Revenue</span><span style="color:var(--accent-green);font-size:1.5rem;font-weight:bold;">$34,500</span>';
  
  headerCard.appendChild(title);
  headerCard.appendChild(totalRevenue);
  wrapper.appendChild(headerCard);
  
  // Channels Table
  const channelsCard = createSafeElement('div');
  channelsCard.style.background = 'var(--bg-card)';
  channelsCard.style.border = '1px solid var(--border-glass)';
  channelsCard.style.padding = '20px';
  channelsCard.style.borderRadius = 'var(--radius-lg)';
  
  const table = createSafeElement('table', ['competitor-table']);
  table.style.width = '100%';
  table.style.textAlign = 'left';
  table.style.borderCollapse = 'collapse';
  
  const thead = createSafeElement('thead');
  const trHead = createSafeElement('tr');
  trHead.style.borderBottom = '1px solid var(--border-glass)';
  ['Channel', 'Spend', 'Leads', 'Customers', 'Revenue', 'ROAS'].forEach(t => {
    const th = createSafeElement('th', [], t);
    th.style.padding = '12px 8px';
    th.style.color = 'var(--text-sub)';
    th.style.fontWeight = '600';
    trHead.appendChild(th);
  });
  thead.appendChild(trHead);
  
  const tbody = createSafeElement('tbody');
  
  const channelData = [
    { name: 'Google Ads (Search)', spend: '$1,200', leads: 45, customers: 12, revenue: '$14,400', roas: '12.0x', color: '#4285F4' },
    { name: 'Facebook Ads', spend: '$800', leads: 60, customers: 8, revenue: '$9,600', roas: '12.0x', color: '#1877F2' },
    { name: 'Organic Social (LinkedIn)', spend: '$0', leads: 25, customers: 5, revenue: '$6,000', roas: '∞', color: '#0A66C2' },
    { name: 'Email Marketing', spend: '$50', leads: '-', customers: 3, revenue: '$4,500', roas: '90.0x', color: 'var(--accent-purple)' }
  ];
  
  channelData.forEach(c => {
    const tr = createSafeElement('tr');
    tr.style.borderBottom = '1px solid rgba(255,255,255,0.05)';
    
    const tdName = createSafeElement('td', [], c.name);
    tdName.style.padding = '12px 8px';
    tdName.style.color = 'white';
    tdName.style.fontWeight = '500';
    
    const tdSpend = createSafeElement('td', [], c.spend);
    tdSpend.style.padding = '12px 8px';
    tdSpend.style.color = 'var(--text-muted)';
    
    const tdLeads = createSafeElement('td', [], c.leads.toString());
    tdLeads.style.padding = '12px 8px';
    tdLeads.style.color = 'white';
    
    const tdCustomers = createSafeElement('td', [], c.customers.toString());
    tdCustomers.style.padding = '12px 8px';
    tdCustomers.style.color = 'white';
    
    const tdRevenue = createSafeElement('td', [], c.revenue);
    tdRevenue.style.padding = '12px 8px';
    tdRevenue.style.color = 'var(--accent-green)';
    tdRevenue.style.fontWeight = 'bold';
    
    const tdRoas = createSafeElement('td', [], c.roas);
    tdRoas.style.padding = '12px 8px';
    tdRoas.style.color = c.color;
    tdRoas.style.fontWeight = 'bold';
    
    tr.appendChild(tdName);
    tr.appendChild(tdSpend);
    tr.appendChild(tdLeads);
    tr.appendChild(tdCustomers);
    tr.appendChild(tdRevenue);
    tr.appendChild(tdRoas);
    
    tbody.appendChild(tr);
  });
  
  table.appendChild(thead);
  table.appendChild(tbody);
  channelsCard.appendChild(table);
  wrapper.appendChild(channelsCard);
  
  container.appendChild(wrapper);
}
