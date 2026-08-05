import { getSupabaseClient } from './auth.js';
import { state } from './state.js';
import { showToast, requestApi } from './common.js';

export function initCalendarV3() {
  const grid = document.getElementById('calendar-grid-container');
  if (!grid) return;

  const newPostBtn = document.getElementById('btn-new-post');
  if (newPostBtn) {
    newPostBtn.onclick = openNewPostModal;
  }

  const clearPostsBtn = document.getElementById('btn-clear-posts');
  if (clearPostsBtn) {
    clearPostsBtn.onclick = clearAllCalendarPosts;
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
  
  // Store post data in a registry keyed by ID — avoids ALL string escaping issues
  window.__calendarPosts = {};
  posts.forEach(p => { window.__calendarPosts[p.id] = p; });

  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const scheduledPosts = { 'Sun':[], 'Mon':[], 'Tue':[], 'Wed':[], 'Thu':[], 'Fri':[], 'Sat':[] };

  posts.forEach(post => {
    const d = new Date(post.publish_at);
    const dayName = days[d.getDay()];
    scheduledPosts[dayName].push(post);
  });

  let html = '';
  const displayDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  displayDays.forEach(day => {
    html += `<div style="background:rgba(255,255,255,0.02); border:1px solid var(--border-glass); border-radius:12px; padding:16px; min-height:150px;">`;
    html += `<h3 style="margin-top:0; color:var(--text-main); font-size:1rem; text-align:center;">${day}</h3>`;

    if (scheduledPosts[day].length > 0) {
      scheduledPosts[day].sort((a, b) => new Date(a.publish_at) - new Date(b.publish_at));

      scheduledPosts[day].forEach(post => {
        const plat = (post.platform || '').toLowerCase();
        const colors = { linkedin:'#60a5fa', instagram:'#f472b6', tiktok:'#2dd4bf', twitter:'#38bdf8', facebook:'#818cf8' };
        const color  = colors[plat] || '#9ca3af';
        const timeStr = new Date(post.publish_at).toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' });
        const opacity = post.status === 'published' ? '0.6' : '1';
        const statusIcon = post.status === 'published' ? '✅' : (post.status === 'failed' ? '❌' : '⏳');

        // Safe thumbnail — no onclick inline string
        let mediaThumb = '';
        if (post.media_url) {
          const isVid = /\.(mp4|webm|mov)$/i.test(post.media_url);
          if (isVid) {
            mediaThumb = `<div style="margin-top:8px;border-radius:4px;overflow:hidden;max-height:70px;background:#000;display:flex;align-items:center;justify-content:center;" data-open-media="${post.id}"><span style="font-size:2rem;">▶️</span></div>`;
          } else {
            mediaThumb = `<div style="margin-top:8px;border-radius:4px;overflow:hidden;max-height:70px;" data-open-media="${post.id}"><img src="${post.media_url}" style="width:100%;height:auto;object-fit:cover;" loading="lazy" /></div>`;
          }
        }

        // Post card — uses data-post-id, no inline JS strings
        html += `
          <div
            class="cal-post-card"
            data-post-id="${post.id}"
            style="background:rgba(0,0,0,0.3);opacity:${opacity};border-left:3px solid ${color};border-radius:6px;padding:12px;margin-top:12px;font-size:0.85rem;color:var(--text-muted);position:relative;cursor:pointer;"
          >
            <div style="font-weight:bold;margin-bottom:4px;color:var(--text-main);display:flex;justify-content:space-between;align-items:center;">
              <span>${timeStr} — ${post.platform}</span>
              <div style="display:flex;gap:8px;align-items:center;">
                <span title="${post.status}">${statusIcon}</span>
                <button class="cal-delete-btn" data-delete-id="${post.id}" style="background:none;border:none;color:var(--error);cursor:pointer;padding:0;font-size:1.1rem;" title="Delete Post">🗑️</button>
              </div>
            </div>
            <div style="display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden;">${post.content}</div>
            ${mediaThumb}
          </div>
        `;
      });
    } else {
      html += `<div style="text-align:center;color:var(--border-glass);margin-top:30px;font-size:0.85rem;">No posts</div>`;
    }

    html += `</div>`;
  });

  grid.style.display = 'grid';
  grid.style.gridTemplateColumns = 'repeat(7, 1fr)';
  grid.style.gap = '16px';
  grid.innerHTML = html;

  // ── Event delegation — ONE listener on the grid, no inline JS strings ──
  grid.addEventListener('click', (e) => {
    // Delete button
    const delBtn = e.target.closest('[data-delete-id]');
    if (delBtn) {
      e.stopPropagation();
      window.deleteCalendarPost(delBtn.dataset.deleteId);
      return;
    }
    // Media thumbnail
    const mediaTile = e.target.closest('[data-open-media]');
    if (mediaTile) {
      e.stopPropagation();
      const p = window.__calendarPosts[mediaTile.dataset.openMedia];
      if (p && p.media_url) {
        const isVid = /\.(mp4|webm|mov)$/i.test(p.media_url);
        window.openMediaViewer(p.media_url, isVid ? 'video' : 'image');
      }
      return;
    }
    // Post card
    const card = e.target.closest('.cal-post-card');
    if (card) {
      const p = window.__calendarPosts[card.dataset.postId];
      if (p) window.openPostDetail(p);
    }
  }, { capture: false });
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

window.deleteCalendarPost = async function(postId) {
  if (!state.activeWorkspaceId) return;
  if (!confirm('Are you sure you want to permanently delete this scheduled post?')) return;
  
  try {
    const res = await requestApi(`/api/calendar/${state.activeWorkspaceId}/${postId}`, { method: 'DELETE' });
    if (res.success) {
      loadCalendar();
    } else {
      alert('Failed to delete post: ' + res.error);
    }
  } catch (err) {
    console.error(err);
    alert('Error deleting post.');
  }
};

window.clearAllCalendarPosts = async function() {
  if (!state.activeWorkspaceId) return;
  if (!confirm(`Are you sure you want to PERMANENTLY delete ALL scheduled posts for ${state.activeWorkspace || 'this workspace'}?`)) return;
  
  try {
    const res = await requestApi(`/api/calendar/${state.activeWorkspaceId}`, { method: 'DELETE' });
    if (res.success) {
      loadCalendar();
      if (window.__showToast) window.__showToast('All posts cleared.', 'success');
    } else {
      alert('Failed to clear posts: ' + res.error);
    }
  } catch (err) {
    console.error(err);
    alert('Error clearing posts.');
  }
};

// Open a full post detail modal — receives the raw post object (no string encoding needed)
window.openPostDetail = function(post) {
  let existingModal = document.getElementById('post-detail-modal');
  if (existingModal) existingModal.remove();

  const platform  = post.platform || 'Unknown';
  const status    = post.status   || 'scheduled';
  const content   = post.content  || '';
  const mediaUrl  = post.media_url || null;
  const isVideo   = mediaUrl && /\.(mp4|webm|mov)$/i.test(mediaUrl);

  const platformColors = { linkedin:'#60a5fa', instagram:'#f472b6', tiktok:'#2dd4bf', twitter:'#38bdf8', facebook:'#818cf8' };
  const color = platformColors[platform.toLowerCase()] || '#9ca3af';
  const statusLabel = { published:'✅ Published', failed:'❌ Failed', draft:'📝 Draft' }[status] || '⏳ Scheduled';

  let mediaSection = '';
  if (mediaUrl) {
    if (isVideo) {
      mediaSection = `<video src="${mediaUrl}" controls style="width:100%;border-radius:10px;margin-bottom:16px;max-height:260px;"></video>`;
    } else {
      mediaSection = `<img src="${mediaUrl}" style="width:100%;border-radius:10px;margin-bottom:16px;max-height:320px;object-fit:contain;cursor:zoom-in;" onclick="window.openMediaViewer('${mediaUrl}','image')" />`;
    }
  }

  const modal = document.createElement('div');
  modal.id = 'post-detail-modal';
  modal.style.cssText = 'position:fixed;inset:0;z-index:10000;background:rgba(0,0,0,0.75);backdrop-filter:blur(6px);display:flex;align-items:center;justify-content:center;padding:20px;';

  const inner = document.createElement('div');
  inner.style.cssText = 'background:var(--bg-panel);border:1px solid var(--border-glass);border-radius:16px;padding:28px;width:100%;max-width:560px;max-height:85vh;overflow-y:auto;position:relative;';

  // Close button
  const closeBtn = document.createElement('button');
  closeBtn.innerHTML = '✕';
  closeBtn.style.cssText = 'position:absolute;top:16px;right:16px;background:rgba(255,255,255,0.08);border:1px solid var(--border-glass);color:var(--text-main);border-radius:50%;width:32px;height:32px;cursor:pointer;font-size:1rem;';
  closeBtn.onclick = () => modal.remove();
  inner.appendChild(closeBtn);

  // Header
  const header = document.createElement('div');
  header.style.cssText = 'display:flex;align-items:center;gap:12px;margin-bottom:20px;';
  header.innerHTML = `<div style="width:12px;height:12px;border-radius:50%;background:${color};"></div><span style="font-weight:700;font-size:1.1rem;color:var(--text-main);text-transform:capitalize;">${platform}</span><span style="font-size:0.85rem;color:var(--text-muted);margin-left:auto;">${statusLabel}</span>`;
  inner.appendChild(header);

  // Media
  if (mediaSection) {
    const mediaWrap = document.createElement('div');
    mediaWrap.innerHTML = mediaSection;
    inner.appendChild(mediaWrap);
  }

  // Content
  const contentBox = document.createElement('div');
  contentBox.style.cssText = 'background:rgba(255,255,255,0.03);border:1px solid var(--border-glass);border-radius:10px;padding:16px;white-space:pre-wrap;line-height:1.7;color:var(--text-main);font-size:0.95rem;';
  contentBox.textContent = content; // textContent avoids XSS and any escaping issues
  inner.appendChild(contentBox);

  // Buttons
  const btnRow = document.createElement('div');
  btnRow.style.cssText = 'display:flex;gap:12px;margin-top:20px;justify-content:flex-end;';

  const copyBtn = document.createElement('button');
  copyBtn.textContent = '📋 Copy Caption';
  copyBtn.style.cssText = 'background:rgba(99,102,241,0.15);border:1px solid rgba(99,102,241,0.4);color:#a5b4fc;padding:8px 16px;border-radius:8px;cursor:pointer;';
  copyBtn.onclick = () => { navigator.clipboard.writeText(content); copyBtn.textContent = '✅ Copied!'; setTimeout(() => { copyBtn.textContent = '📋 Copy Caption'; }, 2000); };
  btnRow.appendChild(copyBtn);

  if (mediaUrl) {
    const mediaBtn = document.createElement('button');
    mediaBtn.textContent = '🔗 Open Media';
    mediaBtn.style.cssText = 'background:rgba(255,255,255,0.06);border:1px solid var(--border-glass);color:var(--text-muted);padding:8px 16px;border-radius:8px;cursor:pointer;';
    mediaBtn.onclick = () => window.open(mediaUrl, '_blank');
    btnRow.appendChild(mediaBtn);
  }

  const doneBtn = document.createElement('button');
  doneBtn.textContent = 'Close';
  doneBtn.style.cssText = 'background:var(--bg-surface);border:1px solid var(--border-glass);color:var(--text-muted);padding:8px 16px;border-radius:8px;cursor:pointer;';
  doneBtn.onclick = () => modal.remove();
  btnRow.appendChild(doneBtn);

  inner.appendChild(btnRow);
  modal.appendChild(inner);

  // Close on backdrop click
  modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
  document.body.appendChild(modal);
};
