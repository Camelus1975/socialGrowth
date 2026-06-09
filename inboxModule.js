// App Founder Growth Suite - Social Inbox Module
import { state } from './state.js';
import { requestApi, showToast, createSafeElement } from './common.js';

export function initInbox() {
  state.on('appChanged', () => {
    if (state.currentActiveView === 'saas-inbox' || state.currentActiveView === 'social-inbox') {
      fetchInboxThreads();
    }
  });
  
  state.on('viewChanged', (viewId) => {
    if (viewId === 'saas-inbox' || viewId === 'social-inbox') {
      fetchInboxThreads();
    }
  });
}

export async function fetchInboxThreads() {
  try {
    const data = await requestApi('/api/inbox/threads');
    state.inboxState[state.currentActiveApp] = data;
  } catch (err) {
    console.warn("Express server offline. Falling back to local inbox state.");
  }
  renderInboxView();
}

export function renderInboxView() {
  const threads = state.inboxState[state.currentActiveApp] || [];
  const container = document.getElementById('inbox-threads-list-container');
  if (!container) return;
  container.innerHTML = '';
  
  if (threads.length === 0) {
    const emptyMsg = createSafeElement('p', [], 'No messages logged.');
    emptyMsg.style.color = 'var(--text-sub)';
    emptyMsg.style.textAlign = 'center';
    emptyMsg.style.padding = '20px';
    container.appendChild(emptyMsg);
    return;
  }
  
  threads.forEach(thread => {
    const isUnread = !thread.read;
    const isActive = state.activeInboxThreadId === thread.id;
    
    const card = createSafeElement('div', ['inbox-thread-card']);
    if (isActive) card.classList.add('active');
    if (isUnread) {
      card.style.fontWeight = '700';
      card.style.borderLeft = '3px solid var(--primary)';
    }
    
    const headerFlex = createSafeElement('div');
    headerFlex.style.display = 'flex';
    headerFlex.style.justifyContent = 'space-between';
    headerFlex.style.alignItems = 'center';
    headerFlex.style.marginBottom = '4px';
    
    const senderName = createSafeElement('strong', [], thread.sender);
    senderName.style.color = 'white';
    senderName.style.fontSize = '0.82rem';
    
    const platformSpan = createSafeElement('span', [], thread.platform.toUpperCase());
    platformSpan.style.fontSize = '0.65rem';
    platformSpan.style.color = 'var(--text-sub)';
    
    headerFlex.appendChild(senderName);
    headerFlex.appendChild(platformSpan);
    
    const textSnippet = createSafeElement('p', [], `"${thread.text}"`);
    textSnippet.style.fontSize = '0.75rem';
    textSnippet.style.color = 'var(--text-muted)';
    textSnippet.style.overflow = 'hidden';
    textSnippet.style.textOverflow = 'ellipsis';
    textSnippet.style.whiteSpace = 'nowrap';
    
    card.appendChild(headerFlex);
    card.appendChild(textSnippet);
    
    card.addEventListener('click', () => selectInboxThread(thread.id));
    container.appendChild(card);
  });
  
  if (!state.activeInboxThreadId && threads.length > 0) {
    selectInboxThread(threads[0].id);
  }
}

