// App Founder Growth Suite - Dashboard Module
import { state } from './state.js';
import { createSafeElement } from './common.js';

let activeDashChartMetric = 'mrr';

export function initDashboard() {
  const mrrBtn = document.getElementById('chart-mrr-btn');
  const dloadBtn = document.getElementById('chart-downloads-btn');
  
  if (mrrBtn) mrrBtn.addEventListener('click', () => toggleDashboardChart('mrr'));
  if (dloadBtn) dloadBtn.addEventListener('click', () => toggleDashboardChart('downloads'));
  
  state.on('appChanged', () => {
    if (state.currentActiveView === 'founder-dash') renderDashboard();
  });
  
  state.on('viewChanged', (viewId) => {
    if (viewId === 'founder-dash') renderDashboard();
  });
}

function toggleDashboardChart(metric) {
  activeDashChartMetric = metric;
  document.getElementById('chart-mrr-btn').classList.toggle('active', metric === 'mrr');
  document.getElementById('chart-downloads-btn').classList.toggle('active', metric === 'downloads');
  renderDashboardChart();
}

export function renderDashboard() {
  const app = state.appsData[state.currentActiveApp];
  if (!app) return;
  
  // Calculate Global Sums
  let totalMrr = 0, totalDownloads = 0, totalActive = 0, totalSubscribers = 0;
  
  Object.keys(state.appsData).forEach(key => {
    totalMrr += state.appsData[key].mrr;
    totalDownloads += state.appsData[key].downloads;
    totalActive += state.appsData[key].activeUsers;
    totalSubscribers += state.appsData[key].subscribers;
  });
  
  // Update UI Elements safely using textContent
  document.getElementById('global-mrr').textContent = `$${totalMrr.toLocaleString()}`;
  document.getElementById('global-downloads').textContent = totalDownloads.toLocaleString();
  document.getElementById('global-active').textContent = totalActive.toLocaleString();
  document.getElementById('global-subscribers').textContent = totalSubscribers.toLocaleString();
  
  document.getElementById('selected-detail-title').textContent = `${app.name} Overview`;
  document.getElementById('app-detail-rating').textContent = `${app.rating} ★`;
  document.getElementById('app-detail-conversion').textContent = app.conversionRate;
  document.getElementById('app-detail-growth').textContent = app.socialGrowth;
  
  // Render Daily Briefing safely
  const briefing = state.dbSchemaState && state.appsData[state.currentActiveApp]
    ? (state.appsData[state.currentActiveApp].copilotInsights || [])
    : [];
  
  const briefUsers = document.getElementById('brief-users');
  const briefEngagement = document.getElementById('brief-engagement');
  const briefCompetitor = document.getElementById('brief-competitor');
  const briefPriority = document.getElementById('brief-priority');
  
  if (briefUsers) briefUsers.textContent = app.socialGrowth + " Month-over-Month";
  if (briefEngagement) briefEngagement.textContent = app.conversionRate + " Conversion Rate";
  if (briefCompetitor) briefCompetitor.textContent = app.categoryRank;
  if (briefPriority) briefPriority.textContent = app.tagline;
  
  // Render portfolio comparisons lists
  const portfolioList = document.getElementById('portfolio-growth-list');
  portfolioList.innerHTML = '';
  
  Object.keys(state.appsData).forEach(key => {
    const item = state.appsData[key];
    
    const row = createSafeElement('div', ['portfolio-item-row']);
    row.style.background = 'rgba(255,255,255,0.02)';
    row.style.border = '1px solid var(--border-glass)';
    row.style.borderRadius = 'var(--radius-sm)';
    row.style.padding = '12px';
    row.style.display = 'flex';
    row.style.alignItems = 'center';
    row.style.justifyContent = 'space-between';
    row.style.marginBottom = '8px';
    
    const leftFlex = createSafeElement('div');
    leftFlex.style.display = 'flex';
    leftFlex.style.alignItems = 'center';
    leftFlex.style.gap = '10px';
    
    const dot = createSafeElement('span');
    dot.style.display = 'inline-block';
    dot.style.width = '10px';
    dot.style.height = '10px';
    dot.style.borderRadius = '50%';
    dot.style.background = item.logoColor;
    
    const details = createSafeElement('div');
    const nameEl = createSafeElement('div', [], item.name);
    nameEl.style.fontWeight = '600';
    nameEl.style.fontSize = '0.85rem';
    nameEl.style.color = 'white';
    
    const categoryEl = createSafeElement('div', [], item.category);
    categoryEl.style.fontSize = '0.75rem';
    categoryEl.style.color = 'var(--text-sub)';
    
    details.appendChild(nameEl);
    details.appendChild(categoryEl);
    leftFlex.appendChild(dot);
    leftFlex.appendChild(details);
    
    const rightFlex = createSafeElement('div');
    rightFlex.style.textAlign = 'right';
    
    const mrrEl = createSafeElement('div', [], `$${item.mrr.toLocaleString()} MRR`);
    mrrEl.style.fontWeight = '700';
    mrrEl.style.fontSize = '0.85rem';
    mrrEl.style.color = 'white';
    
    const growthEl = createSafeElement('div', [], `${item.socialGrowth} Growth`);
    growthEl.style.fontSize = '0.75rem';
    growthEl.style.color = 'var(--accent-green)';
    growthEl.style.fontWeight = '600';
    
    rightFlex.appendChild(mrrEl);
    rightFlex.appendChild(growthEl);
    
    row.appendChild(leftFlex);
    row.appendChild(rightFlex);
    portfolioList.appendChild(row);
  });
  
  renderDashboardChart();
}

function renderDashboardChart() {
  const container = document.getElementById('dashboard-bar-chart');
  if (!container) return;
  container.innerHTML = '';
  
  const app = state.appsData[state.currentActiveApp];
  if (!app) return;
  const history = app.analytics;
  const labels = history.months;
  const data = activeDashChartMetric === 'mrr' ? history.mrr : history.downloads;
  const maxVal = Math.max(...data) * 1.1;
  
  labels.forEach((month, idx) => {
    const value = data[idx];
    const heightPercentage = Math.round((value / maxVal) * 100);
    
    const barCol = createSafeElement('div', ['chart-bar-column']);
    const barFill = createSafeElement('div', ['chart-bar-fill']);
    barFill.style.height = `${heightPercentage}%`;
    barFill.style.background = app.logoColor;
    
    const tooltip = createSafeElement('div', ['chart-bar-tooltip'], `${activeDashChartMetric === 'mrr' ? '$' : ''}${value.toLocaleString()}`);
    barFill.appendChild(tooltip);
    
    const label = createSafeElement('div', ['chart-label'], month);
    
    barCol.appendChild(barFill);
    barCol.appendChild(label);
    container.appendChild(barCol);
  });
}
