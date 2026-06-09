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

export function submitAgentConsoleCommand() {
  const input = document.getElementById('agent-console-input');
  if (!input) return;
  const cmd = input.value.trim();
  if (cmd) {
    appendTerminalLog('founder', cmd);
    input.value = '';
    setTimeout(() => {
      appendTerminalLog('growth-agent', "Growth Agent: Parsing direct query command parameters. Dispatching tasks...");
    }, 1000);
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
    { node: 'node-analytics', status: "Analytics Agent Detected MRR drop on FitPulse", desc: "Funnel checks show WearOS segment user drops.", line: 'line-an-gr' },
    { node: 'node-growth', status: "Growth Agent Auditing Conversion Gaps", desc: "Identified competitor launched WearOS challenge campaigns.", line: 'line-gr-aso' },
    { node: 'node-aso', status: "ASO Agent Optimizing App Store Subtitles", desc: "Recommended tags updates for 'WearOS fitness sync'.", line: 'line-aso-mkt' },
    { node: 'node-marketing', status: "Marketing Agent Designing Promo Sequence", desc: "Constructing challenge warm-up countdown posts.", line: 'line-mkt-cnt' },
    { node: 'node-content', status: "Content Agent Generating Copy Thread Variations", desc: "Created Twitter variant campaign packages.", line: 'line-cnt-sch' },
    { node: 'node-scheduler', status: "Scheduler Agent Publishing Campaign To Calendar Queue", desc: "BullMQ queue scheduled post. Pipelines finished.", line: null }
  ];
  
  try {
    const data = await requestApi('/api/agents/orchestration/trigger', { method: 'POST' });
    steps = [
      { node: 'node-analytics', status: data.steps[0].log, desc: "Funnel checks show active user drops.", line: 'line-an-gr' },
      { node: 'node-growth', status: data.steps[1].log, desc: "Identified competitor launched campaign updates.", line: 'line-gr-aso' },
      { node: 'node-aso', status: data.steps[2].log, desc: "Recommended keyword metadata tags.", line: 'line-aso-mkt' },
      { node: 'node-marketing', status: data.steps[3].log, desc: "Constructing launch calendar sequences.", line: 'line-mkt-cnt' },
      { node: 'node-content', status: data.steps[4].log, desc: "Created copy variant campaigns packages.", line: 'line-cnt-sch' },
      { node: 'node-scheduler', status: data.steps[5].log, desc: "Dispatched posts in queue scheduler.", line: null }
    ];
  } catch (err) {
    console.warn("Express orchestration pipeline offline. Relying on default simulation variables.");
  }
  
  const nodes = document.querySelectorAll('.agent-flow-node');
  nodes.forEach(n => n.className = 'agent-flow-node');
  
  const lines = document.querySelectorAll('.agent-flow-line');
  lines.forEach(l => l.className = 'agent-flow-line');
  
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
    
    if (step.line) {
      const lineEl = document.getElementById(step.line);
      if (lineEl) lineEl.className = 'agent-flow-line active';
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
