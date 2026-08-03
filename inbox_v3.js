import { getSupabaseClient } from './auth.js';
import { state } from './state.js';
import { showToast } from './common.js';

export function initInboxV3() {
  const threadList = document.getElementById('inbox-thread-list');
  const activeThread = document.getElementById('inbox-active-thread');
  
  if (!threadList || !activeThread) return;

  async function loadThreads() {
    threadList.innerHTML = '<div style="padding:16px; color:var(--text-muted);">Loading threads...</div>';
    activeThread.innerHTML = `
      <div style="display:flex; align-items:center; justify-content:center; height:100%; color:var(--text-muted);">
        Select a thread to view
      </div>
    `;

    const supabase = getSupabaseClient();
    if (!supabase || !state.activeWorkspaceId) {
      threadList.innerHTML = '<div style="padding:16px; color:var(--text-muted);">Please select a workspace.</div>';
      return;
    }

    const { data: threads, error } = await supabase
      .from('inbox_threads')
      .select('*')
      .eq('app_id', state.activeWorkspaceId)
      .order('last_date', { ascending: false });

    if (error) {
      console.error(error);
      threadList.innerHTML = '<div style="padding:16px; color:var(--error);">Failed to load inbox.</div>';
      return;
    }

    if (!threads || threads.length === 0) {
      threadList.innerHTML = '<div style="padding:16px; color:var(--text-muted);">Inbox is empty.</div>';
      return;
    }

    function renderList() {
      threadList.innerHTML = '';
      threads.forEach(t => {
        const el = document.createElement('div');
        el.style.padding = '16px';
        el.style.borderBottom = '1px solid rgba(255,255,255,0.05)';
        el.style.cursor = 'pointer';
        el.style.background = !t.read ? 'rgba(255,255,255,0.02)' : 'transparent';
        
        el.innerHTML = `
          <div style="display:flex; justify-content:space-between; margin-bottom:8px;">
            <strong style="color:var(--text-main);">${t.sender}</strong>
            <span style="font-size:0.8rem; color:var(--text-muted);">${t.platform}</span>
          </div>
          <div style="font-size:0.9rem; color:var(--text-muted); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
            ${t.last_text || '...'}
          </div>
        `;
        
        el.addEventListener('click', () => {
          t.read = true;
          supabase.from('inbox_threads').update({ read: true }).eq('id', t.id)
            .then(({ error }) => { if (error) console.error(error); });
          renderList();
          loadActiveThread(t, supabase);
        });
        
        threadList.appendChild(el);
      });
    }

    renderList();
  }

  async function loadActiveThread(thread, supabase) {
    activeThread.innerHTML = '<div style="padding:24px; color:var(--text-muted);">Loading messages...</div>';

    const { data: messages, error } = await supabase
      .from('inbox_messages')
      .select('*')
      .eq('thread_id', thread.id)
      .order('created_at', { ascending: true });

    if (error) {
      console.error(error);
      activeThread.innerHTML = '<div style="padding:24px; color:var(--error);">Failed to load messages.</div>';
      return;
    }

    let msgsHtml = '';
    messages.forEach(m => {
      const isBot = m.sender_role === 'bot' || m.sender_role === 'agent';
      const align = isBot ? 'align-self:flex-start;' : 'align-self:flex-end;';
      const bg = isBot ? 'background:rgba(255,255,255,0.05);' : 'background:var(--accent-color); color:#fff;';
      
      const parsedText = m.text.replace(/\n/g, '<br>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

      msgsHtml += `
        <div style="${align} ${bg} padding:16px; border-radius:12px; max-width:80%;">
          ${parsedText}
        </div>
      `;
    });

    activeThread.innerHTML = `
      <div style="padding: 24px; border-bottom: 1px solid rgba(255,255,255,0.05); display:flex; justify-content:space-between;">
        <h2>${thread.sender} <span style="font-size:1rem; color:var(--text-muted); font-weight:normal;">on ${thread.platform}</span></h2>
        <button class="btn btn-secondary">Mark Resolved</button>
      </div>
      <div style="padding: 24px; flex: 1; overflow-y:auto; display:flex; flex-direction:column; gap:16px;">
        ${msgsHtml}
        
        <div style="margin-top: 24px;">
          <div style="display:flex; gap:12px;">
            <input type="text" id="reply-box" class="chat-input" placeholder="Type your reply..." style="flex:1;">
            <button class="btn btn-primary" onclick="alert('Replying not yet implemented for real threads')">Send</button>
          </div>
        </div>
      </div>
    `;
  }

  // Initial load
  loadThreads();

  // Listen for workspace changes to reload the inbox
  window.addEventListener('workspaceChanged', loadThreads);
}
