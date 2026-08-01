export function initCalendarV3() {
  const grid = document.getElementById('calendar-grid-container');
  if (!grid) return;

  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  
  // Dummy scheduled posts
  const scheduledPosts = {
    'Tue': [{ time: '10:00 AM', platform: 'LinkedIn', content: 'New product announcement...' }],
    'Thu': [{ time: '02:00 PM', platform: 'Instagram', content: 'Behind the scenes photo...' }, { time: '05:00 PM', platform: 'TikTok', content: 'Office tour video' }]
  };

  let html = '';
  
  days.forEach(day => {
    html += `<div style="background:rgba(255,255,255,0.02); border:1px solid var(--border-glass); border-radius:12px; padding:16px; min-height:150px;">`;
    html += `<h3 style="margin-top:0; color:var(--text-main); font-size:1rem; text-align:center;">${day}</h3>`;
    
    if (scheduledPosts[day]) {
      scheduledPosts[day].forEach(post => {
        let color = '#9ca3af';
        if (post.platform === 'LinkedIn') color = '#60a5fa'; // Blue
        if (post.platform === 'Instagram') color = '#f472b6'; // Pink
        if (post.platform === 'TikTok') color = '#2dd4bf'; // Teal
        
        html += `
          <div style="background:rgba(0,0,0,0.3); border-left: 3px solid ${color}; border-radius:6px; padding:12px; margin-top:12px; font-size:0.85rem; color:var(--text-muted); cursor:pointer;">
            <div style="font-weight:bold; margin-bottom:4px; color:var(--text-main);">${post.time} - ${post.platform}</div>
            <div style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${post.content}</div>
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
