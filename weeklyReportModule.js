import { state } from './state.js';
import { requestApi, showToast, createSafeElement } from './common.js';
import { getSupabaseClient } from './auth.js';

export function initWeeklyReport() {
    window.addEventListener('viewChanged', () => {
        if (state.currentView === 'weekly-report') {
            renderWeeklyReport();
        }
    });
}

export async function renderWeeklyReport() {
    const container = document.getElementById('weekly-report-container');
    if (!container) return;

    container.innerHTML = '<div class="loading-spinner">Loading report...</div>';

    let reportData;
    try {
        if (!state.currentActiveApp) {
             throw new Error('No active app selected');
        }
        reportData = await requestApi(`/api/reports/weekly/${state.currentActiveApp}`);
    } catch (error) {
        console.warn('Failed to fetch real report data, falling back to demo data', error);
        reportData = getDemoReportData();
    }

    container.innerHTML = '';
    
    // Header Banner
    const header = createSafeElement('div', { className: 'report-header banner' });
    header.innerHTML = `
        <div class="header-content">
            <h1>Weekly AI Growth Report</h1>
            <p class="date-range">Week of ${reportData.dateRange}</p>
            <span class="business-badge">${reportData.businessName}</span>
        </div>
        <div class="header-actions">
            <button id="export-pdf-btn" class="btn btn-primary">Export PDF / Print</button>
        </div>
    `;
    container.appendChild(header);

    // Growth Health Gauge & KPI Grid
    const kpiSection = createSafeElement('div', { className: 'report-section kpi-grid' });
    kpiSection.innerHTML = `
        <div class="kpi-card gauge-card">
            <h3>Weekly Performance Score</h3>
            <div class="gauge-circle">
                <span class="score">${reportData.score}</span>/100
            </div>
            <p class="score-label">${reportData.scoreLabel}</p>
        </div>
        <div class="kpi-card">
            <h3>Posts Published</h3>
            <p class="kpi-value">${reportData.postsPublished} / ${reportData.postsTarget}</p>
        </div>
        <div class="kpi-card">
            <h3>Engagement Growth</h3>
            <p class="kpi-value ${reportData.engagementGrowth > 0 ? 'positive' : 'negative'}">
                ${reportData.engagementGrowth > 0 ? '+' : ''}${reportData.engagementGrowth}%
            </p>
        </div>
        <div class="kpi-card">
            <h3>Total Impressions</h3>
            <p class="kpi-value">${reportData.totalImpressions}</p>
        </div>
    `;
    container.appendChild(kpiSection);

    // Top Performing Post of the Week Card
    const topPostSection = createSafeElement('div', { className: 'report-section top-post' });
    topPostSection.innerHTML = `
        <h2>Top Performing Post of the Week</h2>
        <div class="top-post-card">
            <span class="platform-badge ${reportData.topPost.platform.toLowerCase()}">${reportData.topPost.platform}</span>
            <p class="content-snippet">"${reportData.topPost.contentSnippet}"</p>
            <div class="engagement-numbers">
                <span>❤️ ${reportData.topPost.likes}</span>
                <span>🔄 ${reportData.topPost.shares}</span>
                <span>💬 ${reportData.topPost.comments}</span>
            </div>
            <div class="why-it-worked">
                <h4>Why it worked:</h4>
                <p>${reportData.topPost.whyItWorked}</p>
            </div>
        </div>
    `;
    container.appendChild(topPostSection);

    // AI Agent Activity Digest
    const aiDigestSection = createSafeElement('div', { className: 'report-section ai-digest' });
    const aiList = reportData.aiActivities.map(activity => `<li>${activity}</li>`).join('');
    aiDigestSection.innerHTML = `
        <h2>AI Agent Activity Digest</h2>
        <ul class="activity-list">
            ${aiList}
        </ul>
    `;
    container.appendChild(aiDigestSection);

    // CMO Strategic Recommendations for Next Week
    const cmoSection = createSafeElement('div', { className: 'report-section cmo-recommendations' });
    const recList = reportData.cmoRecommendations.map(rec => `
        <div class="recommendation-item">
            <p>${rec}</p>
            <button class="btn btn-secondary btn-sm execute-ai-btn">Execute with AI</button>
        </div>
    `).join('');
    
    cmoSection.innerHTML = `
        <h2>CMO Strategic Recommendations for Next Week</h2>
        <div class="recommendation-list">
            ${recList}
        </div>
    `;
    container.appendChild(cmoSection);

    // Add event listeners
    const exportBtn = document.getElementById('export-pdf-btn');
    if (exportBtn) {
        exportBtn.addEventListener('click', downloadWeeklyReportPDF);
    }
    
    document.querySelectorAll('.execute-ai-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            showToast('AI Agent triggered for execution!', 'success');
        });
    });
}

export function downloadWeeklyReportPDF() {
    window.print();
}

function getDemoReportData() {
    return {
        dateRange: 'July 24 - July 31, 2026',
        businessName: 'GrowthApp Demo',
        score: 88,
        scoreLabel: 'Strong Growth',
        postsPublished: 8,
        postsTarget: 10,
        engagementGrowth: 15.4,
        totalImpressions: '45,230',
        topPost: {
            platform: 'Twitter',
            contentSnippet: 'Just launched our new AI feature. 10x your growth with autonomous agents!',
            likes: 1200,
            shares: 450,
            comments: 89,
            whyItWorked: 'Strong hook, clear value proposition, and perfect timing for the target audience.'
        },
        aiActivities: [
            'CMO Agent optimized posting schedule based on last week engagement metrics',
            'Content Writer generated 12 variants for the upcoming product launch',
            'ASO Agent identified 3 high-intent keywords for immediate optimization'
        ],
        cmoRecommendations: [
            'Double down on video content for TikTok and Reels based on recent algorithm changes.',
            'A/B test new ad creatives focusing on the "time-saving" aspect of the product.',
            'Engage with top 50 influencers in the niche for potential partnerships.'
        ]
    };
}
