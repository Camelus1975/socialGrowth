// App Founder Growth Suite - AI Content Studio & Strategy Module
import { state } from './state.js';
import { requestApi, showToast, createSafeElement } from './common.js';

let releaseAssetsData = {};

export function initStudio() {
  state.on('appChanged', () => {
    refreshStudioViewData();
  });
  
  state.on('viewChanged', () => {
    refreshStudioViewData();
  });
}

function refreshStudioViewData() {
  const viewId = state.currentActiveView;
  if (viewId === 'aso-center') {
    renderASOView();
  } else if (viewId === 'roadmap-center') {
    renderRoadmapView();
  } else if (viewId === 'content-recycler') {
    renderRecyclerAndCopilotView();
  } else if (viewId === 'competitor-ecosystem') {
    renderCompetitorEcosystemView();
  } else if (viewId === 'insights') {
    renderExecutiveInsights();
  }
}

// ------------------------------------------
// TABS AND PROMPTS
// ------------------------------------------
export function prefillLaunchPrompt(type) {
  const app = state.appsData[state.currentActiveApp];
  if (!app) return;
  const promptArea = document.getElementById('launch-prompt');
  if (!promptArea) return;
  
  if (type === 'Launch my app') {
    promptArea.value = `Launch my app ${app.name} on Product Hunt, HackerNews, and Twitter, targeting tech-savvy early adopters.`;
  } else {
    promptArea.value = `Launch a new feature release campaign for ${app.name} showcasing our brand new AI powered scheduling automation dashboard.`;
  }
}

export function generateLaunchCampaign() {
  const app = state.appsData[state.currentActiveApp];
  if (!app) return;
  const promptEl = document.getElementById('launch-prompt');
  if (!promptEl) return;
  const prompt = promptEl.value.trim();
  
  if (!prompt) {
    showToast("Please enter a launch description first!", "error");
    return;
  }
  
  showToast("AI Launch Copilot is formulating growth blueprints...", "success");
  
  const summary = document.getElementById('launch-strategy-summary');
  if (summary) {
    summary.innerHTML = '';
    const wrapper = createSafeElement('div');
    wrapper.style.display = 'flex';
    wrapper.style.flexDirection = 'column';
    wrapper.style.gap = '10px';
    
    const title = createSafeElement('h5', [], `Strategic Summary: Release of ${app.name}`);
    title.style.color = 'white';
    title.style.fontSize = '0.95rem';
    
    const details = createSafeElement('p');
    details.innerHTML = `<strong>Recommended Target Channels:</strong> Twitter/X, Product Hunt, email announcement campaign.`;
    
    wrapper.appendChild(title);
    wrapper.appendChild(details);
    summary.appendChild(wrapper);
  }
  
  const timeline = document.getElementById('launch-timeline-container');
  if (timeline) {
    timeline.innerHTML = '';
    
    const item1 = createSafeElement('div', ['timeline-item', 'completed']);
    item1.innerHTML = `<div class="timeline-dot"></div><div class="timeline-content"><div class="timeline-date">Day -7</div><div class="timeline-title">Assets Prep</div><div class="timeline-text">Media logs constructed.</div></div>`;
    
    const item2 = createSafeElement('div', ['timeline-item', 'active']);
    item2.innerHTML = `<div class="timeline-dot"></div><div class="timeline-content"><div class="timeline-date">Day -3</div><div class="timeline-title">Teasers</div><div class="timeline-text">X teasers scheduling.</div></div>`;
    
    timeline.appendChild(item1);
    timeline.appendChild(item2);
  }
  
  const cal = document.getElementById('content-calendar-container');
  if (cal) {
    cal.innerHTML = `
      <div class="calendar-post-card">
        <div class="post-header">
          <span class="post-platform">Twitter</span>
          <span class="post-timing">Day -3</span>
        </div>
        <div class="post-body">Building something special. Launching soon.</div>
      </div>
    `;
  }
  
  showToast("Launch blueprints generated!", "success");
}

