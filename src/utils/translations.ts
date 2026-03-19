export type Language = 'es' | 'en' | 'pt-br' | 'fr' | 'it' | 'de' | 'ru' | 'tr' | 'vi' | 'th' | 'id';

export const translations = {
  tabs: {
    home: { es: 'Inicio', en: 'Home', 'pt-br': 'Início' },
    explore: { es: 'Explorar', en: 'Explore', 'pt-br': 'Explorar' },
    chat: { es: 'Comunidad', en: 'Community', 'pt-br': 'Comunidade' },
    library: { es: 'Biblioteca', en: 'Library', 'pt-br': 'Biblioteca' },
  },
  home: {
    latest: { es: 'Últimas Actualizaciones', en: 'Latest Updates', 'pt-br': 'Últimas Atualizações' },
    masterpieces: { es: 'Obras Maestras', en: 'Masterpieces', 'pt-br': 'Obras Primas' },
    trending: { es: 'Tendencias Hoy', en: 'Trending Today', 'pt-br': 'Tendências Hoje' },
    viewAll: { es: 'Ver Todo', en: 'View All', 'pt-br': 'Ver Tudo' },
    welcomeNotice: { 
      es: 'Bienvenido a LectorHaus', 
      en: 'Welcome to LectorHaus', 
      'pt-br': 'Bem-vindo ao LectorHaus' 
    },
    languageDetected: {
      es: 'Idioma detectado: Español',
      en: 'Detected language: English',
      'pt-br': 'Idioma detectado: Português'
    }
  },
  search: {
    placeholder: { es: '¿Qué quieres leer hoy?', en: 'What do you want to read today?', 'pt-br': 'O que você quer ler hoje?' },
    filter: { es: 'FILTRAR', en: 'FILTER', 'pt-br': 'FILTRAR' },
  },
  reader: {
    next: { es: 'Siguiente', en: 'Next', 'pt-br': 'Próximo' },
    prev: { es: 'Anterior', en: 'Previous', 'pt-br': 'Anterior' },
  }
};

export const getTranslation = (key: string, lang: Language): string => {
  const keys = key.split('.');
  let result: any = translations;
  for (const k of keys) {
    if (result[k]) result = result[k];
    else return key;
  }
  return result[lang] || result['en'] || key;
};

export const getDefaultLanguage = (): Language => {
  const browserLang = navigator.language.toLowerCase();
  const savedLang = localStorage.getItem('user_lang') as Language;
  if (savedLang) return savedLang;

  if (browserLang.startsWith('es')) return 'es';
  if (browserLang.startsWith('pt')) return 'pt-br';
  return 'en';
};

