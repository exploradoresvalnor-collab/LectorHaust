export type Language = 'es' | 'en' | 'pt-br' | 'fr' | 'it' | 'de' | 'ru' | 'tr' | 'vi' | 'th' | 'id';

export const translations = {
  tabs: {
    home: { es: 'Inicio', en: 'Home', 'pt-br': 'Início' },
    explore: { es: 'Explorar', en: 'Explore', 'pt-br': 'Explorar' },
    anime: { es: 'Anime', en: 'Anime', 'pt-br': 'Anime' },
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
    },
    languageChanged: {
      es: 'Lector Haus: Ahora en Español 🇪🇸',
      en: 'Lector Haus: Now in English 🇬🇧',
      'pt-br': 'Lector Haus: Agora em Português 🇧🇷'
    },
    guestMode: { es: 'MODO INVITADO', en: 'GUEST MODE', 'pt-br': 'MODO CONVIDADO' },
    loginHint: { es: 'Login para más funciones', en: 'Login for more features', 'pt-br': 'Faça login para mais recursos' },
    pullToRefresh: { es: 'Desliza para actualizar', en: 'Pull to refresh', 'pt-br': 'Deslize para atualizar' },
    refreshing: { es: 'Cargando novedades...', en: 'Loading new chapters...', 'pt-br': 'Carregando novidades...' },
    newChapters: { es: 'nuevos capítulos', en: 'new chapters', 'pt-br': 'novos capítulos' },
    refreshToRead: { es: 'Actualiza para leer lo último', en: 'Refresh to read the latest', 'pt-br': 'Atualize para ler o mais recente' },
    featured: { es: '🔥 DESTACADO', en: '🔥 FEATURED', 'pt-br': '🔥 DESTAQUE' },
    readNow: { es: 'Leer Ahora', en: 'Read Now', 'pt-br': 'Ler Agora' },
    explore: { es: 'Explorar', en: 'Explore', 'pt-br': 'Explorar' },
    recommended: { es: 'RECOMENDADO', en: 'RECOMMENDED', 'pt-br': 'RECOMENDADO' },
    read: { es: 'Leer', en: 'Read', 'pt-br': 'Ler' },
    finishedGems: { es: 'Joyas Finalizadas', en: 'Finished Gems', 'pt-br': 'Joias Finalizadas' },
    fullyTranslated: { es: 'Obras 100% traducidas', en: '100% translated works', 'pt-br': 'Obras 100% traduzidas' },
    completed: { es: 'Completo 🏆', en: 'Completed 🏆', 'pt-br': 'Completo 🏆' }
  },
  profile: {
    themesSoon: { es: 'Panel de Temas próximamente ✨', en: 'Themes Panel coming soon ✨', 'pt-br': 'Painel de Temas em breve ✨' },
    themesTitle: { es: 'Temas y Apariencia', en: 'Themes & Appearance', 'pt-br': 'Temas e Aparência' },
    themesDesc: { es: 'Personaliza tu experiencia de lectura', en: 'Customize your reading experience', 'pt-br': 'Personalize sua experiência de leitura' },
    languageBtn: { es: 'Idioma / Language', en: 'Language / Idioma', 'pt-br': 'Idioma / Language' },
    languageDesc: { es: 'Lector Haus global experience', en: 'Lector Haus global experience', 'pt-br': 'Lector Haus global experience' },
    securityPrompt: { es: 'Ajustes de Seguridad encriptados 🔐', en: 'Encrypted Security Settings 🔐', 'pt-br': 'Configurações de Segurança criptografadas 🔐' },
    securityTitle: { es: 'Seguridad y Privacidad', en: 'Security & Privacy', 'pt-br': 'Segurança e Privacidade' },
    securityDesc: { es: 'Gestiona tu cuenta y contraseñas', en: 'Manage your account and passwords', 'pt-br': 'Gerencie sua conta e senhas' }
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

