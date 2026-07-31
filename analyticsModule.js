import { state } from './state.js';
import { requestApi, showToast, createSafeElement } from './common.js';
import { getSupabaseClient } from './auth.js';

let charts = [];

export async function initAnalytics() {
  if (!window.Chart) {
    await new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.4/dist/chart.umd.min.js';
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  state.on('viewChanged', (viewId) => {
    if (viewId === 'social-analytics') {
      renderAnalyticsDashboard();
    }
  });

  state.on('appChanged', () => {
    if (state.currentActiveView === 'social-analytics') {
      renderAnalyticsDashboard();
    }
  });
}

function formatNumber(num) {
  if (num >= 1000000) return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
  return num.toString();
}

function getChartDefaults() {
  Chart.defaults.color = '#9ca3af';
  Chart.defaults.font.family = 'system-ui, -apple-system, sans-serif';
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        backgroundColor: 'rgba(17, 24, 39, 0.9)',
        titleColor: '#fff',
        bodyColor: '#fff',
        borderColor: 'rgba(255,255,255,0.1)',
        borderWidth: 1,
        padding: 10,
        displayColors: false
      }
    },
    scales: {
      x: {
        grid: {
          color: 'rgba(255,255,255,0.05)',
          drawBorder: false
        },
        ticks: {
          color: '#9ca3af'
        }
      },
      y: {
        grid: {
          color: 'rgba(255,255,255,0.05)',
          drawBorder: false
        },
        ticks: {
          color: '#9ca3af'
        }
      }
    }
  };
}

export async function renderAnalyticsDashboard() {
  const container = document.getElementById('analytics-dashboard-container');
  if (!container) return;

  // Clear old charts
  charts.forEach(c => c.destroy());
  charts = [];

  container.innerHTML = '<div style="padding: 40px; text-align: center; color: var(--text-sub);">Loading analytics...</div>';

  let data = null;
  try {
    data = await requestApi(`/api/analytics/social/${state.currentActiveApp}`);
  } catch (err) {
    console.warn("Analytics API unavailable. Falling back to demo data.");
  }

  // If no data or fetch failed, generate demo data as requested
  if (!data || data.empty) {
    // Generate demo data
    data = generateDemoData();
    // Render demo banner
    renderDashboard(container, data, true);
  } else {
    renderDashboard(container, data, false);
  }
}

