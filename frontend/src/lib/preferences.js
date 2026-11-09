// frontend/src/lib/preferences.js
// Preferencias de UI locales (tema, idioma, grupo activo).

const PREF_KEYS = {
  theme: 'entycollab_theme',
  langPref: 'entycollab_lang_pref',
  activeGroup: 'entycollab_active_group'
};

export function getActiveGroupId() {
  try {
    return localStorage.getItem(PREF_KEYS.activeGroup);
  } catch {
    return null;
  }
}

export function setActiveGroupId(groupId) {
  try {
    if (groupId) localStorage.setItem(PREF_KEYS.activeGroup, groupId);
    else localStorage.removeItem(PREF_KEYS.activeGroup);
  } catch {}
}

export function getTheme() {
  try {
    return localStorage.getItem(PREF_KEYS.theme) !== 'light';
  } catch {
    return true;
  }
}

export function setTheme(dark) {
  try {
    localStorage.setItem(PREF_KEYS.theme, dark ? 'dark' : 'light');
  } catch {}
}

export function getLang() {
  try {
    return localStorage.getItem(PREF_KEYS.langPref) === 'en' ? 'en' : 'es';
  } catch {
    return 'es';
  }
}

export function setLang(lang) {
  try {
    localStorage.setItem(PREF_KEYS.langPref, lang);
  } catch {}
}
