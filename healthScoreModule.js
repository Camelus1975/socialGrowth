import { state } from './state.js';
import { createSafeElement } from './common.js';

export function initHealthScore() {
  state.on('viewChanged', (viewId) => {
    if (viewId === 'health-score') {
      renderHealthScoreView();
    }
  });

  state.on('appChanged', () => {
    if (state.currentActiveView === 'health-score') {
      renderHealthScoreView();
    }
  });
}

export function renderHealthScoreView() {
  const container = document.getElementById('health-score-gauge');
  if (!container) return;
  
  container.innerHTML = '';
  
  const app = state.appsData[state.currentActiveApp];
  if (!app) {
    container.innerHTML = '<div class="mod-style-cGFkZGlu">Please select a business to view the Health Score.</div>';
    return;
  }
  
  // Calculate mock health score
  const score = Math.floor(Math.random() * 25) + 70; // 70-95
  
  let healthStatus = 'Healthy';
  let healthColor = 'var(--accent-green)';
  if (score < 75) {
    healthStatus = 'At Risk';
    healthColor = 'var(--accent-orange)';
  } else if (score < 50) {
    healthStatus = 'Critical';
    healthColor = '#ef4444';
  }
  
  const wrapper = createSafeElement('div');
  wrapper.style.display = 'flex';
  wrapper.style.flexDirection = 'column';
  wrapper.style.gap = '24px';
  
  // Top Banner
  const topCard = createSafeElement('div');
  topCard.style.display = 'flex';
  topCard.style.justifyContent = 'center';
  topCard.style.alignItems = 'center';
  topCard.style.padding = '40px 20px';
  topCard.style.background = 'var(--bg-card)';
  topCard.style.border = '1px solid var(--border-glass)';
  topCard.style.borderRadius = 'var(--radius-lg)';
  topCard.style.flexDirection = 'column';
  
  const title = createSafeElement('h2', [], 'Overall Health Score');
  title.style.color = 'white';
  title.style.marginBottom = '10px';
  
  const scoreDisplay = createSafeElement('div', [], `${score}/100`);
  scoreDisplay.style.fontSize = '4rem';
  scoreDisplay.style.fontWeight = 'bold';
  scoreDisplay.style.color = healthColor;
  scoreDisplay.style.textShadow = `0 0 20px ${healthColor}40`;
  
  const statusDisplay = createSafeElement('div', [], `Status: ${healthStatus}`);
  statusDisplay.style.color = 'var(--text-muted)';
  statusDisplay.style.fontSize = '1.1rem';
  statusDisplay.style.marginTop = '10px';
  
  topCard.appendChild(title);
  topCard.appendChild(scoreDisplay);
  topCard.appendChild(statusDisplay);
  wrapper.appendChild(topCard);
  
  // Metrics Grid
  const metricsGrid = createSafeElement('div');
  metricsGrid.style.display = 'grid';
  metricsGrid.style.gridTemplateColumns = 'repeat(auto-fit, minmax(200px, 1fr))';
  metricsGrid.style.gap = '20px';
  
  const metricCategories = [
    { name: 'Marketing ROI', value: Math.floor(Math.random() * 40) + 60 },
    { name: 'Sales Conversion', value: Math.floor(Math.random() * 40) + 60 },
    { name: 'Revenue Growth', value: Math.floor(Math.random() * 40) + 60 },
    { name: 'Customer Satisfaction', value: Math.floor(Math.random() * 40) + 60 },
    { name: 'User Retention', value: Math.floor(Math.random() * 40) + 60 },
    { name: 'Brand Reputation', value: Math.floor(Math.random() * 40) + 60 },
    { name: 'Ad Performance', value: Math.floor(Math.random() * 40) + 60 },
    { name: 'Pipeline Velocity', value: Math.floor(Math.random() * 40) + 60 }
  ];
  
  metricCategories.forEach(m => {
    const mCard = createSafeElement('div');
    mCard.style.background = 'rgba(255,255,255,0.02)';
    mCard.style.border = '1px solid var(--border-glass)';
    mCard.style.borderRadius = 'var(--radius-sm)';
    mCard.style.padding = '20px';
    mCard.style.display = 'flex';
    mCard.style.flexDirection = 'column';
    mCard.style.alignItems = 'center';
    
    let mColor = 'var(--accent-green)';
    if (m.value < 75) mColor = 'var(--accent-orange)';
    if (m.value < 65) mColor = '#ef4444';
    
    const mTitle = createSafeElement('div', [], m.name);
    mTitle.style.color = 'var(--text-muted)';
    mTitle.style.fontSize = '0.9rem';
    mTitle.style.marginBottom = '12px';
    
    const mValue = createSafeElement('div', [], `${m.value}/100`);
    mValue.style.color = mColor;
    mValue.style.fontSize = '1.8rem';
    mValue.style.fontWeight = 'bold';
    
    mCard.appendChild(mTitle);
    mCard.appendChild(mValue);
    metricsGrid.appendChild(mCard);
  });
  
  wrapper.appendChild(metricsGrid);
  container.appendChild(wrapper);
}