function renderDashboard(container, data, isDemo) {
  container.innerHTML = '';
  
  if (isDemo) {
    const banner = createSafeElement('div');
    banner.style.background = 'rgba(245, 158, 11, 0.1)';
    banner.style.color = '#f59e0b';
    banner.style.padding = '12px 16px';
    banner.style.borderRadius = '8px';
    banner.style.marginBottom = '20px';
    banner.style.fontSize = '0.9rem';
    banner.style.textAlign = 'center';
    banner.style.border = '1px solid rgba(245, 158, 11, 0.2)';
    banner.innerText = 'Showing demo data. Connect social accounts for real metrics.';
    container.appendChild(banner);
  }

  // Summary Cards Row
  const cardsRow = createSafeElement('div');
  cardsRow.style.display = 'grid';
  cardsRow.style.gridTemplateColumns = 'repeat(auto-fit, minmax(200px, 1fr))';
  cardsRow.style.gap = '16px';
  cardsRow.style.marginBottom = '30px';

  const cards = [
    { title: 'Total Followers', value: formatNumber(data.totalFollowers), trend: '+5.2%', isPositive: true },
    { title: 'Engagement Rate', value: data.engagementRate + '%', trend: '+1.1%', isPositive: data.engagementRate > 3 ? true : data.engagementRate >= 1 ? null : false, color: data.engagementRate > 3 ? '#10b981' : data.engagementRate >= 1 ? '#f59e0b' : '#ef4444' },
    { title: 'Total Reach', value: formatNumber(data.totalReach), trend: '+12.4%', isPositive: true },
    { title: 'Posts Published', value: data.postsPublished, trend: '-2', isPositive: false }
  ];

  cards.forEach(c => {
    const card = createSafeElement('div');
    card.style.background = 'rgba(255,255,255,0.03)';
    card.style.border = '1px solid rgba(255,255,255,0.08)';
    card.style.borderRadius = '12px';
    card.style.padding = '20px';

    const title = createSafeElement('div', [], c.title);
    title.style.fontSize = '0.75rem';
    title.style.color = '#9ca3af';
    title.style.textTransform = 'uppercase';
    title.style.letterSpacing = '0.05em';
    title.style.marginBottom = '8px';

    const valRow = createSafeElement('div');
    valRow.style.display = 'flex';
    valRow.style.justifyContent = 'space-between';
    valRow.style.alignItems = 'baseline';

    const val = createSafeElement('div', [], c.value);
    val.style.fontSize = '1.8rem';
    val.style.fontWeight = '700';
    val.style.color = c.color || 'white';

    const trend = createSafeElement('div', [], c.trend);
    trend.style.fontSize = '0.8rem';
    if (c.isPositive === true) trend.style.color = '#10b981';
    else if (c.isPositive === false) trend.style.color = '#ef4444';
    else trend.style.color = '#9ca3af';

    valRow.appendChild(val);
    valRow.appendChild(trend);
    card.appendChild(title);
    card.appendChild(valRow);
    cardsRow.appendChild(card);
  });
  container.appendChild(cardsRow);

  // Charts Grid
  const chartsGrid = createSafeElement('div');
  chartsGrid.style.display = 'grid';
  chartsGrid.style.gridTemplateColumns = 'repeat(auto-fit, minmax(400px, 1fr))';
  chartsGrid.style.gap = '20px';
  chartsGrid.style.marginBottom = '30px';

  // Follower Growth Chart
  const growthContainer = createSafeElement('div');
  growthContainer.style.background = 'rgba(255,255,255,0.02)';
  growthContainer.style.border = '1px solid rgba(255,255,255,0.05)';
  growthContainer.style.borderRadius = '12px';
  growthContainer.style.padding = '20px';
  
  const growthTitle = createSafeElement('h3', [], 'Follower Growth (30 days)');
  growthTitle.style.marginTop = '0';
  growthTitle.style.marginBottom = '20px';
  growthTitle.style.fontSize = '1.1rem';
  growthTitle.style.color = 'white';
  
  const growthCanvasWrapper = createSafeElement('div');
  growthCanvasWrapper.style.position = 'relative';
  growthCanvasWrapper.style.height = '300px';
  const growthCanvas = createSafeElement('canvas');
  growthCanvas.id = 'follower-growth-chart';
  growthCanvasWrapper.appendChild(growthCanvas);
  
  growthContainer.appendChild(growthTitle);
  growthContainer.appendChild(growthCanvasWrapper);
  chartsGrid.appendChild(growthContainer);

  // Engagement Chart
  const engContainer = createSafeElement('div');
  engContainer.style.background = 'rgba(255,255,255,0.02)';
  engContainer.style.border = '1px solid rgba(255,255,255,0.05)';
  engContainer.style.borderRadius = '12px';
  engContainer.style.padding = '20px';
  
  const engTitle = createSafeElement('h3', [], 'Daily Engagement');
  engTitle.style.marginTop = '0';
  engTitle.style.marginBottom = '20px';
  engTitle.style.fontSize = '1.1rem';
  engTitle.style.color = 'white';
  
  const engCanvasWrapper = createSafeElement('div');
  engCanvasWrapper.style.position = 'relative';
  engCanvasWrapper.style.height = '300px';
  const engCanvas = createSafeElement('canvas');
  engCanvas.id = 'engagement-chart';
  engCanvasWrapper.appendChild(engCanvas);

  engContainer.appendChild(engTitle);
  engContainer.appendChild(engCanvasWrapper);
  chartsGrid.appendChild(engContainer);

  container.appendChild(chartsGrid);

  // Top Posts
  if (data.topPosts && data.topPosts.length > 0) {
    const postsSection = createSafeElement('div');
    const postsTitle = createSafeElement('h3', [], 'Top Performing Posts');
    postsTitle.style.color = 'white';
    postsTitle.style.marginBottom = '15px';
    postsSection.appendChild(postsTitle);

    const postsGrid = createSafeElement('div');
    postsGrid.style.display = 'grid';
    postsGrid.style.gridTemplateColumns = 'repeat(auto-fit, minmax(250px, 1fr))';
    postsGrid.style.gap = '15px';

    data.topPosts.forEach(post => {
      const pCard = createSafeElement('div');
      pCard.style.background = 'rgba(255,255,255,0.03)';
      pCard.style.border = '1px solid rgba(255,255,255,0.08)';
      pCard.style.borderRadius = '10px';
      pCard.style.padding = '15px';
      pCard.style.cursor = 'pointer';
      pCard.style.transition = 'background 0.2s';
      pCard.addEventListener('mouseover', () => pCard.style.background = 'rgba(255,255,255,0.06)');
      pCard.addEventListener('mouseout', () => pCard.style.background = 'rgba(255,255,255,0.03)');

      const pHeader = createSafeElement('div');
      pHeader.style.display = 'flex';
      pHeader.style.justifyContent = 'space-between';
      pHeader.style.marginBottom = '10px';
      
      const pIcon = createSafeElement('span', [], post.platform.toUpperCase());
      pIcon.style.fontSize = '0.7rem';
      pIcon.style.background = 'rgba(99, 102, 241, 0.2)';
      pIcon.style.color = '#818cf8';
      pIcon.style.padding = '2px 6px';
      pIcon.style.borderRadius = '4px';
      
      const pEng = createSafeElement('span', [], formatNumber(post.engagement) + ' eng');
      pEng.style.fontSize = '0.8rem';
      pEng.style.color = '#10b981';
      
      pHeader.appendChild(pIcon);
      pHeader.appendChild(pEng);

      const pCap = createSafeElement('p', [], post.caption);
      pCap.style.fontSize = '0.85rem';
      pCap.style.color = '#d1d5db';
      pCap.style.margin = '0';
      pCap.style.display = '-webkit-box';
      pCap.style.webkitLineClamp = '3';
      pCap.style.webkitBoxOrient = 'vertical';
      pCap.style.overflow = 'hidden';

      pCard.appendChild(pHeader);
      pCard.appendChild(pCap);
      postsGrid.appendChild(pCard);
    });

    postsSection.appendChild(postsGrid);
    container.appendChild(postsSection);
  }

  // Initialize Charts
  setTimeout(() => {
    initCharts(data);
  }, 0);
}