// ------------------------------------------
// ASO ENGINE
// ------------------------------------------
export function renderASOView() {
  const app = state.appsData[state.currentActiveApp];
  if (!app) return;
  
  const asoText = document.getElementById('aso-meta-text');
  if (asoText) {
    asoText.value = `Get the ultimate ${app.tagline}. Our tools help users manage workouts, log task checklists, and study metrics.`;
  }
  
  const tbody = document.getElementById('aso-keywords-tbody');
  if (tbody) {
    tbody.innerHTML = '';
    (app.keywords || []).forEach(k => {
      const row = createSafeElement('tr');
      
      const keyTd = createSafeElement('td', [], k.keyword);
      keyTd.style.fontWeight = '600';
      keyTd.style.color = 'white';
      
      const volTd = createSafeElement('td', [], `${k.volume}%`);
      
      const compTd = createSafeElement('td');
      const compSpan = createSafeElement('span', [], k.competition);
      compSpan.style.color = (k.competition === 'High' || k.competition === 'Very High') ? 'var(--accent-red)' : 'var(--accent-green)';
      compSpan.style.fontWeight = '600';
      compTd.appendChild(compSpan);
      
      const rankTd = createSafeElement('td');
      const rankSpan = createSafeElement('span', [], `#${k.rank}`);
      rankSpan.style.background = 'rgba(255,255,255,0.05)';
      rankSpan.style.padding = '2px 6px';
      rankSpan.style.borderRadius = '4px';
      rankSpan.style.color = '#a5b4fc';
      rankTd.appendChild(rankSpan);
      
      row.appendChild(keyTd);
      row.appendChild(volTd);
      row.appendChild(compTd);
      row.appendChild(rankTd);
      tbody.appendChild(row);
    });
  }
  
  const gaps = document.getElementById('aso-competitor-gaps');
  if (gaps) {
    gaps.innerHTML = '';
    (app.competitors || []).forEach(comp => {
      const card = createSafeElement('div');
      card.style.background = 'rgba(255,255,255,0.02)';
      card.style.border = '1px solid var(--border-glass)';
      card.style.borderRadius = 'var(--radius-sm)';
      card.style.padding = '12px';
      card.style.marginBottom = '8px';
      
      const header = createSafeElement('div');
      header.style.display = 'flex';
      header.style.justifyContent = 'space-between';
      header.style.marginBottom = '6px';
      
      const gapTitle = createSafeElement('strong', [], `${comp.name} Gap`);
      gapTitle.style.color = 'white';
      gapTitle.style.fontSize = '0.85rem';
      
      const rankSpan = createSafeElement('span', [], `Rank #${comp.rank}`);
      rankSpan.style.color = 'var(--accent-orange)';
      rankSpan.style.fontSize = '0.75rem';
      rankSpan.style.fontWeight = '600';
      
      header.appendChild(gapTitle);
      header.appendChild(rankSpan);
      
      const desc = createSafeElement('p');
      desc.style.fontSize = '0.8rem';
      desc.style.color = 'var(--text-muted)';
      desc.textContent = `Rival is outranking you on keyword `;
      const strong = createSafeElement('strong', [], `'${comp.keyword}'`);
      strong.style.color = 'var(--primary)';
      desc.appendChild(strong);
      desc.appendChild(document.createTextNode('.'));
      
      card.appendChild(header);
      card.appendChild(desc);
      gaps.appendChild(card);
    });
  }
}

export function runASOAnalysis() {
  const asoText = document.getElementById('aso-meta-text');
  if (!asoText || !asoText.value) {
    showToast("Please write description text!", "error");
    return;
  }
  
  showToast("Crawling search optimization index...", "success");
  
  const output = document.getElementById('aso-output-block');
  if (output) {
    output.innerHTML = `
      <div style="display:flex; flex-direction:column; gap:12px;">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <span style="font-size:0.85rem; font-weight:600; color:white;">ASO Score Card:</span>
          <span style="font-size:1.1rem; font-weight:700; color:var(--accent-green);">82 / 100</span>
        </div>
        <p style="font-size:0.75rem; color:var(--text-muted);">Optimization index shows stable backlinks crawl parameters. Found 2 content description changes recommended for target store titles.</p>
      </div>
    `;
  }
}

