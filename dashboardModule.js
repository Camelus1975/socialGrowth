// Business Growth OS - Dashboard Module
import { state } from './state.js';
import { createSafeElement } from './common.js';

import { getTemplateForBusiness, formatMetric } from './industryTemplates.js';

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
    if (viewId === 'war-room') renderWarRoom();
  });
}

function toggleDashboardChart(metric) {
  activeDashChartMetric = metric;
  document.getElementById('chart-mrr-btn')?.classList.toggle('active', metric === 'mrr');
  document.getElementById('chart-downloads-btn')?.classList.toggle('active', metric === 'downloads');
  renderDashboardChart();
}

export function renderDashboard() {
  const app = state.appsData[state.currentActiveApp];
  
  // Update Dashboard main title based on context
  if (app) {
     document.getElementById('dashboard-main-title').textContent = `${app.name} Performance`;
  } else {
     document.getElementById('dashboard-main-title').textContent = `Global Portfolio Performance`;
  }
  
  const template = getTemplateForBusiness(app ? app.businessType : 'generic');
  
  // Calculate Sums based on Template KPIs
  template.kpis.forEach((kpi, index) => {
    let totalValue = 0;
    
    if (app) {
       // Single business view
       const historyArray = app.metrics[kpi.id] || [];
       totalValue = historyArray.length > 0 ? historyArray[historyArray.length - 1] : 0;
    } else {
       // Global view
       Object.keys(state.appsData).forEach(key => {
         const business = state.appsData[key];
         if (business.metrics && business.metrics[kpi.id]) {
           const historyArray = business.metrics[kpi.id];
           totalValue += historyArray.length > 0 ? historyArray[historyArray.length - 1] : 0;
         }
       });
    }
    
    // Update the UI card dynamically
    const titleEl = document.getElementById(`kpi-title-${index + 1}`);
    const valueEl = document.getElementById(`kpi-value-${index + 1}`);
    
    if (titleEl && valueEl) {
      titleEl.textContent = kpi.label;
      valueEl.textContent = formatMetric(totalValue, kpi.format);
    }
  });
  
  if (!app) {
    document.getElementById('selected-detail-title').textContent = `No Business Selected`;
    document.getElementById('app-detail-rating').textContent = `-`;
    document.getElementById('app-detail-conversion').textContent = `-`;
    document.getElementById('app-detail-growth').textContent = `-`;
    document.getElementById('health-gauge-text').textContent = `--`;
    
    // Clear recommendations
    document.getElementById('brief-users').textContent = "Select a business to view recommendations.";
    document.getElementById('brief-engagement').textContent = "-";
    document.getElementById('brief-competitor').textContent = "-";
    document.getElementById('brief-priority').textContent = "-";
    return;
  }
  
  document.getElementById('selected-detail-title').textContent = `${app.name} Overview`;
  document.getElementById('app-detail-rating').textContent = `${app.rating} ★`;
  document.getElementById('app-detail-conversion').textContent = app.conversionRate;
  document.getElementById('app-detail-growth').textContent = app.socialGrowth;
  
  // Fake health score for MVP
  const healthScore = Math.floor(Math.random() * 20) + 75; // 75-95
  document.getElementById('health-gauge-text').textContent = healthScore;
  const healthPath = document.getElementById('health-gauge-path');
  if (healthPath) healthPath.setAttribute('stroke-dasharray', `${healthScore}, 100`);
  
  // Render AI Recommendations safely
  const briefUsers = document.getElementById('brief-users');
  const briefEngagement = document.getElementById('brief-engagement');
  const briefCompetitor = document.getElementById('brief-competitor');
  const briefPriority = document.getElementById('brief-priority');
  
  if (briefUsers) briefUsers.textContent = "Lead volume is up 12% via LinkedIn automation.";
  if (briefEngagement) briefEngagement.textContent = "Close rate has dropped to 18%. Action required.";
  if (briefCompetitor) briefCompetitor.textContent = "3 new negative reviews detected on Google.";
  if (briefPriority) briefPriority.textContent = "Launch re-engagement email sequence.";
  
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
    
    // Dynamically grab primary metric
    const itemTemplate = getTemplateForBusiness(item.businessType || 'saas');
    const primaryKpi = itemTemplate.kpis[0];
    const metricHistory = item.metrics[primaryKpi.id] || [0];
    const latestValue = metricHistory[metricHistory.length - 1] || 0;
    
    const metricEl = createSafeElement('div', [], `${formatMetric(latestValue, primaryKpi.format)} ${primaryKpi.label}`);
    metricEl.style.fontWeight = '700';
    metricEl.style.fontSize = '0.85rem';
    metricEl.style.color = 'white';
    
    const growthEl = createSafeElement('div', [], `${item.socialGrowth} Growth`);
    growthEl.style.fontSize = '0.75rem';
    growthEl.style.color = 'var(--accent-green)';
    growthEl.style.fontWeight = '600';
    
    rightFlex.appendChild(metricEl);
    rightFlex.appendChild(growthEl);
    
    row.appendChild(leftFlex);
    row.appendChild(rightFlex);
    portfolioList.appendChild(row);
  });
  
  renderDashboardChart();
}

