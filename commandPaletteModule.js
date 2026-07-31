// Command Palette Module - Ctrl+K Global Quick Search
import { state } from './state.js';
import { switchView } from './app.js';
import { openModal, closeModal } from './common.js';

const COMMANDS = [
  { id: 'unified-intelligence-dash', title: 'Unified Intelligence Dashboard', section: 'Command Center', icon: '📊', desc: 'Central overview of predicted revenue & active agent opportunities' },
  { id: 'growth-command-center', title: 'Growth Command Center', section: 'Command Center', icon: '🚀', desc: 'Conversational interface to set goals & run AI strategy pipelines' },
  { id: 'founder-dash', title: 'Founder Dashboard', section: 'Command Center', icon: '⚡', desc: 'Monitor startup metrics & cross-app growth performance' },
  { id: 'war-room', title: 'Executive War Room', section: 'Command Center', icon: '🛡️', desc: 'Live monitoring of active agent operations and status' },
  { id: 'social-analytics', title: 'Social Analytics Dashboard', section: 'Analytics', icon: '📈', desc: 'Real-time performance metrics, follower growth & engagement' },
  { id: 'weekly-report', title: 'Weekly AI Report', section: 'Command Center', icon: '📝', desc: 'Executive growth health score & CMO weekly recommendations' },
  { id: 'content-studio', title: 'AI Content Studio', section: 'Marketing', icon: '🎨', desc: 'Create platform-optimized copy variants, hashtags & image prompts' },
  { id: 'social-calendar', title: 'Social Calendar', section: 'Marketing', icon: '📅', desc: 'Interactive campaign scheduling & auto-publishing queue' },
  { id: 'social-inbox', title: 'Unified Social Inbox', section: 'Marketing', icon: '📥', desc: 'Aggregate platform comments, messages & smart AI replies' },
  { id: 'content-recycler', title: 'Content Recycler & Copilot', section: 'Marketing', icon: '♻️', desc: 'Repurpose high-performing posts into 4 platform formats' },
  { id: 'video-factory', title: 'Video Factory', section: 'Media', icon: '🎬', desc: 'Multi-scene AI video storyboarding & rendering' },
  { id: 'brand-kit', title: 'Brand Kit & Identity', section: 'Media', icon: '✨', desc: 'Configure brand colors, fonts, tone of voice & negative prompts' },
  { id: 'media-asset', title: 'Media Asset Library', section: 'Media', icon: '🖼️', desc: 'Store brand assets, images & videos with AI indexing' },
  { id: 'competitor-intelligence', title: 'Competitor Intelligence', section: 'Intelligence', icon: '🎯', desc: 'Continuous monitoring of rival features, pricing & ads' },
  { id: 'customer-intelligence', title: 'Customer Intelligence', section: 'Intelligence', icon: '👥', desc: 'Analyze reviews, feedback, sentiment & churn risks' },
  { id: 'growth-memory', title: 'Growth Memory Engine', section: 'Intelligence', icon: '🧠', desc: 'Permanent business memory tracking success & failure patterns' },
  { id: 'ad-dash', title: 'Advertising Command Center', section: 'Advertising', icon: '📢', desc: 'Manage AI Media Buying, approve budgets & monitor ROAS' },
  { id: 'revenue-intelligence', title: 'Revenue Intelligence', section: 'Revenue', icon: '💵', desc: 'Track MRR, LTV, CAC, ROAS & revenue attribution' },
  { id: 'universal-crm', title: 'Business CRM', section: 'Revenue', icon: '💼', desc: 'Manage customer pipeline, deals & customer status' },
  { id: 'agent-orchestration', title: 'Agent Orchestration Flow', section: 'Automation', icon: '🤖', desc: 'Watch real-time cooperative agent pipelines execute' },
  { id: 'social-integrations', title: 'Social Integrations', section: 'Settings', icon: '🔗', desc: 'Connect Meta, Instagram, Twitter/X, TikTok & LinkedIn' }
];

let selectedIndex = 0;
let filteredCommands = [...COMMANDS];

export function initCommandPalette() {
  // Keydown listener for Ctrl+K / Cmd+K
  window.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      toggleCommandPalette();
    } else if (e.key === 'Escape') {
      closeCommandPalette();
    }
  });

  // Attach search trigger listeners
  const triggers = document.querySelectorAll('.command-palette-trigger');
  triggers.forEach(t => t.addEventListener('click', () => openCommandPalette()));

  // Render initial list
  renderCommandList();
}

