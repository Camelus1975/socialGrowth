import { requestApi } from './common.js';
import { state } from './state.js';

export function initCommandCenter() {
    console.log('[Command Center] Initializing...');
    
    const inputEl = document.getElementById('command-center-input');
    const submitBtn = document.getElementById('command-center-submit');
    
    if (!inputEl || !submitBtn) return;
    
    submitBtn.addEventListener('click', () => submitGoal(inputEl.value));
    inputEl.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            submitGoal(inputEl.value);
        }
    });

    // Add click listeners to the suggestion pills
    const pills = document.querySelectorAll('#view-growth-command-center span[style*="cursor:pointer"]');
    pills.forEach(pill => {
        pill.addEventListener('click', () => {
            // Extract text from quotes
            const text = pill.innerText.replace(/"/g, '');
            inputEl.value = text;
            submitGoal(text);
        });
    });
}

async function submitGoal(goalText) {
    if (!goalText || !goalText.trim()) return;
    
    const feedEl = document.getElementById('command-center-feed');
    const inputEl = document.getElementById('command-center-input');
    const submitBtn = document.getElementById('command-center-submit');
    const appId = state.currentActiveApp || 'default';
    
    // Clear input
    inputEl.value = '';
    inputEl.disabled = true;
    submitBtn.disabled = true;

    // Append User Message
    const userMsg = document.createElement('div');
    userMsg.style = "align-self:flex-end; background:var(--primary); padding:16px 20px; border-radius:16px; border-bottom-right-radius:4px; max-width:70%; color:white; animation: fade-in 0.3s ease-out;";
    userMsg.innerText = goalText;
    feedEl.appendChild(userMsg);
    
    // Append Loading State
    const loadingMsg = document.createElement('div');
    loadingMsg.style = "align-self:flex-start; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.1); padding:20px; border-radius:16px; border-bottom-left-radius:4px; max-width:80%; animation: fade-in 0.3s ease-out;";
    loadingMsg.innerHTML = `
        <div style="display:flex; align-items:center; gap:10px;">
            <div class="spinner"></div>
            <strong style="color:var(--text-sub);">AI Strategy Planner is orchestrating agents...</strong>
        </div>
    `;
    feedEl.appendChild(loadingMsg);
    feedEl.scrollTop = feedEl.scrollHeight;

    try {
        const response = await requestApi('/api/agents/orchestration/trigger', 'POST', {
            appId: appId,
            goal: goalText,
            businessType: 'saas',
            campaignType: 'both'
        });

        // Remove loading state
        feedEl.removeChild(loadingMsg);

        if (response && response.success) {
            // Append System Success Message
            const sysMsg = document.createElement('div');
            sysMsg.style = "align-self:flex-start; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.1); padding:20px; border-radius:16px; border-bottom-left-radius:4px; max-width:80%; animation: fade-in 0.3s ease-out;";
            
            let stepsHtml = '';
            if (response.steps && response.steps.length > 0) {
                stepsHtml = `<div style="background:rgba(0,0,0,0.3); padding:16px; border-radius:8px; margin-top:16px;">
                    <strong style="color:white; display:block; margin-bottom:12px;">Orchestration Log:</strong>
                    <ul style="color:var(--text-sub); margin-left:20px; display:flex; flex-direction:column; gap:8px;">
                        ${response.steps.map(s => `<li><strong>${s.agent}:</strong> ${s.log}</li>`).join('')}
                    </ul>
                </div>`;
            }

            sysMsg.innerHTML = `
                <div style="display:flex; align-items:center; gap:10px; margin-bottom:16px;">
                    <div style="width:32px; height:32px; background:linear-gradient(135deg, #6366f1, #8b5cf6); border-radius:8px; display:flex; align-items:center; justify-content:center; color:white; font-weight:bold;">▲</div>
                    <strong style="color:white;">AI Strategy Planner</strong>
                </div>
                <p style="color:var(--text-sub); margin-bottom:16px; line-height:1.6;">I have analyzed your goal and orchestrated the required agents.</p>
                ${stepsHtml}
                <div style="margin-top:16px; display:flex; gap:12px;">
                    <button class="btn btn-primary" onclick="switchView('unified-intelligence-dash', this)">Review Actions in Dashboard</button>
                </div>
            `;
            feedEl.appendChild(sysMsg);
        } else {
            throw new Error(response?.error || 'Orchestration failed');
        }
    } catch (err) {
        console.error('[Command Center] Error:', err);
        // Remove loading state if it's still there
        if (loadingMsg.parentNode) feedEl.removeChild(loadingMsg);
        
        const errorMsg = document.createElement('div');
        errorMsg.style = "align-self:flex-start; background:rgba(239,68,68,0.1); border:1px solid rgba(239,68,68,0.3); padding:20px; border-radius:16px; border-bottom-left-radius:4px; max-width:80%; animation: fade-in 0.3s ease-out;";
        errorMsg.innerHTML = `<strong style="color:#f87171;">System Error:</strong> <span style="color:var(--text-sub);">${err.message}</span>`;
        feedEl.appendChild(errorMsg);
    } finally {
        inputEl.disabled = false;
        submitBtn.disabled = false;
        feedEl.scrollTop = feedEl.scrollHeight;
        inputEl.focus();
    }
}
