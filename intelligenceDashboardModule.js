import { getSupabaseClient } from './auth.js';
import { state } from './state.js';
import { requestApi } from './common.js';

let realtimeChannel = null;
let isInitialized = false;

export async function initIntelligenceDashboard() {
    console.log('[Intelligence Dash] Initializing unified dashboard...');
    
    if (!isInitialized) {
        state.on('appChanged', () => {
            if (state.currentActiveView === 'unified-intelligence-dash') {
                const supabase = getSupabaseClient();
                if (supabase) {
                    refreshDashboardMetrics(supabase);
                    refreshPriorityActions(supabase);
                }
            }
        });
        isInitialized = true;
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
        console.warn('[Intelligence Dash] Supabase client not initialized. Retrying in 2s...');
        setTimeout(initIntelligenceDashboard, 2000);
        return;
    }

    // Initial load
    await refreshDashboardMetrics(supabase);
    await refreshPriorityActions(supabase);

    // Setup Real-Time Subscriptions
    if (realtimeChannel) supabase.removeChannel(realtimeChannel);
    
    realtimeChannel = supabase
        .channel('dashboard-updates')
        .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'agent_operations' },
            (payload) => {
                console.log('[Intelligence Dash] Realtime agent_operations update:', payload);
                if (state.currentActiveView === 'unified-intelligence-dash') {
                    refreshDashboardMetrics(supabase);
                    refreshPriorityActions(supabase);
                    
                    // Instant Visual Flashing Effect
                    const dashHeader = document.querySelector('#view-unified-intelligence-dash h2');
                    if (dashHeader) {
                        const origColor = dashHeader.style.color;
                        dashHeader.style.transition = 'color 0.3s ease';
                        dashHeader.style.color = '#818cf8';
                        dashHeader.style.textShadow = '0 0 10px rgba(129, 140, 248, 0.8)';
                        setTimeout(() => {
                            dashHeader.style.color = origColor;
                            dashHeader.style.textShadow = 'none';
                        }, 800);
                    }
                }
            }
        )
        .subscribe((status) => {
            console.log('[Intelligence Dash] Realtime subscription status:', status);
        });
}

async function refreshDashboardMetrics(supabase) {
    const appId = state.currentActiveApp;
    
    if (!appId) {
        const opsEl = document.getElementById('dash-metric-opportunities');
        if (opsEl) opsEl.innerHTML = `-`;
        const threatEl = document.getElementById('dash-metric-threats');
        if (threatEl) threatEl.innerHTML = `-`;
        const el = document.getElementById('dash-metric-agents');
        if (el) el.innerHTML = `-`;
        return;
    }

    
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
    const appId = state.currentActiveApp;
    const listContainer = document.getElementById('agent-priority-actions-list');
    if (!listContainer) return;

    if (!appId) {
        listContainer.innerHTML = `
            <div class="mod-style-dGV4dC1h">
                <p>Please select a business to view pending actions.</p>
            </div>
        `;
        return;
    }

    try {
        const { data, error } = await supabase
            .from('agent_operations')
            .select('*')
            .eq('app_id', appId)
            .order('created_at', { ascending: false })
            .limit(10);

        if (error) throw error;

        if (!data || data.length === 0) {
            listContainer.innerHTML = `
                <div class="mod-style-dGV4dC1h">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="mod-style-bWFyZ2lu"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    <p>No pending actions.</p>
                    <p class="mod-style-Zm9udC1z">Your autonomous agents are handling everything.</p>
                </div>
            `;
            return;
        }

        listContainer.innerHTML = '';
        data.forEach(action => {
            const el = document.createElement('div');
            el.style = "padding:16px; background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.08); border-radius:8px; display:flex; justify-content:space-between; align-items:center; margin-bottom: 8px;";
            
            let actionHtml = '';
            if (!action.approved) {
              actionHtml = `
                <div>
                  <div class="mod-style-Zm9udC13">Pending: ${action.task_goal}</div>
                  <div class="mod-style-Zm9udC1z" style="color: #9ca3af; font-size: 0.9em; margin-top: 4px;">${action.agent_name}: ${action.recommendation || 'Please review.'}</div>
                </div>
                <button class="btn btn-primary approve-btn" data-id="${action.id}">Approve</button>
              `;
            } else if (action.status === 'live') {
              let badgeText = 'Live';
              let badgeColor = '#10b981'; // Green
              if (action.agent_name.includes('Advertising')) badgeText = 'Live on Google';
              else if (action.agent_name.includes('Content')) badgeText = 'Live on Meta';

              actionHtml = `
                <div>
                  <div class="mod-style-Zm9udC13" style="color: #10b981;">✓ Executed: ${action.task_goal}</div>
                  <div class="mod-style-Zm9udC1z" style="color: #9ca3af; font-size: 0.9em; margin-top: 4px;">${action.agent_name}: ${action.recommendation || 'Action complete.'}</div>
                </div>
                <span style="background: rgba(16, 185, 129, 0.2); color: ${badgeColor}; padding: 4px 8px; border-radius: 4px; font-size: 0.8em; font-weight: bold;">${badgeText}</span>
              `;
            } else if (action.status === 'executing' || action.status === 'pending') {
              actionHtml = `
                <div>
                  <div class="mod-style-Zm9udC13" style="color: #fbbf24;">⚙ Processing: ${action.task_goal}</div>
                  <div class="mod-style-Zm9udC1z" style="color: #9ca3af; font-size: 0.9em; margin-top: 4px;">${action.agent_name} is currently executing this action...</div>
                </div>
                <span style="color: #fbbf24; font-size: 0.8em;">In Progress</span>
              `;
            } else {
               // completed or generic or failed
              actionHtml = `
                <div>
                  <div class="mod-style-Zm9udC13" style="color: #9ca3af;">✓ ${action.status}: ${action.task_goal}</div>
                </div>
                <span style="color: #9ca3af; font-size: 0.8em; text-transform: capitalize;">${action.status}</span>
              `;
            }

            el.innerHTML = actionHtml;
            listContainer.appendChild(el);
        });

        // Add event listeners
        listContainer.querySelectorAll('.approve-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const id = e.target.getAttribute('data-id');
                e.target.innerText = 'Approving...';
                e.target.disabled = true;
                
                const appId = state.currentActiveApp;
                if (!appId) return;
                
                try {
                    await requestApi('/api/agents/orchestration/approve', { method: 'POST', body: JSON.stringify({
                        operationId: id,
                        appId: appId
                    }) });
                } catch (err) {
                    console.error("Failed to approve orchestration:", err);
                }
                    
                await refreshPriorityActions(supabase);
            });
        });

    } catch (err) {
        console.error('[Intelligence Dash] Error refreshing actions:', err);
        listContainer.innerHTML = `
            <div class="mod-style-dGV4dC1h">
                Unable to load agent recommendations.
            </div>
        `;
    }
}