export function openCommandPalette() {
  const modal = document.getElementById('command-palette-modal');
  const input = document.getElementById('command-palette-input');
  if (!modal) return;
  
  modal.style.display = 'flex';
  setTimeout(() => modal.classList.add('active'), 10);
  
  if (input) {
    input.value = '';
    input.focus();
    filterCommands('');
  }
}

export function closeCommandPalette() {
  const modal = document.getElementById('command-palette-modal');
  if (!modal) return;
  modal.classList.remove('active');
  setTimeout(() => { modal.style.display = 'none'; }, 200);
}

export function toggleCommandPalette() {
  const modal = document.getElementById('command-palette-modal');
  if (modal && modal.classList.contains('active')) {
    closeCommandPalette();
  } else {
    openCommandPalette();
  }
}

function filterCommands(query) {
  const q = query.toLowerCase().trim();
  if (!q) {
    filteredCommands = [...COMMANDS];
  } else {
    filteredCommands = COMMANDS.filter(c => 
      c.title.toLowerCase().includes(q) || 
      c.section.toLowerCase().includes(q) || 
      c.desc.toLowerCase().includes(q)
    );
  }
  selectedIndex = 0;
  renderCommandList();
}

function renderCommandList() {
  const container = document.getElementById('command-palette-results');
  if (!container) return;

  if (filteredCommands.length === 0) {
    container.innerHTML = `
      <div style="padding: 32px; text-align: center; color: #9ca3af; font-size: 0.9rem;">
        <div style="font-size: 2rem; margin-bottom: 8px;">🔍</div>
        No matching commands found.
      </div>
    `;
    return;
  }

  container.innerHTML = '';
  filteredCommands.forEach((cmd, idx) => {
    const el = document.createElement('div');
    el.className = `command-item ${idx === selectedIndex ? 'selected' : ''}`;
    el.style.cssText = `
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 16px;
      margin-bottom: 4px;
      border-radius: 10px;
      cursor: pointer;
      background: ${idx === selectedIndex ? 'rgba(99, 102, 241, 0.15)' : 'transparent'};
      border: 1px solid ${idx === selectedIndex ? 'rgba(99, 102, 241, 0.3)' : 'transparent'};
      transition: all 0.15s ease;
    `;

    el.innerHTML = `
      <div style="display: flex; align-items: center; gap: 12px;">
        <span style="font-size: 1.2rem; width: 28px; text-align: center;">${cmd.icon}</span>
        <div>
          <div style="font-weight: 600; color: white; font-size: 0.9rem;">${cmd.title}</div>
          <div style="font-size: 0.78rem; color: #9ca3af;">${cmd.desc}</div>
        </div>
      </div>
      <span style="font-size: 0.72rem; padding: 2px 8px; border-radius: 4px; background: rgba(255,255,255,0.06); color: #9ca3af;">${cmd.section}</span>
    `;

    el.addEventListener('mouseenter', () => {
      selectedIndex = idx;
      updateSelection();
    });

    el.addEventListener('click', () => {
      executeCommand(cmd);
    });

    container.appendChild(el);
  });
}

function updateSelection() {
  const items = document.querySelectorAll('.command-item');
  items.forEach((item, idx) => {
    if (idx === selectedIndex) {
      item.style.background = 'rgba(99, 102, 241, 0.15)';
      item.style.borderColor = 'rgba(99, 102, 241, 0.3)';
    } else {
      item.style.background = 'transparent';
      item.style.borderColor = 'transparent';
    }
  });
}

function executeCommand(cmd) {
  closeCommandPalette();
  switchView(cmd.id);
}

// Bind input event
document.addEventListener('DOMContentLoaded', () => {
  const input = document.getElementById('command-palette-input');
  if (input) {
    input.addEventListener('input', (e) => filterCommands(e.target.value));
    input.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        selectedIndex = (selectedIndex + 1) % filteredCommands.length;
        updateSelection();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        selectedIndex = (selectedIndex - 1 + filteredCommands.length) % filteredCommands.length;
        updateSelection();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredCommands[selectedIndex]) {
          executeCommand(filteredCommands[selectedIndex]);
        }
      }
    });
  }
});
