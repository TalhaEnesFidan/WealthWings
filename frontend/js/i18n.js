/**
 * WealthWings — Global i18n Çeviri Motoru
 */

const I18N_CACHE = {};
let currentLang = localStorage.getItem('ww_lang') || 'tr';

async function initTranslations() {
    await loadLanguage(currentLang);
    applyTranslations();
}

async function loadLanguage(lang) {
    if (I18N_CACHE[lang]) return I18N_CACHE[lang];
    try {
        const response = await fetch(`/js/i18n/${lang}.json`);
        if (!response.ok) throw new Error("Dil dosyası bulunamadı");
        const data = await response.json();
        I18N_CACHE[lang] = data;
        return data;
    } catch (err) {
        console.error("Çeviri yükleme hatası:", err);
        return {};
    }
}

function getNestedValue(obj, path) {
    return path.split('.').reduce((acc, part) => acc && acc[part], obj);
}

function applyTranslations() {
    const data = I18N_CACHE[currentLang];
    if (!data) return;

    // data-i18n attribute'u olan elementleri bul
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        const translation = getNestedValue(data, key);

        if (translation) {
            // Check if element has children (like the sidebar icons)
            if (el.children.length > 0 && el.querySelector('.nav-label')) {
                el.querySelector('.nav-label').textContent = translation;
            } else if (el.tagName === 'INPUT' && el.hasAttribute('placeholder')) {
                el.setAttribute('placeholder', translation);
            } else {
                el.textContent = translation;
            }
        }
    });
}

function t(key) {
    const data = I18N_CACHE[currentLang];
    if (!data) return key;
    return getNestedValue(data, key) || key;
}

async function setLanguage(lang) {
    currentLang = lang;
    localStorage.setItem('ww_lang', lang);
    await loadLanguage(lang);
    applyTranslations();
}

// Global olarak başlat
document.addEventListener('DOMContentLoaded', initTranslations);
