import { getSupabaseClient } from './auth.js';
import { state } from './state.js';

let isInitialized = false;

export function initMemoryEngine() {
  if (!isInitialized) {
    state.on('appChanged', () => {
      if (state.currentActiveView === 'growth-memory') {
        loadMemoryEngine();
      }
    });
    
    state.on('viewChanged', (viewId) => {
      if (viewId === 'growth-memory') {
        loadMemoryEngine();
      }
    });
    
    isInitialized = true;
  }
  
  if (state.currentActiveView === 'growth-memory') {
    loadMemoryEngine();
  }
}

async function loadMemoryEngine() {
  const timelineEl = document.getElementById('memory-timeline-feed');
  if (!timelineEl) return;
  
  const appId = state.currentActiveApp;
  if (!appId) {
    timelineEl.innerHTML = `
      <div class="mod-style-Y29sb3I6">
        Please select a business from the top dropdown to view its memories.
      </div>
    `;
    return;
  }
  
  const supabase = getSupabaseClient();
  if (!supabase) return;
  
  try {
    const { data, error } = await supabase
      .from('growth_memory_events')
      .select('*')
      .eq('app_id', appId)
      .order('created_at', { ascending: false })
      .limit(20);
      
    if (error) throw error;
    
    if (!data || data.length === 0) {
      timelineEl.innerHTML = `
        <div class="mod-style-Y29sb3I6">
          No growth memories found for this business yet.
        </div>
      `;
      return;
    }
    
    let html = '';
    
    data.forEach(event => {
      // Determine styles based on event_type
      let color = 'var(--primary)'; // Default blue
      let typeLabel = 'EVENT';
      
      if (event.event_type === 'success' || event.event_type === 'revenue') {
        color = 'var(--accent-green)';
        typeLabel = event.event_type === 'success' ? 'SUCCESS PATTERN' : 'REVENUE EVENT';
      } else if (event.event_type === 'failure') {
        color = '#f87171'; // red
        typeLabel = 'FAILURE PATTERN';
      } else if (event.event_type === 'competitor') {
        color = 'var(--primary)';
        typeLabel = 'COMPETITOR EVENT';
      }
      
      const dateStr = new Date(event.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      
      let tagsHtml = '';
      if (event.tags && Array.isArray(event.tags)) {
        tagsHtml = event.tags.map(tag => `<span class="alert-tag mod-style-YmFja2dy">${tag}</span>`).join('');
      }

      html += `
        <div class="mod-style-cG9zaXRp">
          <div style="position:absolute; left:-39px; top:0; width:16px; height:16px; border-radius:50%; background:${color}; border:4px solid var(--bg-card);"></div>
          <div style="font-size:0.8rem; color:${color}; font-weight:600; margin-bottom:4px;">${typeLabel} • ${dateStr}</div>
          <h4 class="mod-style-Y29sb3I6">${event.title || 'Untitled Memory'}</h4>
          <p class="mod-style-Y29sb3I6">${event.content_text || ''}</p>
          <div class="mod-style-ZGlzcGxh">
            ${tagsHtml}
          </div>
        </div>
      `;
    });
    
    timelineEl.innerHTML = html;
    
  } catch (err) {
    console.error('[Memory Engine] Failed to fetch timeline:', err);
    timelineEl.innerHTML = `
      <div class="mod-style-Y29sb3I6">
        Error loading timeline events.
      </div>
    `;
  }
}

export async function searchGrowthMemoryUI() {
  const input = document.getElementById('memory-search-input');
  const resultsContainer = document.getElementById('memory-search-results');
  
  if (!input || !input.value.trim() || !resultsContainer) return;

  const query = input.value.trim();
  resultsContainer.innerHTML = `<div class="mod-style-Y29sb3I6">[System] Querying Growth Engine Time Machine for "${query}"...</div>`;
  input.value = '';

  try {
    // In a real scenario, this would hit an endpoint like /api/memory/search
    // For this demonstration, we simulate the RAG retrieval response based on the new Phase 4 model.
    setTimeout(() => {
      resultsContainer.innerHTML = `
        <div class="mod-style-bWFyZ2lu">
          <strong class="mod-style-Y29sb3I6">[Insight Found]</strong> 
          Based on 14 cross-business memories, your most successful lead generation campaign across SaaS and Dental Clinics was "Free Audit Lead Magnet" which generated 120 qualified leads with a 40% close rate. The winning pattern was outbound cold emails sent on Tuesdays at 10 AM, driving traffic to a VSL landing page.
        </div>
        <div class="mod-style-Y29sb3I6">
          Confidence Score: 92% | Data Sources: BusinessPilot (80%), SmileDental (20%)
        </div>
      `;
    }, 1500);
  } catch (error) {
    console.error("Memory Search Error:", error);
    resultsContainer.innerHTML = `<div class="mod-style-Y29sb3I6">Error querying memory bank.</div>`;
  }
}

// Ensure it is available globally for inline onclick handlers
window.searchGrowthMemoryUI = searchGrowthMemoryUI;
