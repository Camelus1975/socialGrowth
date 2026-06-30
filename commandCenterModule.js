import { requestApi } from './common.js';
import { switchView } from './app.js';
import { state } from './state.js';

let isInitialized = false;

export function initCommandCenter() {
    console.log('[Command Center] Initializing...');
    
    if (!isInitialized) {
        state.on('appChanged', () => {
            const feedEl = document.getElementById('command-center-feed');
            if (feedEl) feedEl.innerHTML = ''; // Clear feed when switching apps
        });
        isInitialized = true;
    }
    
    const inputEl = document.getElementById('command-center-input');
    const submitBtn = document.getElementById('command-center-submit');
    
    if (!inputEl || !submitBtn) return;
    
    // Check if listener is already added
    if (!submitBtn.dataset.listenerAdded) {
        submitBtn.addEventListener('click', () => submitGoal(inputEl.value));
        inputEl.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                submitGoal(inputEl.value);
            }
        });
        submitBtn.dataset.listenerAdded = 'true';

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
}

async function submitGoal(goalText) {
    if (!goalText || !goalText.trim()) return;
    
    const feedEl = document.getElementById('command-center-feed');
    const inputEl = document.getElementById('command-center-input');
    const submitBtn = document.getElementById('command-center-submit');
    const appId = state.currentActiveApp;
    
    if (!appId) {
        alert("Please select a business first.");
        return;
    }
    
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
        <div class="mod-style-ZGlzcGxh">
            <div class="spinner"></div>
            <strong class="mod-style-Y29sb3I6">AI Strategy Planner is orchestrating agents...</strong>
        </div>
    `;
    feedEl.appendChild(loadingMsg);
    feedEl.scrollTop = feedEl.scrollHeight;

    try {
        const response = await requestApi('/api/agents/orchestration/trigger', { method: 'POST', body: JSON.stringify({
            appId: appId,
            goal: goalText,
            businessType: 'saas',
            campaignType: 'both'
        }) });

        // Remove loading state
        feedEl.removeChild(loadingMsg);

        if (response && response.success) {
            // Append System Success Message
            const sysMsg = document.createElement('div');
            sysMsg.style = "align-self:flex-start; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.1); padding:20px; border-radius:16px; border-bottom-left-radius:4px; max-width:80%; animation: fade-in 0.3s ease-out;";
            
            let stepsHtml = '';
            if (response.steps && response.steps.length > 0) {
                stepsHtml = `<div class="mod-style-YmFja2dy">
                    <strong class="mod-style-Y29sb3I6">Orchestration Log:</strong>
                    <ul class="mod-style-Y29sb3I6">
                        ${response.steps.map(s => `<li><strong>${s.agent}:</strong> ${s.log}</li>`).join('')}
                    </ul>
                </div>`;
            }

            sysMsg.innerHTML = `
                <div class="mod-style-ZGlzcGxh">
                    <div class="mod-style-d2lkdGg6">▲</div>
                    <strong class="mod-style-Y29sb3I6">AI Strategy Planner</strong>
                </div>
                <p class="mod-style-Y29sb3I6">I have started orchestrating your strategy. Redirecting you to the Intelligence Dashboard to monitor progress in real-time...</p>
                ${stepsHtml}
                <div class="mod-style-bWFyZ2lu">
                    <button class="btn btn-primary" data-action="switchView" data-args="unified-intelligence-dash|this">Review Actions in Dashboard</button>
                </div>
            `;
            feedEl.appendChild(sysMsg);
            setTimeout(() => switchView('unified-intelligence-dash'), 1500);
        } else {
            throw new Error(response?.error || 'Orchestration failed');
        }
    } catch (err) {
        console.error('[Command Center] Error:', err);
        // Remove loading state if it's still there
        if (loadingMsg.parentNode) feedEl.removeChild(loadingMsg);
        
        const errorMsg = document.createElement('div');
        errorMsg.style = "align-self:flex-start; background:rgba(239,68,68,0.1); border:1px solid rgba(239,68,68,0.3); padding:20px; border-radius:16px; border-bottom-left-radius:4px; max-width:80%; animation: fade-in 0.3s ease-out;";
        errorMsg.innerHTML = `<strong class="mod-style-Y29sb3I6">System Error:</strong> <span class="mod-style-Y29sb3I6">${err.message}</span>`;
        feedEl.appendChild(errorMsg);
    } finally {
        inputEl.disabled = false;
        submitBtn.disabled = false;
        feedEl.scrollTop = feedEl.scrollHeight;
        inputEl.focus();
    }
}

