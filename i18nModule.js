import { state } from './state.js';

export function initI18n() {
  // Read saved preference or default to English
  const savedLang = localStorage.getItem('appLanguage') || 'en';
  state.language = savedLang;
  
  // Inject the translation engine script
  injectTranslationEngine();

  // Expose global toggle function for the button in index.html
  window.toggleLanguage = function() {
    const newLang = state.language === 'en' ? 'ar' : 'en';
    state.language = newLang;
    localStorage.setItem('appLanguage', newLang);
    
    // Trigger translation
    doTranslate(newLang);
    applyRTL(newLang);
    
    // Update toggle button text manually so it never gets locked
    const toggleBtn = document.querySelector('[data-on-click="toggleLanguage()"]');
    if (toggleBtn) {
      toggleBtn.innerHTML = newLang === 'ar' ? '<i class="fa fa-globe"></i> English / العربية' : '<i class="fa fa-globe"></i> العربية / English';
    }

    if (state.emit) state.emit('languageChanged');
  };
  
  // Apply initial language state
  setTimeout(() => {
    if (savedLang === 'ar') {
      doTranslate('ar');
      applyRTL('ar');
    }
  }, 1500); // give the engine time to initialize
}

function injectTranslationEngine() {
  const div = document.createElement('div');
  div.id = 'google_translate_element';
  div.style.display = 'none';
  document.body.appendChild(div);

  window.googleTranslateElementInit = function() {
    new window.google.translate.TranslateElement({
      pageLanguage: 'en',
      includedLanguages: 'ar,en',
      autoDisplay: false
    }, 'google_translate_element');
  };

  const script = document.createElement('script');
  script.src = "//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
  script.async = true;
  document.body.appendChild(script);

  // Add CSS to hide the Google Translate artifacts and fix body positioning
  const style = document.createElement('style');
  style.innerHTML = `
    .goog-te-banner-frame.skiptranslate { display: none !important; }
    iframe.skiptranslate { display: none !important; }
    body { top: 0px !important; position: static !important; }
    .goog-tooltip { display: none !important; }
    .goog-tooltip:hover { display: none !important; }
    .goog-text-highlight { background-color: transparent !important; border: none !important; box-shadow: none !important; }
    #goog-gt-tt, .goog-te-balloon-frame { display: none !important; }
    .goog-te-spinner-pos { display: none !important; }
    .VIpgJd-ZVi9od-aZ2wEe-wOHMyf, .VIpgJd-ZVi9od-aZ2wEe { display: none !important; }
  `;
  document.head.appendChild(style);
}

function doTranslate(lang) {
  const selectField = document.querySelector('select.goog-te-combo');
  if (selectField) {
    selectField.value = lang;
    selectField.dispatchEvent(new Event('change'));
  }
}

function applyRTL(lang) {
  document.documentElement.lang = lang;
  document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
  
  if (lang === 'ar') {
    // Add Arabic font for better aesthetics
    const link = document.createElement('link');
    link.href = 'https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap';
    link.rel = 'stylesheet';
    link.id = 'arabic-font';
    document.head.appendChild(link);
    document.body.style.fontFamily = "'Cairo', sans-serif";
  } else {
    document.body.style.fontFamily = "";
    const existingFont = document.getElementById('arabic-font');
    if (existingFont) existingFont.remove();
  }
}
