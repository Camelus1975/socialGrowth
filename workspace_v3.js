export async function initWorkspaceV3() {
  const dropdownBtn = document.getElementById('workspace-selector-btn');
  const dropdownMenu = document.getElementById('workspace-dropdown-menu');
  const activeName = document.getElementById('active-workspace-name');
  
  if (!dropdownBtn || !dropdownMenu) return;
  
  let businesses = [];
  
  // Toggle dropdown
  dropdownBtn.addEventListener('click', (e) => {
    // Only toggle if we didn't click inside the menu
    if (!e.target.closest('.workspace-dropdown-item')) {
      dropdownMenu.classList.toggle('active');
    }
  });
  
  // Close when clicking outside
  document.addEventListener('click', (e) => {
    if (!dropdownBtn.contains(e.target)) {
      dropdownMenu.classList.remove('active');
    }
  });
  
  // Fetch from Supabase
  async function fetchWorkspaces() {
    if (window.supabaseClient) {
      try {
        const { data, error } = await window.supabaseClient.from('businesses').select('*');
        if (data && data.length > 0) {
          businesses = data;
          renderBusinesses(data);
          
          // Only auto-select the first one if we don't have an active one yet
          if (activeName.textContent === 'My Brand' || !activeName.textContent) {
            activeName.textContent = data[0].name || 'My Brand';
          }
        }
      } catch (err) {
        console.error('Could not fetch businesses:', err);
      }
    }
  }

  fetchWorkspaces();
  
  // Listen for agent-triggered workspace refreshes
  window.addEventListener('refreshWorkspaces', () => {
    fetchWorkspaces();
  });
  
  function renderBusinesses(data) {
    // Remove old business items (keep the 'Add New' button at the bottom)
    const existing = dropdownMenu.querySelectorAll('.biz-item');
    existing.forEach(el => el.remove());
    
    data.forEach(biz => {
      const el = document.createElement('div');
      el.className = 'workspace-dropdown-item biz-item';
      el.innerHTML = `<span>🏢</span> ${biz.name}`;
      el.addEventListener('click', () => {
        activeName.textContent = biz.name;
        dropdownMenu.classList.remove('active');
        // Trigger a global state update or re-render if necessary
      });
      // Insert before the 'Add Business' button
      dropdownMenu.insertBefore(el, dropdownMenu.lastElementChild);
    });
  }
}

// Global action to initiate AI business creation
export function initiateAddBusiness() {
  const dropdownMenu = document.getElementById('workspace-dropdown-menu');
  if (dropdownMenu) dropdownMenu.classList.remove('active');
  
  // Force click the copilot nav item to switch views
  const copilotNav = document.querySelector('.nav-item[data-args="copilot"]');
  if (copilotNav) copilotNav.click();
  
  // Inject AI interview prompt
  const history = document.getElementById('copilot-chat-history');
  if (history) {
    const msgDiv = document.createElement('div');
    msgDiv.style.padding = '16px';
    msgDiv.style.borderRadius = '12px';
    msgDiv.style.marginBottom = '12px';
    msgDiv.style.maxWidth = '85%';
    msgDiv.style.lineHeight = '1.6';
    msgDiv.style.background = 'rgba(99, 102, 241, 0.1)';
    msgDiv.style.alignSelf = 'flex-start';
    msgDiv.style.border = '1px solid rgba(99, 102, 241, 0.2)';
    msgDiv.innerHTML = `<strong>Agent:</strong> I can help you set up a new business workspace! To get started, what is the name and website URL of the brand you want to add?`;
    
    history.appendChild(msgDiv);
    history.scrollTop = history.scrollHeight;
  }
}
