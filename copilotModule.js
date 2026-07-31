import { state } from './state.js';
import { requestApi, showToast } from './common.js';
import { getSupabaseClient } from './auth.js';

let copilotMessages = [];

export function initCopilot() {
    // Check if already initialized
    if (document.getElementById('ai-copilot-container')) return;

    // Inject styles
    const style = document.createElement('style');
    style.textContent = `
        @keyframes copilot-pulse {
            0% { box-shadow: 0 0 0 0 rgba(99, 102, 241, 0.7); }
            70% { box-shadow: 0 0 0 15px rgba(99, 102, 241, 0); }
            100% { box-shadow: 0 0 0 0 rgba(99, 102, 241, 0); }
        }
        @keyframes copilot-typing {
            0%, 20% { transform: translateY(0); }
            50% { transform: translateY(-5px); }
            80%, 100% { transform: translateY(0); }
        }
        .copilot-typing-dot {
            display: inline-block;
            width: 6px;
            height: 6px;
            background: #e2e8f0;
            border-radius: 50%;
            animation: copilot-typing 1.4s infinite ease-in-out both;
            margin: 0 2px;
        }
        .copilot-typing-dot:nth-child(1) { animation-delay: -0.32s; }
        .copilot-typing-dot:nth-child(2) { animation-delay: -0.16s; }
    `;
    document.head.appendChild(style);

    // Main container
    const container = document.createElement('div');
    container.id = 'ai-copilot-container';
    document.body.appendChild(container);

    // FAB
    const fab = document.createElement('div');
    fab.style.cssText = `
        position: fixed;
        bottom: 24px;
        right: 24px;
        width: 56px;
        height: 56px;
        border-radius: 50%;
        background: linear-gradient(135deg, #6366f1, #8b5cf6);
        box-shadow: 0 4px 15px rgba(0,0,0,0.3);
        cursor: pointer;
        z-index: 10000;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 24px;
        transition: transform 0.2s, opacity 0.2s;
        animation: copilot-pulse 2s infinite;
    `;
    fab.innerHTML = '✨';
    container.appendChild(fab);

    // Chat Panel
    const panel = document.createElement('div');
    panel.style.cssText = `
        position: fixed;
        bottom: 90px;
        right: 24px;
        width: 380px;
        max-height: 520px;
        background: rgba(10, 14, 30, 0.95);
        backdrop-filter: blur(20px);
        -webkit-backdrop-filter: blur(20px);
        border: 1px solid rgba(255,255,255,0.1);
        border-radius: 16px;
        box-shadow: 0 20px 60px rgba(0,0,0,0.5);
        z-index: 9999;
        display: flex;
        flex-direction: column;
        opacity: 0;
        transform: translateY(20px) scale(0.95);
        pointer-events: none;
        transition: opacity 0.3s ease, transform 0.3s ease;
        overflow: hidden;
    `;
    container.appendChild(panel);

    // Header
    const header = document.createElement('div');
    header.style.cssText = `
        padding: 16px;
        border-bottom: 1px solid rgba(255,255,255,0.1);
        display: flex;
        justify-content: space-between;
        align-items: center;
        background: rgba(255,255,255,0.03);
    `;
    const headerTitle = document.createElement('div');
    headerTitle.innerHTML = `<strong style="color:white;font-size:1rem;">✨ AI Copilot</strong>`;
    
    const headerSubtitle = document.createElement('div');
    headerSubtitle.style.cssText = `font-size: 0.75rem; color: #94a3b8; margin-top: 2px;`;
    
    // Update subtitle when state changes
    state.on('appChanged', () => {
        headerSubtitle.textContent = state.currentActiveApp || 'No business selected';
    });
    headerSubtitle.textContent = state.currentActiveApp || 'No business selected';
    
    const titleContainer = document.createElement('div');
    titleContainer.appendChild(headerTitle);
    titleContainer.appendChild(headerSubtitle);
    
    const closeBtn = document.createElement('button');
    closeBtn.innerHTML = '&times;';
    closeBtn.style.cssText = `
        background: transparent;
        border: none;
        color: #94a3b8;
        font-size: 1.5rem;
        cursor: pointer;
        padding: 0 4px;
        line-height: 1;
    `;
    closeBtn.addEventListener('click', () => togglePanel(false));
    
    header.appendChild(titleContainer);
    header.appendChild(closeBtn);
    panel.appendChild(header);

    // Messages Container
    const messages = document.createElement('div');
    messages.id = 'copilot-messages';
    messages.style.cssText = `
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 12px;
        padding: 16px;
        overflow-y: auto;
        max-height: 360px;
    `;
    panel.appendChild(messages);

    // Input Area
    const inputArea = document.createElement('div');
    inputArea.style.cssText = `
        padding: 16px;
        border-top: 1px solid rgba(255,255,255,0.1);
        display: flex;
        gap: 8px;
        background: rgba(255,255,255,0.02);
    `;
    
    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = 'Ask anything...';
    input.style.cssText = `
        flex: 1;
        background: rgba(255,255,255,0.05);
        border: 1px solid rgba(255,255,255,0.1);
        color: white;
        padding: 10px 14px;
        border-radius: 20px;
        outline: none;
        font-size: 0.9rem;
    `;
    
    const sendBtn = document.createElement('button');
    sendBtn.innerHTML = '➤';
    sendBtn.style.cssText = `
        background: var(--primary, #6366f1);
        color: white;
        border: none;
        width: 38px;
        height: 38px;
        border-radius: 50%;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: opacity 0.2s;
    `;
    sendBtn.onmouseover = () => sendBtn.style.opacity = '0.8';
    sendBtn.onmouseout = () => sendBtn.style.opacity = '1';

    inputArea.appendChild(input);
    inputArea.appendChild(sendBtn);
    panel.appendChild(inputArea);

    let isPanelOpen = false;

    function togglePanel(forceState) {
        isPanelOpen = forceState !== undefined ? forceState : !isPanelOpen;
        if (isPanelOpen) {
            panel.style.opacity = '1';
            panel.style.transform = 'translateY(0) scale(1)';
            panel.style.pointerEvents = 'auto';
            input.focus();
        } else {
            panel.style.opacity = '0';
            panel.style.transform = 'translateY(20px) scale(0.95)';
            panel.style.pointerEvents = 'none';
        }
    }

    fab.addEventListener('click', () => togglePanel());

    const handleSend = () => {
        const text = input.value.trim();
        if (text) {
            sendCopilotMessage(text, input, sendBtn, messages);
        }
    };

    input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleSend();
    });
    sendBtn.addEventListener('click', handleSend);
}

