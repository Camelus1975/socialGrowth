import { state } from './state.js';

const TRANSLATIONS = {
  en: {
    "nav.launch_center": "Launch Command Center",
    "nav.image_studio": "AI Image Studio",
    "nav.video_factory": "AI Video Factory",
    "nav.autonomous_growth": "Autonomous Growth",
    "nav.aso_center": "ASO Optimization",
    "nav.app_store": "App Store Connect",
    "nav.inbox": "Social Inbox",
    "nav.calendar": "Content Calendar",
    "nav.growth_memory": "Growth Memory Engine",
    "nav.competitors": "Competitor Ecosystem",
    "nav.content_intelligence": "Content Intelligence",
    "header.toggle_lang": "English / العربية",
    "dashboard.select_app": "Select App Context",
    "dashboard.ai_cmo": "AI CMO Strategy Command",
    "dashboard.cmo_placeholder": "E.g., Launch our new invoicing feature. Generate posts in English and Arabic...",
    "dashboard.generate_strategy": "Generate Strategy",
    "autonomous.title": "Autonomous Growth Mode",
    "autonomous.desc": "Set a high-level objective and let the multi-agent system execute the entire funnel end-to-end.",
    "autonomous.objective": "What is your objective?",
    "autonomous.execute": "Execute Autonomous Pipeline",
    "video.title": "Video Assembly Line",
    "video.generate": "Generate Studio Video"
  },
  ar: {
    "nav.launch_center": "مركز أوامر الإطلاق",
    "nav.image_studio": "استوديو الصور بالذكاء الاصطناعي",
    "nav.video_factory": "مصنع الفيديو بالذكاء الاصطناعي",
    "nav.autonomous_growth": "النمو المستقل",
    "nav.aso_center": "تحسين متجر التطبيقات",
    "nav.app_store": "الاتصال بمتجر التطبيقات",
    "nav.inbox": "البريد الوارد الاجتماعي",
    "nav.calendar": "تقويم المحتوى",
    "nav.growth_memory": "محرك ذاكرة النمو",
    "nav.competitors": "نظام المنافسين البيئي",
    "nav.content_intelligence": "ذكاء المحتوى",
    "header.toggle_lang": "العربية / English",
    "dashboard.select_app": "اختر سياق التطبيق",
    "dashboard.ai_cmo": "أمر استراتيجية مدير التسويق الذكي",
    "dashboard.cmo_placeholder": "مثال: أطلق ميزة الفوترة الجديدة. قم بإنشاء المنشورات باللغتين الإنجليزية والعربية...",
    "dashboard.generate_strategy": "توليد الاستراتيجية",
    "autonomous.title": "وضع النمو المستقل",
    "autonomous.desc": "حدد هدفًا عالي المستوى ودع نظام الوكلاء المتعددين ينفذ المسار بأكمله من البداية للنهاية.",
    "autonomous.objective": "ما هو هدفك؟",
    "autonomous.execute": "تنفيذ المسار المستقل",
    "video.title": "خط تجميع الفيديو",
    "video.generate": "توليد فيديو استوديو"
  }
};

export function initI18n() {
  // Read saved preference or default to English
  const savedLang = localStorage.getItem('appLanguage') || 'en';
  state.language = savedLang;
  
  applyLanguage(savedLang);

  // Expose global toggle function for the button in index.html
  window.toggleLanguage = function() {
    const newLang = state.language === 'en' ? 'ar' : 'en';
    state.language = newLang;
    localStorage.setItem('appLanguage', newLang);
    applyLanguage(newLang);
    
    // Fire state event to re-render dynamic components if needed
    if (state.emit) state.emit('languageChanged');
  };
}

function applyLanguage(lang) {
  // Set document direction and language
  document.documentElement.lang = lang;
  document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';

  // Apply translations to all data-i18n elements
  const elements = document.querySelectorAll('[data-i18n]');
  elements.forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (TRANSLATIONS[lang] && TRANSLATIONS[lang][key]) {
      // If the element has children (like icons), we only want to replace the text node
      // For simplicity, if it's an input/textarea we replace placeholder
      if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
        el.placeholder = TRANSLATIONS[lang][key];
      } else {
        // If it contains an icon, preserve it
        const icon = el.querySelector('i, svg');
        if (icon) {
          el.innerHTML = '';
          el.appendChild(icon);
          el.appendChild(document.createTextNode(' ' + TRANSLATIONS[lang][key]));
        } else {
          el.textContent = TRANSLATIONS[lang][key];
        }
      }
    }
  });
}