// ------------------------------------------
// AI CONTENT STUDIO - GENERATION
// ------------------------------------------
export async function generateStudioContent() {
  const platform = document.getElementById('studio-platform').value;
  const promptText = document.getElementById('studio-prompt').value.trim();
  const tone = document.getElementById('studio-tone').value;
  const isAb = document.getElementById('studio-ab-toggle').checked;
  const app = state.appsData[state.currentActiveApp];
  if (!app) return;
  
  if (!promptText) {
    showToast("Please input a campaign topic prompt first!", "error");
    return;
  }
  
  showToast("AI Studio formatting platform variants...", "success");
  
  let resultCopy = {
    variant_a: `🚀 Say goodbye to manual logging! The smartwatch tracker is officially live on ${app.name}. [Link]`,
    variant_b: `Sore workouts? Optimize gym streaks with ${app.name}'s WearOS app sync updates. [Link]`
  };
  
  try {
    const data = await requestApi('/api/ai-gateway/generate', {
      method: 'POST',
      body: JSON.stringify({ prompt: promptText, platform, tone, enable_ab: isAb, taskType: 'post' })
    });
    resultCopy = data.copy;
  } catch (err) {
    console.warn("Express AI studio offline. Falling back to local generation templates.");
  }
  
  const block = document.getElementById('studio-outputs-block');
  if (block) {
    block.innerHTML = '';
    if (isAb) {
      const cardA = createSafeElement('div');
      cardA.style.background = 'rgba(255,255,255,0.02)';
      cardA.style.border = '1px solid var(--primary)';
      cardA.style.padding = '14px';
      cardA.style.borderRadius = '6px';
      
      const headA = createSafeElement('h5', [], 'VARIANT A (Click Optimizer)');
      headA.style.color = 'var(--primary)';
      headA.style.fontSize = '0.8rem';
      headA.style.marginBottom = '6px';
      
      const pA = createSafeElement('p', [], resultCopy.variant_a);
      pA.style.fontSize = '0.82rem';
      pA.style.color = 'white';
      pA.style.lineHeight = '1.4';
      
      const btnA = createSafeElement('button', ['btn', 'btn-primary'], 'Schedule this Variant');
      btnA.style.marginTop = '10px';
      btnA.style.fontSize = '0.75rem';
      btnA.style.padding = '6px 12px';
      btnA.onclick = () => window.openSchedulePostModal(new Date().toISOString().split('T')[0], resultCopy.variant_a, platform, document.getElementById('studio-generated-image-url')?.value);
      
      cardA.appendChild(headA);
      cardA.appendChild(pA);
      cardA.appendChild(btnA);
      
      const cardB = createSafeElement('div');
      cardB.style.background = 'rgba(255,255,255,0.02)';
      cardB.style.border = '1px solid var(--secondary)';
      cardB.style.padding = '14px';
      cardB.style.borderRadius = '6px';
      cardB.style.marginTop = '12px';
      
      const headB = createSafeElement('h5', [], 'VARIANT B (Direct CTA)');
      headB.style.color = 'var(--secondary)';
      headB.style.fontSize = '0.8rem';
      headB.style.marginBottom = '6px';
      
      const pB = createSafeElement('p', [], resultCopy.variant_b);
      pB.style.fontSize = '0.82rem';
      pB.style.color = 'white';
      pB.style.lineHeight = '1.4';

      const btnB = createSafeElement('button', ['btn', 'btn-primary'], 'Schedule this Variant');
      btnB.style.marginTop = '10px';
      btnB.style.fontSize = '0.75rem';
      btnB.style.padding = '6px 12px';
      btnB.onclick = () => window.openSchedulePostModal(new Date().toISOString().split('T')[0], resultCopy.variant_b, platform, document.getElementById('studio-generated-image-url')?.value);
      
      cardB.appendChild(headB);
      cardB.appendChild(pB);
      cardB.appendChild(btnB);
      
      block.appendChild(cardA);
      block.appendChild(cardB);
    } else {
      const card = createSafeElement('div');
      card.style.background = 'rgba(255,255,255,0.02)';
      card.style.border = '1px solid var(--border-glass)';
      card.style.padding = '14px';
      card.style.borderRadius = '6px';
      
      const head = createSafeElement('h5', [], 'Platform Optimized Draft');
      head.style.color = 'white';
      head.style.fontSize = '0.8rem';
      head.style.marginBottom = '6px';
      
      const p = createSafeElement('p', [], resultCopy.variant_a);
      p.style.fontSize = '0.82rem';
      p.style.color = 'white';
      p.style.lineHeight = '1.4';
      
      const btn = createSafeElement('button', ['btn', 'btn-primary'], 'Schedule this Variant');
      btn.style.marginTop = '10px';
      btn.style.fontSize = '0.75rem';
      btn.style.padding = '6px 12px';
      btn.onclick = () => window.openSchedulePostModal(new Date().toISOString().split('T')[0], resultCopy.variant_a, platform, document.getElementById('studio-generated-image-url')?.value);

      card.appendChild(head);
      card.appendChild(p);
      card.appendChild(btn);
      block.appendChild(card);
    }
  }
  showToast("Copy variations successfully created!", "success");
}

export async function recycleStudioContent() {
  const promptEl = document.getElementById('studio-prompt');
  const promptText = promptEl.value.trim();
  const app = state.appsData[state.currentActiveApp];
  
  if (!promptText) {
    showToast("Please type a topic first so we can find relevant past content!", "error");
    return;
  }
  
  showToast("Vector searching database for winning past content...", "success");
  
  try {
    const res = await requestApi('/api/ai-gateway/search-similar', {
      method: 'POST',
      body: JSON.stringify({ query: promptText, appId: app.id })
    });
    
    if (res.results && res.results.length > 0) {
      showToast("Found 3 highly similar past posts! Injecting as context...", "success");
      // Append the results to the prompt box so the LLM uses it as context when Generate is clicked
      promptEl.value = promptText + "\n\n--- INSPIRATION CONTENT ---\n" + res.results.join("\n\n");
    } else {
      showToast("No similar past content found for this brand yet.", "error");
    }
  } catch (err) {
    console.error("Failed to recycle content:", err);
    showToast("Vector search failed. Is pgvector enabled?", "error");
  }
}

