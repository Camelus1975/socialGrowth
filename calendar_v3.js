import { getSupabaseClient } from './auth.js';
import { state } from './state.js';
import { showToast } from './common.js';

export function initCalendarV3() {
  const grid = document.getElementById('calendar-grid-container');
  if (!grid) return;

  const newPostBtn = document.getElementById('btn-new-post');
  if (newPostBtn) {
    newPostBtn.onclick = openNewPostModal;
  }

  window.addEventListener('workspaceChanged', loadCalendar);
  loadCalendar();
}

async function loadCalendar() {
  const grid = document.getElementById('calendar-grid-container');
  if (!grid) return;
  
  if (!state.activeWorkspaceId) {
    grid.innerHTML = '<div style="color:var(--text-muted); padding:20px;">Please select a workspace to view the calendar.</div>';
    grid.style.display = 'block';
    return;
  }

  grid.innerHTML = '<div style="color:var(--text-muted); padding:20px;">Loading posts...</div>';
  grid.style.display = 'block';

  try {
    const supabase = getSupabaseClient();
    const { data: session } = await supabase.auth.getSession();
    const token = session?.session?.access_token;
    
    if (!token) throw new Error("Not authenticated");

    const res = await fetch(`/api/calendar/${state.activeWorkspaceId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    
    if (!data.success) throw new Error(data.error);
    
    renderCalendar(data.posts || []);
  } catch (err) {
    console.error(err);
    grid.innerHTML = '<div style="color:var(--error); padding:20px;">Failed to load calendar.</div>';
  }
}

function renderCalendar(posts) {
  const grid = document.getElementById('calendar-grid-container');
  
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const scheduledPosts = { 'Sun':[], 'Mon':[], 'Tue':[], 'Wed':[], 'Thu':[], 'Fri':[], 'Sat':[] };

  // Group posts by day of the week
  posts.forEach(post => {
    const d = new Date(post.publish_at);
    const dayName = days[d.getDay()];
    scheduledPosts[dayName].push(post);
  });

  let html = '';
  
  // To make Monday first
  const displayDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  displayDays.forEach(day => {
    html += `<div style="background:rgba(255,255,255,0.02); border:1px solid var(--border-glass); border-radius:12px; padding:16px; min-height:150px;">`;
    html += `<h3 style="margin-top:0; color:var(--text-main); font-size:1rem; text-align:center;">${day}</h3>`;
    
    if (scheduledPosts[day].length > 0) {
      // Sort by time
      scheduledPosts[day].sort((a, b) => new Date(a.publish_at) - new Date(b.publish_at));
      
      scheduledPosts[day].forEach(post => {
        let color = '#9ca3af';
        const plat = post.platform.toLowerCase();
        if (plat === 'linkedin') color = '#60a5fa'; // Blue
        if (plat === 'instagram') color = '#f472b6'; // Pink
        if (plat === 'tiktok') color = '#2dd4bf'; // Teal
        if (plat === 'twitter') color = '#38bdf8'; // Light Blue
        
        const timeStr = new Date(post.publish_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const opacity = post.status === 'published' ? '0.6' : '1';
        const statusIcon = post.status === 'published' ? '✅' : (post.status === 'failed' ? '❌' : '⏳');
        
        let mediaHtml = '';
        if (post.media_url) {
          mediaHtml = `<div style="margin-top:8px; border-radius:4px; overflow:hidden; max-height:80px;"><img src="${post.media_url}" style="width:100%; height:auto; object-fit:cover;" /></div>`;
        }
        
        html += `
          <div style="background:rgba(0,0,0,0.3); opacity:${opacity}; border-left: 3px solid ${color}; border-radius:6px; padding:12px; margin-top:12px; font-size:0.85rem; color:var(--text-muted); cursor:pointer;">
            <div style="font-weight:bold; margin-bottom:4px; color:var(--text-main); display:flex; justify-content:space-between;">
              <span>${timeStr} - ${post.platform}</span>
              <span title="${post.status}">${statusIcon}</span>
            </div>
            <div style="display:-webkit-box; -webkit-line-clamp:3; -webkit-box-orient:vertical; overflow:hidden;">${post.content}</div>
            ${mediaHtml}
          </div>
        `;
      });
    } else {
      html += `<div style="text-align:center; color:var(--border-glass); margin-top:30px; font-size:0.85rem;">No posts</div>`;
    }
    
    html += `</div>`;
  });

  grid.style.display = 'grid';
  grid.style.gridTemplateColumns = 'repeat(7, 1fr)';
  grid.style.gap = '16px';
  grid.innerHTML = html;
}

function openNewPostModal() {
  if (!state.activeWorkspaceId) {
    showToast("Please select a workspace first.", "error");
    return;
  }
  
  const modal = document.createElement('div');
  modal.style.position = 'fixed';
  modal.style.top = '0'; modal.style.left = '0'; modal.style.width = '100vw'; modal.style.height = '100vh';
  modal.style.background = 'rgba(0,0,0,0.8)';
  modal.style.display = 'flex'; modal.style.alignItems = 'center'; modal.style.justifyContent = 'center';
  modal.style.zIndex = '9999';
  
  modal.innerHTML = `
    <div style="background:var(--bg-panel); border:1px solid var(--border-glass); border-radius:12px; padding:24px; width:400px; max-width:90%;">
      <h2 style="margin-top:0;">Schedule New Post</h2>
      <div style="margin-bottom:12px;">
        <label style="display:block; margin-bottom:4px; color:var(--text-muted);">Platform</label>
        <select id="new-post-platform" class="chat-input" style="width:100%;">
          <option value="Twitter">Twitter</option>
          <option value="LinkedIn">LinkedIn</option>
          <option value="Instagram">Instagram</option>
          <option value="TikTok">TikTok</option>
        </select>
      </div>
      <div style="margin-bottom:12px;">
        <label style="display:block; margin-bottom:4px; color:var(--text-muted);">Content</label>
        <textarea id="new-post-content" class="chat-input" style="width:100%; height:100px; resize:none;" placeholder="Write your post..."></textarea>
      </div>
      <div style="margin-bottom:12px;">
        <label style="display:block; margin-bottom:4px; color:var(--text-muted);">Media URL (Optional Image/Video)</label>
        <input type="text" id="new-post-media" class="chat-input" style="width:100%;" placeholder="https://...">
      </div>
      <div style="margin-bottom:24px;">
        <label style="display:block; margin-bottom:4px; color:var(--text-muted);">Publish Time</label>
        <input type="datetime-local" id="new-post-time" class="chat-input" style="width:100%;">
      </div>
      <div style="display:flex; gap:12px; justify-content:flex-end;">
        <button id="new-post-cancel" class="btn btn-secondary">Cancel</button>
        <button id="new-post-submit" class="btn btn-primary">Schedule</button>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  document.getElementById('new-post-cancel').onclick = () => modal.remove();
  
  document.getElementById('new-post-submit').onclick = async () => {
    const platform = document.getElementById('new-post-platform').value;
    const content = document.getElementById('new-post-content').value;
    const mediaUrl = document.getElementById('new-post-media').value;
    const timeVal = document.getElementById('new-post-time').value;
    
    if (!content || !timeVal) {
      showToast("Please enter content and select a time.", "error");
      return;
    }
    
    const publishAt = new Date(timeVal).toISOString();
    
    try {
      const supabase = getSupabaseClient();
      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;
      
      const btn = document.getElementById('new-post-submit');
      btn.innerText = 'Scheduling...';
      btn.disabled = true;

      const res = await fetch(`/api/calendar/${state.activeWorkspaceId}`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ platform, content, media_url: mediaUrl, publish_at: publishAt })
      });
      
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      
      showToast("Post scheduled successfully!", "success");
      modal.remove();
      loadCalendar();
    } catch (err) {
      console.error(err);
      showToast("Error scheduling post: " + err.message, "error");
      const btn = document.getElementById('new-post-submit');
      btn.innerText = 'Schedule';
      btn.disabled = false;
    }
  };
}