export function renderWarRoom() {
  const container = document.getElementById('war-room-cards-container');
  if (!container) return;
  container.innerHTML = '';
  
  const apps = Object.values(state.appsData);
  if (apps.length === 0) {
    container.innerHTML = `<div style="color:var(--text-muted); font-size:0.9rem;">No active businesses found in your portfolio.</div>`;
    return;
  }
  
  const cardClasses = ['card-primary', 'card-secondary', 'card-green'];
  
  apps.forEach((app, index) => {
    const template = getTemplateForBusiness(app.businessType || 'saas');
    const primaryKpi = template.kpis[0];
    const secondaryKpi = template.kpis[1] || template.kpis[0];
    
    const primaryHistory = app.metrics[primaryKpi.id] || [0];
    const secondaryHistory = app.metrics[secondaryKpi.id] || [0];
    const primaryVal = primaryHistory[primaryHistory.length - 1] || 0;
    const secondaryVal = secondaryHistory[secondaryHistory.length - 1] || 0;
    
    const cardClass = cardClasses[index % cardClasses.length];
    
    const card = createSafeElement('div', ['glass-card', cardClass]);
    
    const title = createSafeElement('h4', [], app.name);
    title.style.color = 'white';
    title.style.marginBottom = '8px';
    
    const kpiDisplay = createSafeElement('div', [], `${formatMetric(primaryVal, primaryKpi.format)} ${primaryKpi.label}`);
    kpiDisplay.style.fontSize = '1.4rem';
    kpiDisplay.style.fontWeight = '700';
    kpiDisplay.style.color = 'white';
    
    const subKpiDisplay = createSafeElement('div', [], `${secondaryKpi.label}: ${formatMetric(secondaryVal, secondaryKpi.format)} | Score: ${Math.floor(Math.random()*20)+75}`);
    subKpiDisplay.style.fontSize = '0.75rem';
    subKpiDisplay.style.color = 'var(--text-muted)';
    subKpiDisplay.style.marginTop = '4px';
    
    const campaignBox = createSafeElement('div', [], `Active Agent: Sales Intelligence`);
    campaignBox.style.marginTop = '12px';
    campaignBox.style.fontSize = '0.78rem';
    campaignBox.style.background = 'rgba(255,255,255,0.03)';
    campaignBox.style.padding = '8px';
    campaignBox.style.borderRadius = '4px';
    campaignBox.style.color = 'white';
    
    card.appendChild(title);
    card.appendChild(kpiDisplay);
    card.appendChild(subKpiDisplay);
    card.appendChild(campaignBox);
    
    container.appendChild(card);
  });
}

function renderDashboardChart() {
  const container = document.getElementById('dashboard-bar-chart');
  if (!container) return;
  container.innerHTML = '';
  
  const app = state.appsData[state.currentActiveApp];
  if (!app) return;
  const history = app.analytics;
  const labels = history.months;
  
  // Use template to get metric for chart based on button pressed
  const template = getTemplateForBusiness(app.businessType);
  const chartKpi = activeDashChartMetric === 'mrr' ? template.kpis[0] : template.kpis[1];
  
  if (!chartKpi) return;
  
  const data = app.metrics[chartKpi.id] || [0,0,0,0,0,0];
  const maxVal = Math.max(...data) * 1.1 || 1; // avoid div by 0
  
  // Update Chart Labels dynamically
  document.getElementById('chart-mrr-btn').textContent = template.kpis[0].label;
  if(template.kpis[1]) document.getElementById('chart-downloads-btn').textContent = template.kpis[1].label;
  
  labels.forEach((month, idx) => {
    const value = data[idx] || 0;
    const heightPercentage = Math.round((value / maxVal) * 100);
    
    const barCol = createSafeElement('div', ['chart-bar-column']);
    const barFill = createSafeElement('div', ['chart-bar-fill']);
    barFill.style.height = `${heightPercentage}%`;
    barFill.style.background = app.logoColor;
    
    const tooltip = createSafeElement('div', ['chart-bar-tooltip'], formatMetric(value, chartKpi.format));
    barFill.appendChild(tooltip);
    
    const label = createSafeElement('div', ['chart-label'], month);
    
    barCol.appendChild(barFill);
    barCol.appendChild(label);
    container.appendChild(barCol);
  });
}