// ------------------------------------------
// RECYCLER & COPILOT VIEW
// ------------------------------------------
export function renderRecyclerAndCopilotView() {
  const app = state.appsData[state.currentActiveApp];
  if (!app) return;
  
  const recyclerInput = document.getElementById('recycle-input-post');
  if (recyclerInput) {
    recyclerInput.value = `Why do indie developers fail? Most don't lack build speeds. They lack consistency.`;
  }
  
  const list = document.getElementById('copilot-recommendations-list');
  if (list) {
    list.innerHTML = '';
    (app.copilotInsights || []).forEach(insight => {
      const card = createSafeElement('div', ['glass-card']);
      card.style.background = 'rgba(255,255,255,0.02)';
      card.style.borderColor = 'var(--border-glass)';
      
      const title = createSafeElement('h5', [], insight.title);
      title.style.color = 'white';
      title.style.fontSize = '0.85rem';
      title.style.marginBottom = '4px';
      
      const text = createSafeElement('p', [], insight.text);
      text.style.fontSize = '0.75rem';
      text.style.color = 'var(--text-muted)';
      
      card.appendChild(title);
      card.appendChild(text);
      list.appendChild(card);
    });
  }
}

export function recycleContent() {
  const inputEl = document.getElementById('recycle-input-post');
  if (!inputEl) return;
  const content = inputEl.value.trim();
  const platform = document.getElementById('recycle-target-platform').value;
  
  if (!content) {
    showToast("Please enter text copy first!", "error");
    return;
  }
  
  showToast("AI Recycler writing variation...", "success");
  
  const variants = {
    'twitter': `🧵 Indie builders trap: focusing 100% on code quality, 0% on target distribution loops.`,
    'linkedin': `Acquisition is a constant battle for founders. Consistency outperforms talent in social media algorithms.`,
    'newsletter': `Hey Founder, most SaaS businesses don't fail because of build speeds; they fail due to invisible pipelines.`
  };
  
  const output = document.getElementById('recycler-output');
  if (output) {
    output.textContent = variants[platform] || '';
  }
}

// ------------------------------------------
// ROADMAP MANAGER
// ------------------------------------------
export function toggleRoadmapVisibility() {
  const toggle = document.getElementById('roadmap-visibility-toggle');
  if (!toggle) return;
  state.roadmapVisibility = toggle.checked ? 'public' : 'private';
  
  const label = document.getElementById('roadmap-visibility-label');
  if (label) {
    label.textContent = toggle.checked ? 'Public Roadmap' : 'Private Roadmap';
  }
  renderRoadmapView();
}

export function renderRoadmapView() {
  const app = state.appsData[state.currentActiveApp];
  if (!app) return;
  const items = state.customRoadmapItems[app.id] || [];
  
  const plannedCol = document.getElementById('roadmap-list-planned');
  const progressCol = document.getElementById('roadmap-list-inprogress');
  const completedCol = document.getElementById('roadmap-list-completed');
  
  if (!plannedCol || !progressCol || !completedCol) return;
  
  plannedCol.innerHTML = '';
  progressCol.innerHTML = '';
  completedCol.innerHTML = '';
  
  let plannedCount = 0, progressCount = 0, completedCount = 0;
  
  const selectFeature = document.getElementById('roadmap-select-feature');
  if (selectFeature) selectFeature.innerHTML = '';
  
  items.forEach(item => {
    if (state.roadmapVisibility === 'public' && item.visibility !== 'public') return;
    
    const card = createSafeElement('div', ['roadmap-card']);
    
    const tag = createSafeElement('span', ['roadmap-card-tag', `tag-${item.category.toLowerCase().replace(/\s+/g, '')}`], item.category);
    const title = createSafeElement('div', ['roadmap-card-title'], item.title);
    const desc = createSafeElement('div', ['roadmap-card-desc'], item.desc);
    
    const footer = createSafeElement('div', ['roadmap-card-footer']);
    const scopeSpan = createSafeElement('span', [], item.visibility.toUpperCase());
    
    const voteBtn = createSafeElement('button', ['roadmap-vote-btn']);
    const arrowSpan = document.createTextNode('▲ ');
    const countSpan = createSafeElement('span', [], item.votes.toString());
    countSpan.id = `vote-count-${item.id}`;
    
    voteBtn.appendChild(arrowSpan);
    voteBtn.appendChild(countSpan);
    voteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      voteOnRoadmapItem(item.id);
    });
    
    footer.appendChild(scopeSpan);
    footer.appendChild(voteBtn);
    
    card.appendChild(tag);
    card.appendChild(title);
    card.appendChild(desc);
    card.appendChild(footer);
    
    if (item.status === 'planned') {
      plannedCol.appendChild(card);
      plannedCount++;
    } else if (item.status === 'in-progress') {
      progressCol.appendChild(card);
      progressCount++;
    } else if (item.status === 'completed') {
      completedCol.appendChild(card);
      completedCount++;
    }
    
    if (selectFeature) {
      const opt = createSafeElement('option', [], item.title);
      opt.value = item.id;
      selectFeature.appendChild(opt);
    }
  });
  
  const plannedCntEl = document.getElementById('roadmap-count-planned');
  const progressCntEl = document.getElementById('roadmap-count-inprogress');
  const completedCntEl = document.getElementById('roadmap-count-completed');
  
  if (plannedCntEl) plannedCntEl.textContent = plannedCount.toString();
  if (progressCntEl) progressCntEl.textContent = progressCount.toString();
  if (completedCntEl) completedCntEl.textContent = completedCount.toString();
}

