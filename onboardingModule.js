import { state } from './state.js';
import { requestApi, showToast, openModal, closeModal, createSafeElement } from './common.js';
import { switchView } from './app.js';
import { getSupabaseClient } from './auth.js';

let isChecklistMinimized = false;

export function initOnboarding() {
    let widget = document.getElementById('onboarding-checklist-widget');
    if (!widget) {
        widget = document.createElement('div');
        widget.id = 'onboarding-checklist-widget';
        Object.assign(widget.style, {
            position: 'fixed',
            bottom: '24px',
            left: '24px',
            zIndex: '9999'
        });
        document.body.appendChild(widget);
    }
    
    document.addEventListener('appChanged', () => {
        renderChecklistWidget();
    });

    renderChecklistWidget();

    if (state.currentBusiness && state.currentBusiness.onboarding_completed === false) {
        openOnboardingWizard();
    }
}

export function renderChecklistWidget() {
    const widget = document.getElementById('onboarding-checklist-widget');
    if (!widget) return;
    
    if (state.currentBusiness?.onboarding_completed) {
        widget.style.display = 'none';
        return;
    }
    
    widget.style.display = 'block';

    const checklistStatus = {
        discovery: !!(state.currentBusiness && state.currentBusiness.discovery_completed),
        brandKit: !!(state.currentBusiness && state.currentBusiness.brand_kit_configured),
        social: !!(state.socialAccounts && state.socialAccounts.length > 0),
        post: !!(state.content && state.content.length > 0),
        agent: !!(state.agent_runs && state.agent_runs.length > 0)
    };

    const items = [
        { key: 'discovery', label: 'Complete Business Discovery', view: 'business-discovery-view' },
        { key: 'brandKit', label: 'Configure Brand Kit', view: 'brand-kit-view' },
        { key: 'social', label: 'Connect a Social Account', view: 'integrations-view' },
        { key: 'post', label: 'Generate & Schedule First Post', view: 'content-studio-view' },
        { key: 'agent', label: 'Run AI Agent Orchestration', view: 'command-center-view' }
    ];

    const completedCount = items.filter(i => checklistStatus[i.key]).length;
    const progress = Math.round((completedCount / items.length) * 100);

    widget.innerHTML = '';
    
    const container = document.createElement('div');
    Object.assign(container.style, {
        width: '280px',
        background: 'rgba(10, 14, 30, 0.95)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '14px',
        padding: '14px',
        color: '#fff',
        fontFamily: 'sans-serif',
        backdropFilter: 'blur(10px)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
        transition: 'height 0.3s ease'
    });
    
    const header = document.createElement('div');
    Object.assign(header.style, { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: isChecklistMinimized ? '0' : '10px' });
    
    const titleContainer = document.createElement('div');
    Object.assign(titleContainer.style, { display: 'flex', alignItems: 'center', gap: '8px' });
    
    const title = document.createElement('h3');
    title.textContent = '🚀 Setup Progress';
    Object.assign(title.style, { margin: '0', fontSize: '14px', fontWeight: 'bold' });
    
    const badge = document.createElement('span');
    badge.textContent = `${progress}%`;
    Object.assign(badge.style, { background: 'rgba(255,255,255,0.2)', padding: '2px 6px', borderRadius: '10px', fontSize: '10px' });
    
    titleContainer.appendChild(title);
    titleContainer.appendChild(badge);
    
    const toggleBtn = document.createElement('button');
    toggleBtn.textContent = isChecklistMinimized ? '+' : '–';
    Object.assign(toggleBtn.style, { background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '16px' });
    toggleBtn.onclick = () => {
        isChecklistMinimized = !isChecklistMinimized;
        renderChecklistWidget();
    };
    
    header.appendChild(titleContainer);
    header.appendChild(toggleBtn);
    container.appendChild(header);
    
    if (!isChecklistMinimized) {
        const progressBarContainer = document.createElement('div');
        Object.assign(progressBarContainer.style, { height: '6px', background: 'rgba(255, 255, 255, 0.1)', borderRadius: '3px', marginBottom: '12px', overflow: 'hidden' });
        
        const progressBarInner = document.createElement('div');
        Object.assign(progressBarInner.style, { width: `${progress}%`, height: '100%', background: 'linear-gradient(90deg, #3b82f6, #8b5cf6)', borderRadius: '3px', transition: 'width 0.3s ease' });
        progressBarContainer.appendChild(progressBarInner);
        
        container.appendChild(progressBarContainer);
        
        const list = document.createElement('ul');
        Object.assign(list.style, { listStyle: 'none', padding: '0', margin: '0', fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '8px' });
        
        items.forEach(item => {
            const li = document.createElement('li');
            const isCompleted = checklistStatus[item.key];
            Object.assign(li.style, { display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', opacity: isCompleted ? '0.5' : '1', textDecoration: isCompleted ? 'line-through' : 'none' });
            
            const icon = document.createElement('span');
            icon.textContent = isCompleted ? '✓' : '[ ]';
            Object.assign(icon.style, { color: isCompleted ? '#10b981' : '#ccc', minWidth: '16px' });
            
            const label = document.createElement('span');
            label.textContent = item.label;
            
            li.appendChild(icon);
            li.appendChild(label);
            li.onclick = () => {
                switchView(item.view);
            };
            
            list.appendChild(li);
        });
        
        container.appendChild(list);
    }
    
    widget.appendChild(container);
}

export function openOnboardingWizard() {
    const content = document.createElement('div');
    content.id = 'onboarding-wizard-modal';
    content.innerHTML = `
        <div style="padding: 24px; color: #fff; max-width: 500px;">
            <h2 id="wizard-title" style="margin-top: 0;">Welcome & Business Profile</h2>
            
            <div id="wizard-step-1" class="wizard-step">
                <p>Let's confirm your business profile.</p>
                <div style="margin-bottom: 12px;">
                    <label>Business Name:</label>
                    <input type="text" id="wizard-biz-name" class="form-input" style="width: 100%;" value="${state.currentBusiness?.name || ''}" />
                </div>
                <div style="margin-bottom: 12px;">
                    <label>Industry:</label>
                    <input type="text" id="wizard-biz-industry" class="form-input" style="width: 100%;" value="${state.currentBusiness?.industry || ''}" />
                </div>
                <button id="btn-next-1" class="btn btn-primary" style="margin-top: 10px;">Next: Brand Identity</button>
            </div>
            
            <div id="wizard-step-2" class="wizard-step" style="display: none;">
                <p>Pick your tone of voice and primary color.</p>
                <div style="margin-bottom: 12px;">
                    <label>Tone of Voice:</label>
                    <select id="wizard-tone" class="form-input" style="width: 100%;">
                        <option value="Professional">Professional</option>
                        <option value="Casual">Casual</option>
                        <option value="Funny">Funny</option>
                        <option value="Inspirational">Inspirational</option>
                    </select>
                </div>
                <div style="margin-bottom: 12px;">
                    <label>Primary Brand Color:</label>
                    <input type="color" id="wizard-color" class="form-input" value="#3b82f6" />
                </div>
                <button id="btn-next-2" class="btn btn-primary" style="margin-top: 10px;">Next: Connect Platforms</button>
            </div>
            
            <div id="wizard-step-3" class="wizard-step" style="display: none;">
                <p>Connect your social media accounts.</p>
                <button id="btn-connect-meta" class="btn" style="background: #1877f2; color: #fff; margin-bottom: 10px; width: 100%;">Connect Meta/Instagram</button>
                <button id="btn-next-3" class="btn btn-primary" style="margin-top: 10px;">Next: Instant Quick Win</button>
            </div>
            
            <div id="wizard-step-4" class="wizard-step" style="display: none;">
                <p>Get started immediately with some AI generated posts!</p>
                <button id="btn-generate-posts" class="btn btn-primary" style="width: 100%; font-size: 16px; padding: 12px;">✨ Generate 3 Instant Posts for This Week</button>
            </div>
            
            <div style="margin-top: 24px; display: flex; justify-content: space-between;">
                <button class="btn btn-secondary close-wizard-btn">Skip for now</button>
                <div id="wizard-dots" style="display: flex; gap: 4px; align-items: center;">
                    <div class="dot active" style="width: 8px; height: 8px; border-radius: 50%; background: #3b82f6;"></div>
                    <div class="dot" style="width: 8px; height: 8px; border-radius: 50%; background: #ccc;"></div>
                    <div class="dot" style="width: 8px; height: 8px; border-radius: 50%; background: #ccc;"></div>
                    <div class="dot" style="width: 8px; height: 8px; border-radius: 50%; background: #ccc;"></div>
                </div>
            </div>
        </div>
    `;

    openModal(content);
    
    let currentStep = 1;
    const showStep = (step) => {
        for (let i = 1; i <= 4; i++) {
            content.querySelector(`#wizard-step-${i}`).style.display = (i === step) ? 'block' : 'none';
        }
        const dots = content.querySelectorAll('.dot');
        dots.forEach((dot, index) => {
            dot.style.background = (index + 1 === step) ? '#3b82f6' : '#ccc';
        });
        const titles = ["Welcome & Business Profile", "Brand Identity", "Connect Platforms", "Instant Quick Win"];
        content.querySelector('#wizard-title').textContent = titles[step - 1];
    };

    content.querySelector('#btn-next-1').addEventListener('click', () => { currentStep = 2; showStep(2); });
    content.querySelector('#btn-next-2').addEventListener('click', () => { currentStep = 3; showStep(3); });
    content.querySelector('#btn-next-3').addEventListener('click', () => { currentStep = 4; showStep(4); });
    
    content.querySelector('#btn-connect-meta').addEventListener('click', () => {
        showToast('Redirecting to Meta connection...', 'info');
    });
    
    content.querySelector('#btn-generate-posts').addEventListener('click', async () => {
        showToast('Generating instant posts...', 'info');
        content.querySelector('#btn-generate-posts').disabled = true;
        try {
            const result = await requestApi('/api/ai/studio/generate', 'POST', {
                businessId: state.currentBusiness?.id,
                count: 3
            });
            if (result.success || result.posts) {
                showToast('Successfully generated 3 posts!', 'success');
                closeModal();
                switchView('content-studio-view');
            } else {
                throw new Error(result.error || 'Failed to generate');
            }
        } catch (err) {
            showToast('Error generating posts: ' + err.message, 'error');
            content.querySelector('#btn-generate-posts').disabled = false;
        }
    });

    content.querySelector('.close-wizard-btn').addEventListener('click', () => {
        closeModal();
    });
}