export function selectInboxThread(threadId) {
  state.activeInboxThreadId = threadId;
  const threads = state.inboxState[state.currentActiveApp] || [];
  const thread = threads.find(t => t.id === threadId);
  if (!thread) return;
  
  thread.read = true;
  
  // Highlight active card
  document.querySelectorAll('.inbox-thread-card').forEach((card, idx) => {
    if (threads[idx] && threads[idx].id === threadId) {
      card.classList.add('active');
      card.style.fontWeight = 'normal';
      card.style.borderLeft = 'none';
    } else {
      card.classList.remove('active');
    }
  });
  
  const senderEl = document.getElementById('inbox-active-sender');
  const platformEl = document.getElementById('inbox-active-platform');
  const chatBox = document.getElementById('inbox-chat-bubbles');
  
  if (senderEl) senderEl.textContent = thread.sender;
  if (platformEl) platformEl.textContent = `Via connected account: ${thread.platform.toUpperCase()}`;
  
  if (chatBox) {
    chatBox.innerHTML = '';
    
    const bubbleRow = createSafeElement('div', ['chat-bubble-row', 'received']);
    
    const avatarImg = createSafeElement('img');
    avatarImg.src = thread.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=80';
    avatarImg.style.width = '28px';
    avatarImg.style.height = '28px';
    avatarImg.style.borderRadius = '50%';
    avatarImg.style.objectFit = 'cover';
    avatarImg.style.alignSelf = 'flex-end';
    
    const bubble = createSafeElement('div', ['chat-bubble']);
    bubble.textContent = thread.text;
    
    const dateDiv = createSafeElement('div', [], thread.date);
    dateDiv.style.fontSize = '0.65rem';
    dateDiv.style.color = 'var(--text-sub)';
    dateDiv.style.textAlign = 'right';
    dateDiv.style.marginTop = '4px';
    
    bubble.appendChild(dateDiv);
    bubbleRow.appendChild(avatarImg);
    bubbleRow.appendChild(bubble);
    chatBox.appendChild(bubbleRow);
  }
  
  const sentimentEl = document.getElementById('inbox-ai-sentiment');
  if (sentimentEl) {
    sentimentEl.textContent = thread.resolved ? "RESOLVED" : "POSITIVE SENTIMENT";
    sentimentEl.className = thread.resolved ? "sentiment-positive" : "sentiment-neutral";
  }
  
  const repliesBox = document.getElementById('inbox-ai-replies-box');
  if (repliesBox) {
    repliesBox.innerHTML = '';
    
    const opt1 = createSafeElement('div', ['glass-card']);
    opt1.style.background = 'rgba(255,255,255,0.02)';
    opt1.style.border = '1px solid var(--border-glass)';
    opt1.style.padding = '10px';
    opt1.style.cursor = 'pointer';
    opt1.style.marginBottom = '8px';
    
    const opt1Title = createSafeElement('strong', [], 'Option 1: Warm Acknowledgment');
    opt1Title.style.color = 'white';
    opt1Title.style.fontSize = '0.75rem';
    opt1Title.style.display = 'block';
    
    const opt1Text = createSafeElement('span', [], `"Hi ${thread.sender.split(' ')[0]}, thanks for reaching out! We are working on this exact feature..."`);
    opt1Text.style.fontSize = '0.72rem';
    opt1Text.style.color = 'var(--text-muted)';
    
    opt1.appendChild(opt1Title);
    opt1.appendChild(opt1Text);
    opt1.addEventListener('click', () => prefillInboxReply(1));
    
    const opt2 = createSafeElement('div', ['glass-card']);
    opt2.style.background = 'rgba(255,255,255,0.02)';
    opt2.style.border = '1px solid var(--border-glass)';
    opt2.style.padding = '10px';
    opt2.style.cursor = 'pointer';
    
    const opt2Title = createSafeElement('strong', [], 'Option 2: Direct Roadmap Link');
    opt2Title.style.color = 'white';
    opt2Title.style.fontSize = '0.75rem';
    opt2Title.style.display = 'block';
    
    const opt2Text = createSafeElement('span', [], `"Hey! You can review and vote on this roadmap feature right here: [Link]..."`);
    opt2Text.style.fontSize = '0.72rem';
    opt2Text.style.color = 'var(--text-muted)';
    
    opt2.appendChild(opt2Title);
    opt2.appendChild(opt2Text);
    opt2.addEventListener('click', () => prefillInboxReply(2));
    
    repliesBox.appendChild(opt1);
    repliesBox.appendChild(opt2);
  }
}

export function prefillInboxReply(optNum) {
  const threads = state.inboxState[state.currentActiveApp] || [];
  const thread = threads.find(t => t.id === state.activeInboxThreadId);
  if (!thread) return;
  
  const firstName = thread.sender.split(' ')[0];
  const replies = {
    1: `Hi ${firstName}, thanks for reaching out! We are currently optimizing these features and have logged your feedback into our dev roadmap logs.`,
    2: `Hey! Thanks for your input. We maintain a public roadmap dashboard where you can vote on this feature directly: [Link].`
  };
  
  const textarea = document.getElementById('inbox-reply-text');
  if (textarea) {
    textarea.value = replies[optNum] || '';
  }
  showToast("AI response drafted!", "success");
}

export function sendInboxMessageReply() {
  const textarea = document.getElementById('inbox-reply-text');
  if (!textarea) return;
  const text = textarea.value.trim();
  
  if (!text) {
    showToast("Write a reply message first!", "error");
    return;
  }
  
  const chatBox = document.getElementById('inbox-chat-bubbles');
  if (chatBox) {
    const bubbleRow = createSafeElement('div', ['chat-bubble-row', 'sent']);
    const bubble = createSafeElement('div', ['chat-bubble']);
    bubble.textContent = text;
    
    const timeDiv = createSafeElement('div', [], 'Just now');
    timeDiv.style.fontSize = '0.65rem';
    timeDiv.style.color = 'rgba(255,255,255,0.5)';
    timeDiv.style.textAlign = 'right';
    timeDiv.style.marginTop = '4px';
    
    bubble.appendChild(timeDiv);
    bubbleRow.appendChild(bubble);
    chatBox.appendChild(bubbleRow);
  }
  
  textarea.value = '';
  showToast("Reply sent to connected channel!", "success");
  
  const threads = state.inboxState[state.currentActiveApp] || [];
  const thread = threads.find(t => t.id === state.activeInboxThreadId);
  if (thread) thread.resolved = true;
  
  setTimeout(() => {
    renderInboxView();
  }, 1000);
}

export function markActiveInboxResolved() {
  const threads = state.inboxState[state.currentActiveApp] || [];
  const thread = threads.find(t => t.id === state.activeInboxThreadId);
  if (thread) {
    thread.resolved = true;
    showToast("Thread marked as resolved!", "success");
    renderInboxView();
  }
}