function initCharts(data) {
  const ctxGrowth = document.getElementById('follower-growth-chart');
  const ctxEng = document.getElementById('engagement-chart');

  if (ctxGrowth) {
    const gradient = ctxGrowth.getContext('2d').createLinearGradient(0, 0, 0, 300);
    gradient.addColorStop(0, 'rgba(99,102,241,0.2)');
    gradient.addColorStop(1, 'rgba(99,102,241,0)');

    const config = {
      type: 'line',
      data: {
        labels: data.dates,
        datasets: [{
          label: 'Followers',
          data: data.followerGrowth,
          borderColor: '#6366f1',
          backgroundColor: gradient,
          fill: true,
          tension: 0.4,
          pointRadius: 0,
          pointHitRadius: 10,
          borderWidth: 2
        }]
      },
      options: getChartDefaults()
    };
    charts.push(new Chart(ctxGrowth, config));
  }

  if (ctxEng) {
    const gradient = ctxEng.getContext('2d').createLinearGradient(0, 0, 0, 300);
    gradient.addColorStop(0, '#8b5cf6');
    gradient.addColorStop(1, 'rgba(139,92,246,0.2)');

    const config = {
      type: 'bar',
      data: {
        labels: data.dates,
        datasets: [{
          label: 'Engagement',
          data: data.engagementData,
          backgroundColor: gradient,
          borderRadius: 4
        }]
      },
      options: getChartDefaults()
    };
    charts.push(new Chart(ctxEng, config));
  }
}

function renderEmptyState(container) {
  container.innerHTML = `
    <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 60px 20px; text-align: center;">
      <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.2)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-bottom: 20px;">
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
        <line x1="3" y1="9" x2="21" y2="9"></line>
        <line x1="9" y1="21" x2="9" y2="9"></line>
        <path d="M13 13l2 2 4-4"></path>
      </svg>
      <h3 style="color: white; margin-bottom: 10px; font-size: 1.2rem;">Connect your social accounts to see real analytics</h3>
      <p style="color: var(--text-sub); margin-bottom: 20px; max-width: 400px;">Get insights into your follower growth, engagement rates, and top performing posts across all connected platforms.</p>
      <button class="btn btn-primary" onclick="window.dispatchEvent(new CustomEvent('navigate', {detail: 'integrations'}))">Go to Integrations</button>
    </div>
  `;
}

function generateDemoData() {
  const dates = [];
  const followerGrowth = [];
  const engagementData = [];
  
  let currentFollowers = Math.floor(Math.random() * 1000) + 2000;
  
  const today = new Date();
  for (let i = 29; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    dates.push(d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }));
    
    currentFollowers += Math.floor(Math.random() * 15) + 5;
    followerGrowth.push(currentFollowers);
    
    engagementData.push(Math.floor(Math.random() * 250) + 50);
  }

  return {
    totalFollowers: followerGrowth[29],
    engagementRate: (3.2 + Math.random() * 2).toFixed(1),
    totalReach: Math.floor(Math.random() * 50000) + 20000,
    postsPublished: Math.floor(Math.random() * 20) + 5,
    dates,
    followerGrowth,
    engagementData,
    topPosts: [
      { platform: 'twitter', engagement: 452, caption: 'Just launched our new analytics dashboard! Check out these insane metrics 🚀 #buildinpublic' },
      { platform: 'linkedin', engagement: 389, caption: 'I spent 6 months building the perfect workflow. Here are the 5 tools I use daily to save 10+ hours a week.' },
      { platform: 'instagram', engagement: 215, caption: 'Behind the scenes at the office today. Building something special.' },
      { platform: 'twitter', engagement: 198, caption: 'Unpopular opinion: You don\'t need 10x engineers, you need 10x communication.' }
    ]
  };
}