async function sendCopilotMessage(text, inputEl, btnEl, messagesEl) {
    if (!text) return;

    // Append User Message
    const userMsg = document.createElement('div');
    userMsg.style.cssText = `
        align-self: flex-end;
        background: var(--primary, #6366f1);
        padding: 10px 14px;
        border-radius: 12px 12px 4px 12px;
        color: white;
        max-width: 80%;
        font-size: 0.85rem;
    `;
    userMsg.textContent = text;
    messagesEl.appendChild(userMsg);
    
    // Add to history
    copilotMessages.push({ role: 'user', content: text });
    
    // Clear & disable input
    inputEl.value = '';
    inputEl.disabled = true;
    btnEl.disabled = true;
    messagesEl.scrollTop = messagesEl.scrollHeight;

    // Typing indicator
    const typingMsg = document.createElement('div');
    typingMsg.style.cssText = `
        align-self: flex-start;
        background: rgba(255,255,255,0.05);
        border: 1px solid rgba(255,255,255,0.1);
        padding: 10px 14px;
        border-radius: 12px 12px 12px 4px;
        display: flex;
        gap: 2px;
        align-items: center;
    `;
    typingMsg.innerHTML = `
        <span class="copilot-typing-dot"></span>
        <span class="copilot-typing-dot"></span>
        <span class="copilot-typing-dot"></span>
    `;
    messagesEl.appendChild(typingMsg);
    messagesEl.scrollTop = messagesEl.scrollHeight;

    try {
        const historyContext = copilotMessages.slice(-10); // last 10 messages
        
        const response = await requestApi('/api/copilot/chat', {
            method: 'POST',
            body: JSON.stringify({
                message: text,
                appId: state.currentActiveApp,
                currentView: state.currentActiveView,
                history: historyContext
            })
        });

        // Remove typing
        if (typingMsg.parentNode) messagesEl.removeChild(typingMsg);

        if (response && response.success) {
            const aiText = response.message || response.reply || response.text || 'I understood your request.';
            
            const aiMsg = document.createElement('div');
            aiMsg.style.cssText = `
                align-self: flex-start;
                background: rgba(255,255,255,0.05);
                border: 1px solid rgba(255,255,255,0.1);
                padding: 10px 14px;
                border-radius: 12px 12px 12px 4px;
                color: #e2e8f0;
                max-width: 85%;
                font-size: 0.85rem;
                line-height: 1.5;
            `;
            aiMsg.innerHTML = aiText.replace(/\n/g, '<br>');
            messagesEl.appendChild(aiMsg);
            
            copilotMessages.push({ role: 'assistant', content: aiText });
        } else {
            throw new Error(response?.error || 'Failed to get a response.');
        }

    } catch (err) {
        console.error('[Copilot] Error:', err);
        if (typingMsg.parentNode) messagesEl.removeChild(typingMsg);
        
        const errorMsg = document.createElement('div');
        errorMsg.style.cssText = `
            align-self: flex-start;
            background: rgba(239, 68, 68, 0.1);
            border: 1px solid rgba(239, 68, 68, 0.3);
            padding: 10px 14px;
            border-radius: 12px 12px 12px 4px;
            color: #fca5a5;
            max-width: 85%;
            font-size: 0.85rem;
        `;
        errorMsg.textContent = 'Error: ' + err.message;
        messagesEl.appendChild(errorMsg);
    } finally {
        inputEl.disabled = false;
        btnEl.disabled = false;
        messagesEl.scrollTop = messagesEl.scrollHeight;
        inputEl.focus();
    }
}
