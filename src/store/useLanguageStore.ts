import { create } from 'zustand';
import { getDefaultLanguage, Language } from '../utils/translations';

interface LanguageState {
  lang: Language;
  setLang: (lang: Language) => void;
}

export const useLanguageStore = create<LanguageState>((set) => ({
  lang: getDefaultLanguage(),
  setLang: (lang) => {
    localStorage.setItem('user_lang', lang);
    // Dispatch event so other non-zustand listeners (like App.tsx toast) can react if needed
    window.dispatchEvent(new Event('storage'));
    set({ lang });
  },
}));

// Sync store if localStorage changes from another window/tab
if (typeof window !== 'undefined') {
  window.addEventListener('storage', () => {
    useLanguageStore.setState({ lang: getDefaultLanguage() });
  });
}
