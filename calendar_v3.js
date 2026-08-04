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
          const isVideo = post.media_url.endsWith('.mp4') || post.media_url.endsWith('.webm') || post.media_url.includes('video');
          if (isVideo) {
            mediaHtml = `<div style="margin-top:8px; border-radius:4px; overflow:hidden; max-height:80px; cursor:pointer;" onclick="event.stopPropagation(); window.openMediaViewer('${post.media_url}', 'video')"><video src="${post.media_url}" style="width:100%; height:auto; object-fit:cover;" muted></video><div style="position:absolute; bottom:4px; right:4px; font-size:1.2rem;">▶️</div></div>`;
          } else {
            mediaHtml = `<div style="margin-top:8px; border-radius:4px; overflow:hidden; max-height:80px; cursor:zoom-in;" onclick="event.stopPropagation(); window.openMediaViewer('${post.media_url}', 'image')"><img src="${post.media_url}" style="width:100%; height:auto; object-fit:cover;" /></div>`;
          }
        }
        
        // Escape post content for safe use in onclick attribute
        const escapedContent = encodeURIComponent(post.content || '');
        const escapedMediaUrl = post.media_url ? encodeURIComponent(post.media_url) : '';
        const isVideoPost = post.media_url && (post.media_url.endsWith('.mp4') || post.media_url.endsWith('.webm') || post.media_url.includes('video'));

        html += `
          <div 
            style="background:rgba(0,0,0,0.3); opacity:${opacity}; border-left: 3px solid ${color}; border-radius:6px; padding:12px; margin-top:12px; font-size:0.85rem; color:var(--text-muted); position:relative; cursor:pointer;"
            onclick="window.openPostDetail('${post.id}', '${post.platform}', '${post.status}', '${escapedMediaUrl}', ${isVideoPost}, decodeURIComponent('${escapedContent}'))"
          >
            <div style="font-weight:bold; margin-bottom:4px; color:var(--text-main); display:flex; justify-content:space-between; align-items:center;">
              <span>${timeStr} - ${post.platform}</span>
              <div style="display:flex; gap:8px; align-items:center;">
                <span title="${post.status}">${statusIcon}</span>
                <button onclick="event.stopPropagation(); window.deleteCalendarPost('${post.id}')" style="background:none; border:none; color:var(--error); cursor:pointer; padding:0; font-size:1.1rem;" title="Delete Post">🗑️</button>
              </div>
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

window.deleteCalendarPost = async function(postId) {
  if (!state.activeWorkspaceId) return;
  if (!confirm("Are you sure you want to permanently delete this scheduled post?")) return;
  
  try {
    const res = await requestApi(`/api/calendar/${state.activeWorkspaceId}/${postId}`, {
      method: 'DELETE'
    });
    
    if (res.success) {
      loadCalendar();
    } else {
      alert("Failed to delete post: " + res.error);
    }
  } catch (err) {
    console.error(err);
    alert("Error deleting post.");
  }
};

// Open a detailed post view modal when a post card is clicked
window.openPostDetail = function(postId, platform, status, encodedMediaUrl, isVideo, content) {
  const mediaUrl = encodedMediaUrl ? decodeURIComponent(encodedMediaUrl) : null;

  let existingModal = document.getElementById('post-detail-modal');
  if (existingModal) existingModal.remove();

  const platformColors = { linkedin: '#60a5fa', instagram: '#f472b6', tiktok: '#2dd4bf', twitter: '#38bdf8', facebook: '#818cf8' };
  const color = platformColors[platform.toLowerCase()] || '#9ca3af';
  const statusLabel = status === 'published' ? '✅ Published' : status === 'failed' ? '❌ Failed' : status === 'draft' ? '📝 Draft' : '⏳ Scheduled';

  let mediaSection = '';
  if (mediaUrl) {
    if (isVideo) {
      mediaSection = `<video src="${mediaUrl}" controls style="width:100%; border-radius:10px; margin-bottom:16px; max-height:260px;"></video>`;
    } else {
      mediaSection = `<img src="${mediaUrl}" style="width:100%; border-radius:10px; margin-bottom:16px; max-height:320px; object-fit:contain; cursor:zoom-in;" onclick="window.openMediaViewer('${mediaUrl}', 'image')" />`;
    }
  }

  const modal = document.createElement('div');
  modal.id = 'post-detail-modal';
  modal.style.cssText = 'position:fixed; inset:0; z-index:10000; background:rgba(0,0,0,0.75); backdrop-filter:blur(6px); display:flex; align-items:center; justify-content:center; padding:20px;';
  modal.innerHTML = `
    <div style="background:var(--bg-panel); border:1px solid var(--border-glass); border-radius:16px; padding:28px; width:100%; max-width:560px; max-height:85vh; overflow-y:auto; position:relative;">
      <button onclick="document.getElementById('post-detail-modal').remove()" style="position:absolute; top:16px; right:16px; background:rgba(255,255,255,0.08); border:1px solid var(--border-glass); color:var(--text-main); border-radius:50%; width:32px; height:32px; cursor:pointer; font-size:1rem;">✕</button>
      
      <div style="display:flex; align-items:center; gap:12px; margin-bottom:20px;">
        <div style="width:12px; height:12px; border-radius:50%; background:${color};"></div>
        <span style="font-weight:700; font-size:1.1rem; color:var(--text-main); text-transform:capitalize;">${platform}</span>
        <span style="font-size:0.85rem; color:var(--text-muted); margin-left:auto;">${statusLabel}</span>
      </div>

      ${mediaSection}

      <div style="background:rgba(255,255,255,0.03); border:1px solid var(--border-glass); border-radius:10px; padding:16px; white-space:pre-wrap; line-height:1.7; color:var(--text-main); font-size:0.95rem;">${content}</div>

      <div style="display:flex; gap:12px; margin-top:20px; justify-content:flex-end;">
        <button onclick="navigator.clipboard.writeText(decodeURIComponent('${encodedMediaUrl ? encodedMediaUrl : ''}'));" style="display:${mediaUrl ? 'inline-flex' : 'none'}; align-items:center; gap:6px; background:rgba(255,255,255,0.06); border:1px solid var(--border-glass); color:var(--text-muted); padding:8px 16px; border-radius:8px; cursor:pointer;">📋 Copy Media URL</button>
        <button onclick="navigator.clipboard.writeText(\`${content.replace(/`/g, "'")}\`); window.__showToast && window.__showToast('Content copied!', 'success');" style="background:rgba(99,102,241,0.15); border:1px solid rgba(99,102,241,0.4); color:#a5b4fc; padding:8px 16px; border-radius:8px; cursor:pointer;">📋 Copy Caption</button>
        <button onclick="document.getElementById('post-detail-modal').remove()" style="background:var(--bg-surface); border:1px solid var(--border-glass); color:var(--text-muted); padding:8px 16px; border-radius:8px; cursor:pointer;">Close</button>
      </div>
    </div>
  `;

  // Close on backdrop click
  modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
  document.body.appendChild(modal);
};
