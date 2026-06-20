// App Founder Growth Suite - AI Agent Framework Module
import { state } from './state.js';
import { requestApi, showToast, createSafeElement } from './common.js';

let agentSimInterval = null;
let agentSimStep = 0;
let activeOrchInterval = null;

export function initAgentFramework() {
  state.on('viewChanged', (viewId) => {
    if (viewId !== 'agent-framework') {
      if (agentSimInterval) {
        clearInterval(agentSimInterval);
        agentSimInterval = null;
        const btn = document.getElementById('toggle-agent-simulation-btn');
        if (btn) btn.textContent = "Start Agent Simulation";
      }
    }
    if (viewId !== 'agent-orchestration') {
      if (activeOrchInterval) {
        clearInterval(activeOrchInterval);
        activeOrchInterval = null;
      }
    }
  });
  
  // Console Command Input keydown listener
  const consoleInput = document.getElementById('agent-console-input');
  if (consoleInput) {
    consoleInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        submitAgentConsoleCommand();
      }
    });
  }
}

export function toggleAgentSimulation() {
  const btn = document.getElementById('toggle-agent-simulation-btn');
  if (!btn) return;
  
  const simulatedConversation = [
    { sender: 'system', msg: 'System: Initializing joint marketing project cycle [SaaS-Sprint-09]...' },
    { sender: 'growth-agent', msg: 'Growth Agent: Funnel audits highlight WearOS segment drops.' },
    { sender: 'aso-agent', msg: 'ASO Agent: Baremetrics keyword rankings dropped. Recommending subtitles updates.' },
    { sender: 'system', msg: 'System: Multi-agent loop run complete.' }
  ];
  
  if (agentSimInterval) {
    clearInterval(agentSimInterval);
    agentSimInterval = null;
    btn.textContent = "Start Agent Simulation";
  } else {
    btn.textContent = "Pause Simulation";
    agentSimInterval = setInterval(() => {
      if (agentSimStep >= simulatedConversation.length) agentSimStep = 0;
      const log = simulatedConversation[agentSimStep];
      appendTerminalLog(log.sender, log.msg);
      agentSimStep++;
    }, 2500);
  }
}

export function appendTerminalLog(sender, message) {
  const consoleEl = document.getElementById('agent-terminal-logs');
  if (!consoleEl) return;
  
  const now = new Date();
  const time = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
  
  const entry = createSafeElement('div', ['terminal-log-entry']);
  
  const timeSpan = createSafeElement('span', ['log-time'], `[${time}] `);
  const senderStrong = createSafeElement('strong', [], `${sender}: `);
  senderStrong.style.color = 'var(--primary)';
  
  const msgSpan = createSafeElement('span', [], message);
  
  entry.appendChild(timeSpan);
  entry.appendChild(senderStrong);
  entry.appendChild(msgSpan);
  
  consoleEl.appendChild(entry);
  consoleEl.scrollTop = consoleEl.scrollHeight;
}

export async function submitAgentConsoleCommand() {
  const input = document.getElementById('agent-console-input');
  if (!input) return;
  const cmd = input.value.trim();
  if (cmd) {
    appendTerminalLog('founder', cmd);
    input.value = '';
    appendTerminalLog('CMO Agent', "Received executive command. Drafting strategy and organizing AI task force... (Please wait ~15s)");
    
    // Call the real backend orchestration
    try {
      const data = await requestApi('/api/agents/orchestration/trigger', {
        method: 'POST',
        body: JSON.stringify({ 
          goal: cmd, 
          appId: state.currentActiveApp,
          businessType: state.appsData[state.currentActiveApp]?.businessType || 'saas'
        })
      });
      
      if (data.success && data.steps) {
        data.steps.forEach(step => {
          appendTerminalLog(step.agent, step.log);
        });
        
        // Render final CMO Strategy output
        if (data.cmoStrategy) {
          appendTerminalLog('Campaign Manager', "Campaign Portfolio is ready for your review. Check the Strategy Logs.");
        }
      } else {
        appendTerminalLog('System', "Orchestration Pipeline failed to process request.");
      }
    } catch (err) {
      console.error(err);
      appendTerminalLog('System', "Error communicating with Orchestrator API.");
    }
  }
}

export function clearAgentTerminal() {
  const consoleEl = document.getElementById('agent-terminal-logs');
  if (consoleEl) {
    consoleEl.innerHTML = '';
  }
}