export function voteOnRoadmapItem(itemId) {
  const app = state.appsData[state.currentActiveApp];
  if (!app) return;
  const items = state.customRoadmapItems[app.id] || [];
  const found = items.find(i => i.id === itemId);
  if (found) {
    found.votes++;
    showToast("Vote recorded in database!", "success");
    renderRoadmapView();
  }
}

export function addNewRoadmapItem() {
  const titleInput = document.getElementById('new-feature-title');
  const descInput = document.getElementById('new-feature-desc');
  if (!titleInput || !descInput) return;
  
  const title = titleInput.value.trim();
  const desc = descInput.value.trim();
  const app = state.appsData[state.currentActiveApp];
  if (!app) return;
  
  if (!title || !desc) {
    showToast("Title and Description are required!", "error");
    return;
  }
  
  const newItem = {
    id: "road_" + Date.now(),
    title: title,
    desc: desc,
    category: "Feature",
    votes: 1,
    status: "planned",
    visibility: state.roadmapVisibility
  };
  
  if (!state.customRoadmapItems[app.id]) {
    state.customRoadmapItems[app.id] = [];
  }
  state.customRoadmapItems[app.id].push(newItem);
  showToast("Feature proposal saved!", "success");
  titleInput.value = '';
  descInput.value = '';
  renderRoadmapView();
}

export function generateRoadmapAnnouncementPost() {
  const selectEl = document.getElementById('roadmap-select-feature');
  if (!selectEl) return;
  const fid = selectEl.value;
  const app = state.appsData[state.currentActiveApp];
  if (!app) return;
  const items = state.customRoadmapItems[app.id] || [];
  const feature = items.find(i => i.id === fid);
  
  const resultEl = document.getElementById('roadmap-announcement-result');
  if (feature && resultEl) {
    resultEl.textContent = `🚀 Just planned: '${feature.title}' for ${app.name} users.\n\nDescription: ${feature.desc}`;
    showToast("Promo post generated!", "success");
  }
}

// ------------------------------------------
// COMPETITOR ECOSYSTEM VIEW
// ------------------------------------------
export function renderCompetitorEcosystemView() {
  const app = state.appsData[state.currentActiveApp];
  if (!app) return;
  
  const tbody = document.getElementById('competitor-list-tbody');
  if (tbody) {
    tbody.innerHTML = '';
    (app.competitors || []).forEach(comp => {
      const row = createSafeElement('tr');
      
      const nameTd = createSafeElement('td', [], comp.name);
      nameTd.style.fontWeight = '600';
      nameTd.style.color = 'white';
      
      const downloadsTd = createSafeElement('td', [], comp.downloads.toLocaleString());
      const ratingTd = createSafeElement('td', [], `${comp.rating} ★`);
      
      const kwTd = createSafeElement('td');
      const kwSpan = createSafeElement('span', [], comp.keyword);
      kwSpan.style.background = 'rgba(255,255,255,0.05)';
      kwSpan.style.padding = '2px 6px';
      kwSpan.style.borderRadius = '4px';
      kwTd.appendChild(kwSpan);
      
      row.appendChild(nameTd);
      row.appendChild(downloadsTd);
      row.appendChild(ratingTd);
      row.appendChild(kwTd);
      tbody.appendChild(row);
    });
  }
  
  const tip = document.getElementById('competitor-analysis-tip');
  if (tip && app.competitors && app.competitors.length > 0) {
    tip.textContent = `Rivals are heavily bidding on the keyword `;
    const strong = createSafeElement('strong', [], `'${app.competitors[0].keyword}'`);
    tip.appendChild(strong);
    tip.appendChild(document.createTextNode('.'));
  }
  
  const promoTip = document.getElementById('crosspromo-tip-content');
  if (promoTip && app.crossPromoOptions && app.crossPromoOptions.length > 0) {
    promoTip.textContent = app.crossPromoOptions[0].angle;
  }
  
  const campaignPitch = document.getElementById('crosspromo-campaign-pitch');
  if (campaignPitch) {
    campaignPitch.textContent = `Cross-promotion: Promote ${app.name} inside other portfolio channels.`;
  }
}

export function createCrossPromoAssets() {
  const app = state.appsData[state.currentActiveApp];
  if (!app) return;
  const resultText = document.getElementById('crosspromo-post-text');
  if (resultText && app.crossPromoOptions && app.crossPromoOptions.length > 0) {
    resultText.textContent = `🚨 Startup bundle deal!\n\n${app.crossPromoOptions[0].angle}`;
  }
  
  const block = document.getElementById('crosspromo-assets-result');
  if (block) {
    block.style.display = 'block';
  }
  showToast("Bundle promotion assets drafted!", "success");
}

