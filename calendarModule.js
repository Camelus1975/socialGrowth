// App Founder Growth Suite - Calendar Module
import { state } from './state.js';
import { createSafeElement, requestApi, showToast, openModal, closeModal } from './common.js';
import { getSupabaseClient } from './auth.js';
export function initCalendar() {
  state.on('appChanged', () => {
    if (state.currentActiveView === 'social-calendar') fetchCalendarPosts();
  });
  
  state.on('viewChanged', (viewId) => {
    if (viewId === 'social-calendar') fetchCalendarPosts();
  });
  
  // Bind form listeners inside the custom modals
  const createFormBtn = document.getElementById('calendar-modal-save-btn');
  if (createFormBtn) {
    createFormBtn.addEventListener('click', saveCalendarPostFromModal);
  }
}

export async function fetchCalendarPosts() {
  if (!state.currentActiveApp) return;
  
  // Initialize state array if it doesn't exist to prevent crashes
  if (!state.calendarState[state.currentActiveApp]) {
    state.calendarState[state.currentActiveApp] = [];
  }
  
  try {
    const supabase = getSupabaseClient();
    if (supabase) {
      const { data, error } = await supabase
        .from('scheduled_posts')
        .select('*')
        .eq('app_id', state.currentActiveApp);
        
      if (error) throw error;
      
      if (data) {
        state.calendarState[state.currentActiveApp] = data.map(dbPost => ({
          id: dbPost.id,
          date: dbPost.scheduled_date,
          time: dbPost.scheduled_time,
          platform: dbPost.platform,
          text: dbPost.content,
          status: dbPost.status,
          media_url: dbPost.media_url,
          approval: "Approved"
        }));
      }
    }
  } catch (err) {
    console.warn("Could not fetch calendar posts from Supabase", err);
  }
  
  renderCalendarView();
}

export function renderCalendarView() {
  const container = document.getElementById('calendar-month-grid-boxes');
  if (!container) return;
  container.innerHTML = '';
  
  const appPosts = state.calendarState[state.currentActiveApp] || [];
  
  for (let i = 1; i <= 35; i++) {
    const dayNum = i <= 30 ? i : i - 30;
    const isToday = dayNum === 8 && i <= 30 ? 'today' : '';
    const dateStr = `2026-06-${dayNum.toString().padStart(2, '0')}`;
    
    const dayBox = createSafeElement('div', ['calendar-day-box']);
    if (isToday) dayBox.classList.add('today');
    
    const dayLabel = createSafeElement('span', ['calendar-day-number'], dayNum.toString());
    dayBox.appendChild(dayLabel);
    
    // Find scheduled posts on this date
    const dayPosts = appPosts.filter(p => p.date === dateStr);
    
    dayPosts.forEach(post => {
      const classMap = {
        'published': 'post-badge-published',
        'scheduled': 'post-badge-scheduled',
        'draft': 'post-badge-draft'
      };
      const badgeClass = classMap[post.status] || 'post-badge-draft';
      const badge = createSafeElement('div', ['calendar-post-badge', badgeClass], `${post.platform.substring(0,2).toUpperCase()}: ${post.text.substring(0, 10)}...`);
      
      badge.addEventListener('click', (e) => {
        e.stopPropagation();
        showCalendarPostDetailsModal(post.id);
      });
      dayBox.appendChild(badge);
    });
    
    // Click on date box triggers schedule modal
    dayBox.addEventListener('click', () => {
      window.openSchedulePostModal(dateStr);
    });
    
    container.appendChild(dayBox);
  }
}

let currentViewedPostId = null;

window.showCalendarPostDetailsModal = function(postId) {
  const posts = state.calendarState[state.currentActiveApp] || [];
  const post = posts.find(p => p.id === postId);
  if (!post) return;
  
  currentViewedPostId = postId;
  
  document.getElementById('modal-post-platform').textContent = post.platform.toUpperCase();
  document.getElementById('modal-post-status').textContent = post.status.toUpperCase();
  document.getElementById('modal-post-date').textContent = `${post.date} @ ${post.time}`;
  document.getElementById('modal-post-body').textContent = post.text;
  
  const mediaContainer = document.getElementById('modal-post-media-container');
  const mediaImg = document.getElementById('modal-post-media');
  if (post.media_url) {
    mediaImg.src = post.media_url;
    mediaContainer.style.display = 'block';
  } else {
    mediaImg.src = '';
    mediaContainer.style.display = 'none';
  }
  
  openModal('calendar-details-modal');
}

