export function initInboxV3() {
  const threadList = document.getElementById('inbox-thread-list');
  const activeThread = document.getElementById('inbox-active-thread');
  
  if (!threadList || !activeThread) return;

  const dummyThreads = [
    { id: 1, platform: 'Instagram', user: '@brand_fan', preview: 'Is this available in size M?', unread: true },
    { id: 2, platform: 'LinkedIn', user: 'Alex Johnson', preview: 'Loved your recent webinar!', unread: false },
    { id: 3, platform: 'TikTok', user: 'viral_dude', preview: 'Collab?', unread: true }
  ];

  function renderList() {
    threadList.innerHTML = '';
    dummyThreads.forEach(t => {
      const el = document.createElement('div');
      el.style.padding = '16px';
      el.style.borderBottom = '1px solid rgba(255,255,255,0.05)';
      el.style.cursor = 'pointer';
      el.style.background = t.unread ? 'rgba(255,255,255,0.02)' : 'transparent';
      
      el.innerHTML = `
        <div style="display:flex; justify-content:space-between; margin-bottom:8px;">
          <strong style="color:var(--text-main);">${t.user}</strong>
          <span style="font-size:0.8rem; color:var(--text-muted);">${t.platform}</span>
        </div>
        <div style="font-size:0.9rem; color:var(--text-muted); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
          ${t.preview}
        </div>
      `;
      
      el.addEventListener('click', () => {
        t.unread = false;
        renderList();
        renderActiveThread(t);
      });
      
      threadList.appendChild(el);
    });
  }

  function renderActiveThread(thread) {
    activeThread.innerHTML = `
      <div style="padding: 24px; border-bottom: 1px solid rgba(255,255,255,0.05); display:flex; justify-content:space-between;">
        <h2>${thread.user} <span style="font-size:1rem; color:var(--text-muted); font-weight:normal;">on ${thread.platform}</span></h2>
        <button class="btn btn-secondary">Mark Resolved</button>
      </div>
      <div style="padding: 24px; flex: 1; overflow-y:auto; display:flex; flex-direction:column; gap:16px;">
        <div style="align-self:flex-start; background:rgba(255,255,255,0.05); padding:16px; border-radius:12px; max-width:80%;">
          ${thread.preview}
        </div>
        
        <div style="margin-top: 24px;">
          <p style="color:var(--text-muted); font-size:0.9rem; margin-bottom:8px;">✨ AI Suggested Replies:</p>
          <div style="display:flex; gap:12px; margin-bottom: 24px;">
            <button class="btn btn-secondary" style="font-size:0.8rem;" onclick="document.getElementById('reply-box').value = 'Yes! It is available in size M. You can order it here: [link]'">Yes, available.</button>
            <button class="btn btn-secondary" style="font-size:0.8rem;" onclick="document.getElementById('reply-box').value = 'Unfortunately we are out of stock right now.'">Out of stock.</button>
          </div>
          <div style="display:flex; gap:12px;">
            <input type="text" id="reply-box" class="chat-input" placeholder="Type your reply..." style="flex:1;">
            <button class="btn btn-primary">Send</button>
          </div>
        </div>
      </div>
    `;
  }

  // Initial render
  renderList();
  
  // Empty state for active thread
  activeThread.innerHTML = `
    <div style="display:flex; align-items:center; justify-content:center; height:100%; color:var(--text-muted);">
      Select a thread to view
    </div>
  `;
}