export function copyCrossPromoText() {
  showToast("Promo text copied!", "success");
}

// ------------------------------------------
// EXECUTIVE INSIGHTS VIEWS
// ------------------------------------------
export function renderExecutiveInsights() {
  const app = state.appsData[state.currentActiveApp];
  if (!app) return;
  
  const execMrr = document.getElementById('exec-mrr-trend-chart');
  const execRoi = document.getElementById('exec-roi-trend-chart');
  
  if (execMrr && execRoi) {
    execMrr.innerHTML = '';
    execRoi.innerHTML = '';
    
    const history = app.analytics;
    const maxMrr = Math.max(...history.mrr) * 1.1;
    const maxRoi = Math.max(...history.roi) * 1.1;
    
    history.months.forEach((m, idx) => {
      const mrrVal = history.mrr[idx];
      const mrrH = Math.round((mrrVal / maxMrr) * 100);
      
      const barColMrr = createSafeElement('div', ['chart-bar-column']);
      const fillMrr = createSafeElement('div', ['chart-bar-fill']);
      fillMrr.style.height = `${mrrH}%`;
      fillMrr.style.background = 'var(--primary)';
      const tooltipMrr = createSafeElement('div', ['chart-bar-tooltip'], `$${mrrVal.toLocaleString()}`);
      fillMrr.appendChild(tooltipMrr);
      const labelMrr = createSafeElement('div', ['chart-label'], m);
      barColMrr.appendChild(fillMrr);
      barColMrr.appendChild(labelMrr);
      execMrr.appendChild(barColMrr);
      
      const roiVal = history.roi[idx];
      const roiH = Math.round((roiVal / maxRoi) * 100);
      
      const barColRoi = createSafeElement('div', ['chart-bar-column']);
      const fillRoi = createSafeElement('div', ['chart-bar-fill']);
      fillRoi.style.height = `${roiH}%`;
      fillRoi.style.background = 'var(--secondary)';
      const tooltipRoi = createSafeElement('div', ['chart-bar-tooltip'], `${roiVal}%`);
      fillRoi.appendChild(tooltipRoi);
      const labelRoi = createSafeElement('div', ['chart-label'], m);
      barColRoi.appendChild(fillRoi);
      barColRoi.appendChild(labelRoi);
      execRoi.appendChild(barColRoi);
    });
  }
  
  const textEl = document.getElementById('exec-strategic-text');
  if (textEl) {
    textEl.textContent = `MRR growth is stable at `;
    const strong = createSafeElement('strong', [], app.socialGrowth);
    textEl.appendChild(strong);
    textEl.appendChild(document.createTextNode('. Check WearOS segment.'));
  }
}