export async function startOrchestrationPipelineSimulation() {
  if (activeOrchInterval) {
    clearInterval(activeOrchInterval);
    activeOrchInterval = null;
  }
  
  let steps = [
    { node: 'node-strategy', status: "Strategy Agent Analyzing Objective", desc: "Setting KPIs and parsing intent across 11 modules." },
    { node: 'node-analytics', status: "Analytics Agent Gathering Context", desc: "Pulling historical data and market share." },
    { node: 'node-seo', status: "SEO/ASO Agent Optimizing Keywords", desc: "Found gaps in search intent. Preparing metadata updates." },
    { node: 'node-marketing', status: "Marketing Agent Drafting Campaign", desc: "Building paid ad structure and budget." },
    { node: 'node-content', status: "Content Agent Creating Assets", desc: "Drafting copy, ad variants, and blog outlines." },
    { node: 'node-video', status: "Video Agent Generating Media", desc: "Rendering b-roll and AI voiceovers." },
    { node: 'node-social', status: "Social Agent Preparing Distribution", desc: "Scheduling queue for LinkedIn and Twitter." },
    { node: 'node-reputation', status: "Reputation Agent Syncing", desc: "Flagging potential negative sentiment risks." },
    { node: 'node-crm', status: "CRM Agent Updating Pipeline", desc: "Building lead tracking webhooks." },
    { node: 'node-retention', status: "Retention Agent Drafting Follow-ups", desc: "Queueing onboarding email sequences." },
    { node: 'node-growth', status: "Growth Agent Finalizing Pipeline", desc: "Pipeline completely activated and deployed." }
  ];
  
  try {
    const data = await requestApi('/api/agents/orchestration/trigger', { 
      method: 'POST',
      body: JSON.stringify({ 
        goal: "Execute routine comprehensive cross-platform growth cycle", 
        appId: state.currentActiveApp,
        businessType: state.appsData[state.currentActiveApp]?.businessType || 'saas'
      }) 
    });
    if (data && data.steps && data.steps.length >= 11) {
      steps = [
        { node: 'node-strategy', status: data.steps[0]?.log || "Strategy Agent Analyzing Objective", desc: "Setting KPIs and parsing intent." },
        { node: 'node-analytics', status: data.steps[1]?.log || "Analytics Agent Gathering Context", desc: "Pulling historical data." },
        { node: 'node-seo', status: data.steps[2]?.log || "SEO Agent Optimizing Keywords", desc: "Found gaps in search intent." },
        { node: 'node-marketing', status: data.steps[3]?.log || "Marketing Agent Drafting Campaign", desc: "Building ad structure." },
        { node: 'node-content', status: data.steps[4]?.log || "Content Agent Creating Assets", desc: "Drafting copy." },
        { node: 'node-video', status: data.steps[5]?.log || "Video Agent Generating Media", desc: "Rendering b-roll." },
        { node: 'node-social', status: data.steps[6]?.log || "Social Agent Preparing Distribution", desc: "Scheduling queue." },
        { node: 'node-reputation', status: data.steps[7]?.log || "Reputation Agent Syncing", desc: "Flagging risks." },
        { node: 'node-crm', status: data.steps[8]?.log || "CRM Agent Updating Pipeline", desc: "Building lead tracking." },
        { node: 'node-retention', status: data.steps[9]?.log || "Retention Agent Drafting Follow-ups", desc: "Queueing emails." },
        { node: 'node-growth', status: data.steps[10]?.log || "Growth Agent Finalizing Pipeline", desc: "Pipeline deployed." }
      ];
    }
  } catch (err) {
    console.warn("Express orchestration pipeline offline. Relying on default simulation variables.");
  }
  
  const nodes = document.querySelectorAll('.agent-flow-node');
  nodes.forEach(n => n.className = 'agent-flow-node');
  
  let index = 0;
  const statusText = document.getElementById('orch-status-text');
  const descText = document.getElementById('orch-desc-text');
  
  activeOrchInterval = setInterval(() => {
    if (index >= steps.length) {
      clearInterval(activeOrchInterval);
      activeOrchInterval = null;
      if (statusText) {
        statusText.textContent = "Pipeline run completed successfully!";
        statusText.style.color = "var(--accent-green)";
      }
      if (descText) {
        descText.textContent = "All conversion segments stable. Marketing campaign is live.";
      }
      showToast("Autonomous multi-agent loop run complete!", "success");
      return;
    }
    
    const step = steps[index];
    const nodeEl = document.getElementById(step.node);
    if (nodeEl) {
      nodeEl.className = 'agent-flow-node active';
      for (let j = 0; j < index; j++) {
        const prev = document.getElementById(steps[j].node);
        if (prev) prev.className = 'agent-flow-node completed';
      }
    }
    
    
    
    if (statusText) {
      statusText.textContent = step.status;
      statusText.style.color = "var(--primary)";
    }
    if (descText) {
      descText.textContent = step.desc;
    }
    
    index++;
  }, 2000);
}
