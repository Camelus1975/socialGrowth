import { requestApi } from './common.js';

let isGenerating = false;
let conversationHistory = []; // Add local state for history

export function initCopilotV3(state) {
  const sendBtn = document.getElementById('copilot-send-btn');
  const inputEl = document.getElementById('copilot-input');
  
  if (!sendBtn || !inputEl) return;
  
  const sendMessage = async () => {
    const text = inputEl.value.trim();
    if (!text || isGenerating) return;
    
    inputEl.value = '';
    appendMessage('user', text);
    conversationHistory.push({ role: 'user', content: text }); // Track user msg
    
    isGenerating = true;
    
    const loadingId = appendLoading();
    
    try {
      const response = await requestApi('/api/agent', {
        method: 'POST',
        body: JSON.stringify({
          agentType: 'copilot',
          message: text,
          history: conversationHistory, // Send full history
          context: state
        })
      });
      
      removeLoading(loadingId);
      
      if (response && response.message) {
        appendMessage('ai', response.message);
        conversationHistory.push({ role: 'assistant', content: response.message }); // Track AI msg
        
        if (response.refreshWorkspaces) {
          window.dispatchEvent(new CustomEvent('refreshWorkspaces'));
        }
      } else {
        appendMessage('ai', 'Sorry, I encountered an error processing that.');
      }
    } catch (err) {
      console.error(err);
      removeLoading(loadingId);
      appendMessage('ai', 'System error. Please try again later.');
    } finally {
      isGenerating = false;
    }
  };
  
  sendBtn.addEventListener('click', sendMessage);
  inputEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      sendMessage();
    }
  });
}

function appendMessage(role, text) {
  const history = document.getElementById('copilot-chat-history');
  if (!history) return;
  
  const msgDiv = document.createElement('div');
  msgDiv.style.padding = '16px';
  msgDiv.style.borderRadius = '12px';
  msgDiv.style.marginBottom = '12px';
  msgDiv.style.maxWidth = '85%';
  msgDiv.style.lineHeight = '1.6';
  
  if (role === 'user') {
    msgDiv.style.background = 'rgba(255,255,255,0.05)';
    msgDiv.style.alignSelf = 'flex-end';
    msgDiv.style.marginLeft = 'auto';
    msgDiv.style.border = '1px solid rgba(255,255,255,0.1)';
  } else {
    msgDiv.style.background = 'rgba(99, 102, 241, 0.1)';
    msgDiv.style.alignSelf = 'flex-start';
    msgDiv.style.border = '1px solid rgba(99, 102, 241, 0.2)';
  }
  
  // Basic markdown to HTML
  let formattedText = text.replace(/\n/g, '<br>');
  formattedText = formattedText.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  msgDiv.innerHTML = formattedText;
  
  history.appendChild(msgDiv);
  history.scrollTop = history.scrollHeight;
}

function appendLoading() {
  const history = document.getElementById('copilot-chat-history');
  const id = 'loading-' + Date.now();
  
  const loader = document.createElement('div');
  loader.id = id;
  loader.style.padding = '16px';
  loader.style.marginBottom = '12px';
  loader.innerHTML = '<span style="color:var(--text-muted);">AI is thinking...</span>';
  
  history.appendChild(loader);
  history.scrollTop = history.scrollHeight;
  return id;
}

function removeLoading(id) {
  const loader = document.getElementById(id);
  if (loader) loader.remove();
}