window.openSchedulePostModal = function(dateStr, textStr, platformStr, mediaUrlStr) {
  document.getElementById('modal-create-date').value = dateStr || '';
  if (textStr) document.getElementById('modal-create-text').value = textStr;
  if (platformStr) document.getElementById('modal-create-platform').value = platformStr;
  if (mediaUrlStr && document.getElementById('modal-create-media')) {
    document.getElementById('modal-create-media').value = mediaUrlStr;
  }
  openModal('calendar-create-modal');
}

window.deleteCalendarPost = async function() {
  if (!currentViewedPostId) return;
  if (!confirm("Are you sure you want to permanently delete this scheduled post?")) return;
  
  try {
    const supabase = getSupabaseClient();
    if (supabase) {
      const { error } = await supabase
        .from('scheduled_posts')
        .delete()
        .eq('id', currentViewedPostId);
      
      if (error) throw error;
      
      showToast("Post deleted successfully", "success");
      closeModal('calendar-details-modal');
      await fetchCalendarPosts(); // Refresh calendar view
    }
  } catch (err) {
    console.error("Error deleting post:", err);
    showToast("Failed to delete post", "error");
  }
}

window.clearAllCalendarPosts = async function() {
  if (!state.currentActiveApp) return;
  if (!confirm("Are you sure you want to permanently delete ALL scheduled posts for this app? This action cannot be undone.")) return;
  
  try {
    const supabase = getSupabaseClient();
    if (supabase) {
      const { error } = await supabase
        .from('scheduled_posts')
        .delete()
        .eq('business_id', state.currentActiveApp);
      
      // Also try deleting by app_id if schema is slightly mismatched
      await supabase
        .from('scheduled_posts')
        .delete()
        .eq('app_id', state.currentActiveApp);
        
      if (error) throw error;
      
      showToast("All scheduled posts deleted successfully", "success");
      await fetchCalendarPosts(); // Refresh calendar view
    }
  } catch (err) {
    console.error("Error clearing posts:", err);
    showToast("Failed to clear posts", "error");
  }
}

async function saveCalendarPostFromModal() {
  const text = document.getElementById('modal-create-text').value.trim();
  const date = document.getElementById('modal-create-date').value;
  const platform = document.getElementById('modal-create-platform').value;
  const time = document.getElementById('modal-create-time').value;
  const mediaUrl = document.getElementById('modal-create-media') ? document.getElementById('modal-create-media').value.trim() : null;
  
  if (!text) {
    showToast("Please enter post content copy details!", "error");
    return;
  }
  
  const newPost = {
    id: "cal_new_" + Date.now(), // Fallback ID
    date: date,
    time: time,
    platform: platform,
    text: text,
    media_url: mediaUrl,
    status: "scheduled",
    approval: "Approved"
  };
  
  try {
    const supabase = getSupabaseClient();
    if (supabase) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data, error } = await supabase.from('scheduled_posts').insert({
          user_id: user.id,
          app_id: state.currentActiveApp,
          platform: platform,
          content: text,
          scheduled_date: date,
          scheduled_time: time,
          media_url: mediaUrl,
          status: 'scheduled'
        }).select();
        
        if (error) throw error;
        
        if (data && data.length > 0) {
          newPost.id = data[0].id;
        }
        showToast(`Post scheduled to ${platform} successfully!`, "success");

        // Fire and forget to Embeddings Engine
        requestApi('/api/ai-gateway/embed', {
          method: 'POST',
          body: JSON.stringify({
            text: text,
            appId: state.currentActiveApp,
            contentType: 'post'
          })
        }).catch(err => console.error("Embedding generation failed:", err));

      } else {
        throw new Error("Not logged in");
      }
    } else {
      throw new Error("No Supabase client");
    }
  } catch (err) {
    console.warn("Could not save to Supabase. Saving locally.", err);
    showToast("Post scheduled locally. (Backend Offline)", "success");
  }
  
  if (!state.calendarState[state.currentActiveApp]) {
    state.calendarState[state.currentActiveApp] = [];
  }
  state.calendarState[state.currentActiveApp].push(newPost);
  closeModal('calendar-create-modal');
  renderCalendarView();
}

export function openCalendarPostModal() {
  const today = new Date().toISOString().split('T')[0];
  window.openSchedulePostModal(today);
}
