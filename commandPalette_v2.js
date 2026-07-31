// Social Growth AI — Command Palette fuzzy search controller (ES6 Module)
import { switchWorkspace } from './app_v2.js';

export function initCommandPaletteV2() {
  const modal = document.getElementById('command-palette-modal');
  const input = document.getElementById('command-palette-input');
  const resultsContainer = document.getElementById('command-palette-results');

  if (!modal || !input || !resultsContainer) return;

  const searchIndex = [
    { name: 'Home Mission Control', type: 'Workspace', action: () => switchWorkspace('unified-intelligence-dash') },
    { name: 'Goal Center — Outcome Launcher', type: 'Goal', action: () => switchWorkspace('growth-command-center') },
    { name: 'AI Agent Network — Teammates', type: 'Agents', action: () => switchWorkspace('agent-orchestration') },
    { name: 'Campaign Hub — Launch Ads', type: 'Campaigns', action: () => switchWorkspace('launch-center') },
    { name: 'Creative Studio — Generate Copy', type: 'Creative', action: () => switchWorkspace('content-studio') },
    { name: 'Publish Scheduler — Calendar Timeline', type: 'Publishing', action: () => switchWorkspace('social-calendar') },
    { name: 'Market Intelligence — Competitors Radar', type: 'Intelligence', action: () => switchWorkspace('competitor-intelligence') },
    { name: 'Business Intelligence — Metrics charts', type: 'Analytics', action: () => switchWorkspace('social-analytics') },
    { name: 'Revenue Intelligence — MRR ARR Forecast', type: 'Revenue', action: () => switchWorkspace('revenue-intelligence') },
    { name: 'Brand Kit & Growth Memory Engine', type: 'Knowledge', action: () => switchWorkspace('brand-kit') },
    { name: 'Developer Console — SQL Schemas', type: 'Infrastructure', action: () => switchWorkspace('db-console') }
  ];

  let selectedIndex = 0;
  let activeResults = [...searchIndex];

  // Hotkey listener for Ctrl+K / Cmd+K
  window.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      modal.style.display = 'flex';
      input.focus();
      renderResults();
    }
    if (e.key === 'Escape') {
      modal.style.display = 'none';
    }
  });

  // Click trigger trigger
  document.querySelector('.command-palette-trigger')?.addEventListener('click', () => {
    modal.style.display = 'flex';
    input.focus();
    renderResults();
  });

  // Dismiss if clicking backdrop
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.style.display = 'none';
    }
  });

  // Fuzzy filter search results
  input.addEventListener('input', () => {
    const query = input.value.toLowerCase().trim();
    if (!query) {
      activeResults = [...searchIndex];
    } else {
      activeResults = searchIndex.filter(item => 
        item.name.toLowerCase().includes(query) || 
        item.type.toLowerCase().includes(query)
      );
    }
    selectedIndex = 0;
    renderResults();
  });

  // Navigation keystrokes
  input.addEventListener('keydown', (e) => {
    const items = resultsContainer.querySelectorAll('.command-result-item');
    if (!items.length) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      selectedIndex = (selectedIndex + 1) % items.length;
      updateHighlight(items);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      selectedIndex = (selectedIndex - 1 + items.length) % items.length;
      updateHighlight(items);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      activeResults[selectedIndex].action();
      modal.style.display = 'none';
      input.value = '';
    }
  });

  function renderResults() {
    resultsContainer.innerHTML = '';
    if (!activeResults.length) {
      resultsContainer.innerHTML = '<div style="padding:16px; color:#6b7280; text-align:center; font-size:0.85rem;">No results found.</div>';
      return;
    }

    activeResults.forEach((item, index) => {
      const row = document.createElement('div');
      row.className = 'command-result-item';
      if (index === selectedIndex) row.classList.add('highlighted');
      
      row.style.cssText = `
        padding: 12px 16px;
        border-radius: 8px;
        cursor: pointer;
        display: flex;
        justify-content: space-between;
        align-items: center;
        transition: background 0.2s ease;
        margin-bottom: 4px;
        background: ${index === selectedIndex ? 'rgba(255,255,255,0.05)' : 'transparent'};
      `;

      row.innerHTML = `
        <span style="color:${index === selectedIndex ? 'white' : '#d1d5db'}; font-size:0.88rem; font-weight:600;">${item.name}</span>
        <span style="font-size:0.7rem; background:rgba(255,255,255,0.06); padding:2px 8px; border-radius:10px; color:#9ca3af; text-transform:uppercase;">${item.type}</span>
      `;

      row.addEventListener('click', () => {
        item.action();
        modal.style.display = 'none';
        input.value = '';
      });

      resultsContainer.appendChild(row);
    });
  }

  function updateHighlight(items) {
    items.forEach((item, idx) => {
      if (idx === selectedIndex) {
        item.style.background = 'rgba(255,255,255,0.05)';
        item.querySelector('span').style.color = 'white';
      } else {
        item.style.background = 'transparent';
        item.querySelector('span').style.color = '#d1d5db';
      }
    });
  }
}
