// App Founder Growth Suite - Calendar Module
import { state } from './state.js';
import { createSafeElement, requestApi, showToast, openModal, closeModal } from './common.js';

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
  try {
    const data = await requestApi(`/api/calendar/posts?appId=${state.currentActiveApp}`);
    state.calendarState[state.currentActiveApp] = data.posts;
  } catch (err) {
    console.warn("Backend server offline. Relying on local scheduled calendar state.");
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
      openSchedulePostModal(dateStr);
    });
    
    container.appendChild(dayBox);
  }
}

function showCalendarPostDetailsModal(postId) {
  const posts = state.calendarState[state.currentActiveApp] || [];
  const post = posts.find(p => p.id === postId);
  if (!post) return;
  
  document.getElementById('modal-post-platform').textContent = post.platform.toUpperCase();
  document.getElementById('modal-post-status').textContent = post.status.toUpperCase();
  document.getElementById('modal-post-date').textContent = `${post.date} @ ${post.time}`;
  document.getElementById('modal-post-body').textContent = post.text;
  
  openModal('calendar-details-modal');
}

function openSchedulePostModal(dateStr) {
  document.getElementById('modal-create-date').value = dateStr;
  document.getElementById('modal-create-text').value = '';
  openModal('calendar-create-modal');
}

async function saveCalendarPostFromModal() {
  const text = document.getElementById('modal-create-text').value.trim();
  const date = document.getElementById('modal-create-date').value;
  const platform = document.getElementById('modal-create-platform').value;
  const time = document.getElementById('modal-create-time').value;
  
  if (!text) {
    showToast("Please enter post content copy details!", "error");
    return;
  }
  
  const newPost = {
    id: "cal_new_" + Date.now(),
    date: date,
    time: time,
    platform: platform,
    text: text,
    status: "scheduled",
    approval: "Approved"
  };
  
  try {
    await requestApi('/api/calendar/schedule', {
      method: 'POST',
      body: JSON.stringify(newPost)
    });
    showToast("Post scheduled successfully! Queue conflicts checked.", "success");
  } catch (err) {
    showToast("Post scheduled locally. (Express Offline)", "success");
  }
  
  state.calendarState[state.currentActiveApp].push(newPost);
  closeModal('calendar-create-modal');
  renderCalendarView();
}

export function openCalendarPostModal() {
  const today = new Date().toISOString().split('T')[0];
  openSchedulePostModal(today);
}
