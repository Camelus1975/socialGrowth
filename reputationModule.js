import { state } from './state.js';
import { createSafeElement } from './common.js';

export function initReputationCenter() {
  state.on('viewChanged', (viewId) => {
    if (viewId === 'reputation-center') {
      renderReputationView();
    }
  });

  state.on('appChanged', () => {
    if (state.currentActiveView === 'reputation-center') {
      renderReputationView();
    }
  });
}

export function renderReputationView() {
  const container = document.getElementById('reputation-dashboard');
  if (!container) return;
  
  container.innerHTML = '';
  
  const app = state.appsData[state.currentActiveApp];
  if (!app) {
    container.innerHTML = '<div class="mod-style-cGFkZGlu">Please select a business to view reputation metrics.</div>';
    return;
  }
  
  // Header Stats Grid
  const statsGrid = createSafeElement('div');
  statsGrid.style.display = 'grid';
  statsGrid.style.gridTemplateColumns = 'repeat(4, 1fr)';
  statsGrid.style.gap = '15px';
  statsGrid.style.marginBottom = '30px';
  
  const stats = [
    { label: "Overall Rating", value: "4.8", icon: "⭐" },
    { label: "Total Reviews", value: "1,245", icon: "💬" },
    { label: "Unanswered", value: "12", icon: "⚠️" },
    { label: "Reputation Score", value: "92/100", icon: "📈" }
  ];
  
  stats.forEach(s => {
    const card = createSafeElement('div');
    card.style.background = 'var(--bg-card)';
    card.style.border = '1px solid var(--border-glass)';
    card.style.padding = '15px';
    card.style.borderRadius = 'var(--radius-md)';
    card.style.display = 'flex';
    card.style.alignItems = 'center';
    card.style.gap = '15px';
    
    const iconSpan = createSafeElement('span', [], s.icon);
    iconSpan.style.fontSize = '1.5rem';
    
    const textDiv = createSafeElement('div');
    const valSpan = createSafeElement('div', [], s.value);
    valSpan.style.fontSize = '1.5rem';
    valSpan.style.fontWeight = 'bold';
    valSpan.style.color = 'white';
    
    const labelSpan = createSafeElement('div', [], s.label);
    labelSpan.style.color = 'var(--text-sub)';
    labelSpan.style.fontSize = '0.8rem';
    
    textDiv.appendChild(valSpan);
    textDiv.appendChild(labelSpan);
    
    card.appendChild(iconSpan);
    card.appendChild(textDiv);
    statsGrid.appendChild(card);
  });
  
  container.appendChild(statsGrid);
  
  // Recent Reviews List
  const reviewsContainer = createSafeElement('div');
  reviewsContainer.style.background = 'var(--bg-card)';
  reviewsContainer.style.border = '1px solid var(--border-glass)';
  reviewsContainer.style.borderRadius = 'var(--radius-lg)';
  reviewsContainer.style.padding = '20px';
  
  const reviewsTitle = createSafeElement('h4', [], 'Recent Reviews requiring Attention');
  reviewsTitle.style.color = 'white';
  reviewsTitle.style.marginBottom = '20px';
  reviewsContainer.appendChild(reviewsTitle);
  
  const mockReviews = [
    { platform: "Google Maps", rating: 5, text: "Excellent service! The onboarding team was fantastic.", author: "Jane Smith", time: "2 hours ago" },
    { platform: "App Store", rating: 2, text: "The new update is buggy. Constant crashes.", author: "Mike D.", time: "4 hours ago" },
    { platform: "Capterra", rating: 4, text: "Solid platform, but reporting could be improved.", author: "Sarah W.", time: "1 day ago" }
  ];
  
  mockReviews.forEach(r => {
    const reviewCard = createSafeElement('div');
    reviewCard.style.borderBottom = '1px solid var(--border-glass)';
    reviewCard.style.paddingBottom = '15px';
    reviewCard.style.marginBottom = '15px';
    
    const header = createSafeElement('div');
    header.style.display = 'flex';
    header.style.justifyContent = 'space-between';
    header.style.marginBottom = '8px';
    
    const leftHeader = createSafeElement('div');
    const stars = "⭐".repeat(r.rating);
    const metaSpan = createSafeElement('span', [], `${stars} · ${r.platform} · by ${r.author}`);
    metaSpan.style.color = 'white';
    metaSpan.style.fontWeight = '600';
    metaSpan.style.fontSize = '0.9rem';
    
    leftHeader.appendChild(metaSpan);
    
    const timeSpan = createSafeElement('span', [], r.time);
    timeSpan.style.color = 'var(--text-muted)';
    timeSpan.style.fontSize = '0.8rem';
    
    header.appendChild(leftHeader);
    header.appendChild(timeSpan);
    
    const body = createSafeElement('p', [], r.text);
    body.style.color = 'var(--text-sub)';
    body.style.fontSize = '0.9rem';
    body.style.lineHeight = '1.4';
    body.style.marginBottom = '10px';
    
    const actionBtn = createSafeElement('button', ['btn', 'btn-secondary'], 'Generate AI Reply');
    actionBtn.style.padding = '6px 12px';
    actionBtn.style.fontSize = '0.8rem';
    
    reviewCard.appendChild(header);
    reviewCard.appendChild(body);
    reviewCard.appendChild(actionBtn);
    
    reviewsContainer.appendChild(reviewCard);
  });
  
  container.appendChild(reviewsContainer);
}
