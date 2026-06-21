import { getSupabaseClient } from './auth.js';
import { state } from './state.js';
import { requestApi } from './common.js';

let updateInterval = null;

export async function initIntelligenceDashboard() {
    console.log('[Intelligence Dash] Initializing unified dashboard...');
    const supabase = getSupabaseClient();
    
    if (!supabase) {
        console.warn('[Intelligence Dash] Supabase client not initialized. Retrying in 2s...');
        setTimeout(initIntelligenceDashboard, 2000);
        return;
    }

    // Initial load
    await refreshDashboardMetrics(supabase);
    await refreshPriorityActions(supabase);

    // Setup polling for live updates (every 30 seconds)
    if (updateInterval) clearInterval(updateInterval);
    updateInterval = setInterval(async () => {
        // Only refresh if we are currently looking at the dash
        if (state.currentActiveView === 'unified-intelligence-dash') {
            await refreshDashboardMetrics(supabase);
            await refreshPriorityActions(supabase);
        }
    }, 30000);
}

async function refreshDashboardMetrics(supabase) {
    const appId = state.currentActiveApp || 'default';
    
    try {
        // 1. Fetch Agent Status
        const { data: agentData, error: agentError } = await supabase
            .from('agent_operations')
            .select('id, status')
            .eq('app_id', appId)
            .in('status', ['pending', 'executing']);
            
        if (!agentError) {
            const activeCount = agentData ? agentData.length : 0;
            const el = document.getElementById('dash-metric-agents');
            const descEl = document.getElementById('dash-metric-agents-desc');
            if (el) el.innerHTML = `${activeCount} Active`;
            if (descEl) descEl.innerHTML = activeCount > 0 ? `Executing growth tasks` : `All systems nominal`;
        }

        // 2. Fetch Active Opportunities & Threats
        // Note: Using inner join syntax for Supabase JS client based on our RLS setup.
        // Assuming competitor_events references competitors which references businesses.
        // We might just query all since RLS restricts to the user's businesses anyway.
        const { data: eventData, error: eventError } = await supabase
            .from('competitor_events')
            .select('threat, competitors!inner(app_id)')
            .eq('competitors.app_id', appId);

        if (!eventError) {
            let ops = 0;
            let threats = 0;
            if (eventData) {
                eventData.forEach(e => {
                    if (e.threat === 'opportunity') ops++;
                    if (e.threat === 'high') threats++;
                });
            }
            
            const opsEl = document.getElementById('dash-metric-opportunities');
            if (opsEl) opsEl.innerHTML = `${ops} Detected`;
            
            const threatEl = document.getElementById('dash-metric-threats');
            if (threatEl) threatEl.innerHTML = `${threats} Critical`;
        }
    } catch (err) {
        console.error('[Intelligence Dash] Error refreshing metrics:', err);
    }
}

async function refreshPriorityActions(supabase) {
    const appId = state.currentActiveApp || 'default';
    const listContainer = document.getElementById('agent-priority-actions-list');
    if (!listContainer) return;

    try {
        const { data, error } = await supabase
            .from('agent_operations')
            .select('*')
            .eq('app_id', appId)
            .eq('requires_approval', true)
            .eq('approved', false)
            .order('created_at', { ascending: false });

        if (error) throw error;

        if (!data || data.length === 0) {
            listContainer.innerHTML = `
                <div style="text-align: center; color: var(--text-muted); padding: 20px;">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="margin-bottom:12px; opacity:0.3;"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    <p>No pending actions.</p>
                    <p style="font-size:0.8rem;">Your autonomous agents are handling everything.</p>
                </div>
            `;
            return;
        }

        listContainer.innerHTML = '';
        data.forEach(action => {
            const el = document.createElement('div');
            el.style = "padding:16px; background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.08); border-radius:8px; display:flex; justify-content:space-between; align-items:center;";
            
            el.innerHTML = `
                <div>
                  <div style="font-weight:600; color:white; margin-bottom:4px;">Approve: ${action.task_goal}</div>
                  <div style="font-size:0.85rem; color:var(--text-sub);">${action.agent_name} recommendation: ${action.recommendation || 'Please review.'}</div>
                </div>
                <button class="btn btn-primary approve-btn" data-id="${action.id}">Approve</button>
            `;
            listContainer.appendChild(el);
        });

        // Add event listeners
        listContainer.querySelectorAll('.approve-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const id = e.target.getAttribute('data-id');
                e.target.innerText = 'Approving...';
                e.target.disabled = true;
                
                const appId = state.currentActiveApp || 'default';
                
                try {
                    await requestApi('/api/agents/orchestration/approve', 'POST', {
                        operationId: id,
                        appId: appId
                    });
                } catch (err) {
                    console.error("Failed to approve orchestration:", err);
                }
                    
                await refreshPriorityActions(supabase);
            });
        });

    } catch (err) {
        console.error('[Intelligence Dash] Error refreshing actions:', err);
        listContainer.innerHTML = `
            <div style="text-align: center; color: #f87171; padding: 20px;">
                Unable to load agent recommendations.
            </div>
        `;
    }
}