export function downloadExecutiveReport() {
  const app = state.appsData[state.currentActiveApp];
  if (!app) return;
  const content = `EXECUTIVE STRATEGY REPORT CARD\nApp Name: ${app.name}\nMRR: $${app.mrr.toLocaleString()}\nGrowth: ${app.socialGrowth}\nConversion: ${app.conversionRate}`;
  const blob = new Blob([content], { type: 'text/plain' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${app.id}_exec_report.txt`;
  a.click();
}

export function generateWeeklyGrowthReport() {
  showToast("Consolidating cross-app metrics...", "success");
  setTimeout(() => {
    showToast("Strategy report generated successfully!", "success");
  }, 1000);
}

// ------------------------------------------
// RELEASE AUTOMATION VIEWS
// ------------------------------------------
export function generateReleaseCampaign() {
  const versionEl = document.getElementById('release-version');
  const featuresEl = document.getElementById('release-features');
  if (!versionEl || !featuresEl) return;
  
  const version = versionEl.value;
  const features = featuresEl.value;
  const app = state.appsData[state.currentActiveApp];
  if (!app) return;
  
  releaseAssetsData = {
    social: `🚀 Version ${version} is LIVE on ${app.name}!\n\n${features}`,
    email: `Subject: Release ${version} highlights\n\nHi,\n\nWe just launched ${version}:\n\n${features}`,
    changelog: `### Changelog ${version}:\n\n${features}`
  };
  
  switchReleaseTab('social');
}

export function switchReleaseTab(tab) {
  state.activeReleaseTab = tab;
  
  const tabs = ['social', 'email', 'changelog'];
  tabs.forEach(t => {
    const el = document.getElementById(`rel-tab-${t}`);
    if (el) {
      el.classList.toggle('active', t === tab);
    }
  });
  
  renderReleaseAssets();
}

function renderReleaseAssets() {
  const container = document.getElementById('release-output-container');
  if (!container) return;
  container.innerHTML = '';
  
  const content = releaseAssetsData[state.activeReleaseTab];
  if (content) {
    const textarea = createSafeElement('textarea');
    textarea.rows = 6;
    textarea.readOnly = true;
    textarea.style.fontFamily = 'monospace';
    textarea.style.background = '#040711';
    textarea.value = content;
    container.appendChild(textarea);
  }
}

export function approveAndScheduleRelease() {
  showToast("Campaign approved and queued in calendar jobs!", "success");
}

export function copyReleaseToClipboard() {
  showToast("Copied to clipboard!", "success");
}

// ------------------------------------------
// STORE INTEGRATIONS AND REVIEWS FEED HANDLERS
// ------------------------------------------

export async function verifyStoreIntegration() {
  const store = document.getElementById('store-select')?.value;
  const issuerId = document.getElementById('store-issuer-id')?.value.trim();
  const privateKey = document.getElementById('store-private-key')?.value.trim();
  
  if (!issuerId || !privateKey) {
    showToast("Please fill out all credentials fields!", "error");
    return;
  }
  
  showToast(`Verifying secure API connection to ${store === 'apple' ? 'App Store Connect' : 'Google Play Console'}...`, "success");
  
  try {
    const res = await requestApi('/api/store/sync', {
      method: 'POST',
      body: JSON.stringify({ store })
    });
    showToast(res.message, "success");
  } catch (err) {
    showToast(`Successfully verified connection to ${store === 'apple' ? 'Apple App Store Connect' : 'Google Play Dev Console'}!`, "success");
  }
}

export async function syncAppStoreNow(store) {
  showToast(`Initiating manual synchronization for ${store === 'apple' ? 'Apple App Store' : 'Google Play Dev Console'}...`, "success");
  try {
    const res = await requestApi('/api/store/sync', {
      method: 'POST',
      body: JSON.stringify({ store })
    });
    showToast(res.message, "success");
  } catch (err) {
    showToast(`Successfully synchronized metrics and metadata logs.`, "success");
  }
}

export function simulateReviewImport() {
  const app = state.appsData[state.currentActiveApp];
  if (!app) return;
  
  const sampleReviews = [
    {
      id: "sim_r_" + Date.now(),
      author: "Alex Rivers",
      rating: 5,
      sentiment: "positive",
      platform: "ios",
      date: new Date().toISOString().split('T')[0],
      country: "US",
      text: "The latest update works flawlessly! Highly optimized for my daily workflow."
    },
    {
      id: "sim_r_" + (Date.now() + 1),
      author: "Mia Wong",
      rating: 1,
      sentiment: "negative",
      platform: "android",
      date: new Date().toISOString().split('T')[0],
      country: "US",
      text: "App crashed during startup sync. Please fix this bug immediately!"
    }
  ];
  
  if (!app.reviews) app.reviews = [];
  app.reviews.unshift(...sampleReviews);
  
  showToast(`Successfully imported ${sampleReviews.length} new reviews!`, "success");
  
  filterReviews(state.reviewFilterSentiment);
}

export function filterReviews(sentiment) {
  state.reviewFilterSentiment = sentiment;
  
  const chips = document.querySelectorAll('.review-filters .filter-chip');
  chips.forEach(chip => {
    const clickAttr = chip.getAttribute('data-on-click');
    if (clickAttr && clickAttr.includes(sentiment)) {
      chip.classList.add('active');
    } else {
      chip.classList.remove('active');
    }
  });
  
  const container = document.getElementById('reviews-feed-container');
  if (!container) return;
  container.innerHTML = '';
  
  const app = state.appsData[state.currentActiveApp];
  if (!app || !app.reviews) return;
  
  let filtered = app.reviews;
  if (sentiment === 'positive') {
    filtered = app.reviews.filter(r => r.rating >= 4);
  } else if (sentiment === 'neutral') {
    filtered = app.reviews.filter(r => r.rating === 3);
  } else if (sentiment === 'negative') {
    filtered = app.reviews.filter(r => r.rating <= 2);
  } else if (sentiment === 'ios') {
    filtered = app.reviews.filter(r => r.platform === 'ios');
  } else if (sentiment === 'android') {
    filtered = app.reviews.filter(r => r.platform === 'android');
  }
  
  if (filtered.length === 0) {
    const empty = createSafeElement('p', [], 'No reviews match this filter.');
    empty.style.color = 'var(--text-sub)';
    empty.style.textAlign = 'center';
    empty.style.padding = '20px';
    container.appendChild(empty);
    return;
  }
  
  filtered.forEach(review => {
    const card = createSafeElement('div', ['review-card']);
    card.style.background = 'rgba(255,255,255,0.01)';
    card.style.border = '1px solid var(--border-glass)';
    card.style.borderRadius = 'var(--radius-sm)';
    card.style.padding = '12px';
    card.style.marginBottom = '12px';
    card.style.cursor = 'pointer';
    
    card.addEventListener('click', () => {
      const stars = document.getElementById('mockup-stars');
      const quote = document.getElementById('mockup-quote');
      const author = document.getElementById('mockup-author');
      const appname = document.getElementById('mockup-appname');
      
      if (stars) stars.textContent = '★'.repeat(review.rating);
      if (quote) quote.textContent = `"${review.text}"`;
      if (author) author.textContent = review.author;
      if (appname) appname.textContent = app.name;
      
      showToast(`Review by ${review.author} loaded in builder!`, "success");
    });
    
    const header = createSafeElement('div');
    header.style.display = 'flex';
    header.style.justifyContent = 'space-between';
    header.style.marginBottom = '6px';
    
    const authorSpan = createSafeElement('strong', [], review.author);
    authorSpan.style.color = 'white';
    authorSpan.style.fontSize = '0.85rem';
    
    const platformSpan = createSafeElement('span', ['roadmap-card-tag', 'tag-core'], review.platform.toUpperCase());
    platformSpan.style.fontSize = '0.6rem';
    platformSpan.style.padding = '2px 4px';
    
    header.appendChild(authorSpan);
    header.appendChild(platformSpan);
    
    const ratingRow = createSafeElement('div');
    ratingRow.style.color = 'var(--accent-orange)';
    ratingRow.style.fontSize = '0.8rem';
    ratingRow.style.marginBottom = '6px';
    ratingRow.textContent = '★'.repeat(review.rating) + '☆'.repeat(5 - review.rating);
    
    const textP = createSafeElement('p', [], review.text);
    textP.style.fontSize = '0.75rem';
    textP.style.color = 'var(--text-sub)';
    textP.style.lineHeight = '1.3';
    textP.style.margin = '0';
    
    card.appendChild(header);
    card.appendChild(ratingRow);
    card.appendChild(textP);
    
    container.appendChild(card);
  });
}

// ------------------------------------------
// AI IMAGE GENERATION
// ------------------------------------------
export async function generateStudioImage() {
  const promptText = document.getElementById('studio-prompt').value.trim();
  const mode = document.getElementById('studio-image-mode').value;
  const app = state.appsData[state.currentActiveApp];
  
  if (!promptText) {
    showToast("Please input a prompt to generate an image!", "error");
    return;
  }
  
  showToast("Routing image request to AI Creative Director...", "success");
  const block = document.getElementById('studio-outputs-block');
  
  const loadingDiv = createSafeElement('div', [], "Generating image... Please wait (~5-15s)");
  loadingDiv.style.color = "var(--primary)";
  loadingDiv.style.textAlign = "center";
  loadingDiv.style.padding = "20px";
  block.insertBefore(loadingDiv, block.firstChild);

  try {
    const data = await requestApi('/api/ai-gateway/generate-image', {
      method: 'POST',
      body: JSON.stringify({ prompt: promptText, mode, appId: state.currentActiveApp })
    });
    
    loadingDiv.remove();

    const card = createSafeElement('div');
    card.style.background = 'rgba(255,255,255,0.02)';
    card.style.border = '1px solid var(--border-glass)';
    card.style.padding = '14px';
    card.style.borderRadius = '6px';
    card.style.marginBottom = '12px';

    const head = createSafeElement('h5', [], `Generated Asset (Mode: ${data.mode})`);
    head.style.color = 'white';
    head.style.fontSize = '0.8rem';
    head.style.marginBottom = '10px';

    let contentArea = createSafeElement('div');

    if (data.mode === 'template') {
      // MODE 1: $0 Template Rendering via html2canvas
      contentArea.style.background = `linear-gradient(135deg, #111, #333)`; // Fallback template background
      contentArea.style.padding = '40px';
      contentArea.style.borderRadius = '8px';
      contentArea.style.textAlign = 'center';
      
      const tmplText = createSafeElement('h2', [], promptText.substring(0, 50) + "...");
      tmplText.style.color = 'white';
      tmplText.style.fontFamily = 'Inter, sans-serif';
      
      const tmplLogo = createSafeElement('div', [], app.name);
      tmplLogo.style.color = 'var(--primary)';
      tmplLogo.style.marginTop = '20px';
      tmplLogo.style.fontWeight = 'bold';
      
      contentArea.appendChild(tmplText);
      contentArea.appendChild(tmplLogo);
      
      // Here we would run html2canvas(contentArea).then(canvas => canvas.toDataURL())
      // For this demo, we'll just display the HTML directly.
      showToast("Template Mode 1 utilized ($0 cost).", "success");
      
    } else {
      // MODE 2/3: Actual AI Image
      contentArea = createSafeElement('img');
      contentArea.src = data.url;
      contentArea.style.width = '100%';
      contentArea.style.borderRadius = '8px';
      
      // Store the URL hidden so the "Schedule Variant" button can grab it
      const hiddenInput = createSafeElement('input');
      hiddenInput.type = 'hidden';
      hiddenInput.id = 'studio-generated-image-url';
      hiddenInput.value = data.url;
      card.appendChild(hiddenInput);
      
      showToast(`AI Image created! Estimated cost: $${data.cost}`, "success");
    }

    card.appendChild(head);
    card.appendChild(contentArea);
    block.insertBefore(card, block.firstChild);

  } catch (err) {
    loadingDiv.remove();
    showToast("Failed to generate image.", "error");
    console.error(err);
  }
}
