import { getSupabaseClient } from './auth.js';
import { state } from './state.js';

let isInitialized = false;

export function initCompetitorIntelligence() {
  if (!isInitialized) {
    state.on('appChanged', () => {
      if (state.currentActiveView === 'competitor-intelligence') {
        loadCompetitorIntelligence();
      }
    });
    
    state.on('viewChanged', (viewId) => {
      if (viewId === 'competitor-intelligence') {
        loadCompetitorIntelligence();
      }
    });
    
    isInitialized = true;
  }
  
  if (state.currentActiveView === 'competitor-intelligence') {
    loadCompetitorIntelligence();
  }
}

async function loadCompetitorIntelligence() {
  console.log('[Competitor Intelligence] Loading...');
  
  const metricTracked = document.getElementById('comp-metric-tracked');
  const metricPricing = document.getElementById('comp-metric-pricing');
  const metricGaps = document.getElementById('comp-metric-gaps');
  const feedEl = document.getElementById('competitor-activity-feed');
  
  if (!metricTracked || !feedEl) return;
  
  const appId = state.currentActiveApp;
  
  if (!appId) {
    metricTracked.innerText = '-';
    metricPricing.innerText = '-';
    metricGaps.innerText = '-';
    feedEl.innerHTML = `
      <tr>
        <td colspan="5" class="mod-style-dGV4dC1h">Please select a business to view competitor intelligence.</td>
      </tr>
    `;
    return;
  }

  const supabase = getSupabaseClient();
  if (!supabase) return;
  
  try {
    // 1. Fetch competitors
    const { data: competitors, error: compErr } = await supabase
      .from('competitors')
      .select('id, name')
      .eq('app_id', appId);
      
    if (compErr) throw compErr;
    
    const competitorCount = competitors ? competitors.length : 0;
    metricTracked.innerText = competitorCount;
    
    if (competitorCount === 0) {
      metricPricing.innerText = '0';
      metricGaps.innerText = '0';
      feedEl.innerHTML = `
        <tr>
          <td colspan="5" class="mod-style-dGV4dC1h">No competitors tracked yet. Add competitors to begin intelligence gathering.</td>
        </tr>
      `;
      return;
    }
    
    // Map of competitor ID to Name
    const compMap = {};
    competitors.forEach(c => compMap[c.id] = c.name);
    
    // 2. Fetch events
    const compIds = competitors.map(c => c.id);
    const { data: events, error: evErr } = await supabase
      .from('competitor_events')
      .select('*')
      .in('competitor_id', compIds)
      .order('created_at', { ascending: false })
      .limit(20);
      
    if (evErr) throw evErr;
    
    // Calculate metrics
    let pricingCount = 0;
    let gapsCount = 0;
    
    events?.forEach(ev => {
      if (ev.event_type === 'pricing') pricingCount++;
      if (ev.threat === 'opportunity') gapsCount++; // Treating 'opportunity' threat level as a gap closed / feature gap found
    });
    
    metricPricing.innerText = pricingCount.toString();
    metricGaps.innerText = gapsCount.toString();
    
    if (!events || events.length === 0) {
      feedEl.innerHTML = `
        <tr>
          <td colspan="5" class="mod-style-dGV4dC1h">No competitor events detected recently.</td>
        </tr>
      `;
      return;
    }
    
    // 3. Render Table
    let html = '';
    
    events.forEach(ev => {
      const compName = compMap[ev.competitor_id] || 'Unknown';
      
      // Determine Threat styles
      let threatColor = 'var(--text-sub)';
      let threatText = ev.threat || 'Unknown';
      
      if (ev.threat === 'high') threatColor = '#f87171'; // red
      else if (ev.threat === 'medium') threatColor = '#f59e0b'; // orange
      else if (ev.threat === 'low') threatColor = 'var(--text-sub)'; // gray
      else if (ev.threat === 'opportunity') threatColor = 'var(--accent-green)'; // green
      
      // Capitalize threat text
      threatText = threatText.charAt(0).toUpperCase() + threatText.slice(1);
      
      // Determine Event Type badge
      let badgeBg = 'rgba(255,255,255,0.1)';
      let badgeColor = 'white';
      let typeText = ev.event_type || 'Update';
      
      if (ev.event_type === 'pricing') {
        badgeBg = 'rgba(99,102,241,0.2)';
        badgeColor = '#818cf8'; // indigo
      } else if (ev.event_type === 'feature') {
        badgeBg = 'rgba(236,72,153,0.2)';
        badgeColor = '#ec4899'; // pink
      } else if (ev.event_type === 'marketing') {
        badgeBg = 'rgba(245,158,11,0.2)';
        badgeColor = '#fcd34d'; // yellow
      }
      
      typeText = typeText.charAt(0).toUpperCase() + typeText.slice(1);
      
      // Generate random color for avatar based on name length
      const avatarColors = ['var(--primary)', 'var(--accent-green)', '#f59e0b', '#ec4899', '#8b5cf6'];
      const aColor = avatarColors[compName.length % avatarColors.length];
      
      const dateStr = new Date(ev.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

      html += `
        <tr class="mod-style-Ym9yZGVy">
          <td class="mod-style-cGFkZGlu">
            <div style="width:24px; height:24px; background:${aColor}; border-radius:4px; display:flex; align-items:center; justify-content:center; font-size:12px; font-weight:bold;">${compName.charAt(0)}</div>
            <strong>${compName}</strong>
          </td>
          <td class="mod-style-cGFkZGlu"><span class="alert-tag" style="background:${badgeBg}; color:${badgeColor};">${typeText}</span></td>
          <td class="mod-style-cGFkZGlu">${ev.description || ''}</td>
          <td class="mod-style-cGFkZGlu">${dateStr}</td>
          <td class="mod-style-cGFkZGlu"><span style="color:${threatColor};">${threatText}</span></td>
        </tr>
      `;
    });
    
    feedEl.innerHTML = html;
    
  } catch (err) {
    console.error('[Competitor Intelligence] Error fetching data:', err);
    feedEl.innerHTML = `
      <tr>
        <td colspan="5" class="mod-style-dGV4dC1h">Failed to load competitor intelligence.</td>
      </tr>
    `;
  }
}
