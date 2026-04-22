import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { User } from 'firebase/auth';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../../../services/firebase';
import { firebaseAuthService } from '../../../services/firebaseAuthService';
import { mangaProvider, MangaSource } from '../../../services/mangaProvider';
import { useLibraryStore } from '../../../store/useLibraryStore';
import { getDefaultLanguage } from '../../../utils/translations';
import { useQuery, useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { tioanimeService as animeflvService } from '../../../services/tioanimeService';
import { translationService } from '../../../services/translationService';
import { anilistService } from '../../../services/anilistService';

export function useHomeData() {
  const queryClient = useQueryClient();
  const [heroIndex, setHeroIndex] = useState(0);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [showLoginHint, setShowLoginHint] = useState(true);
  const [latestLang, setLatestLang] = useState<any>(getDefaultLanguage());
  const [latestType, setLatestType] = useState('all');
  const [currentSource, setCurrentSource] = useState<MangaSource>(mangaProvider.getSource());
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const showNSFW = useLibraryStore(state => state.showNSFW);
  
  // Carga paralela habilitada por defecto para máxima velocidad
  const [enableManhwaLoading, setEnableManhwaLoading] = useState(true);
  const [enableManhuaLoading, setEnableManhuaLoading] = useState(true);
  const [enableAnimeLoading, setEnableAnimeLoading] = useState(true);
  
  const HERO_CACHE_KEY = 'haus_manga_hero_cache';
  const LISTS_CACHE_KEY = 'haus_manga_lists_cache';
  const HERO_CACHE_TTL = 12 * 60 * 60 * 1000; // 12 hours

  const heroTimer = useRef<NodeJS.Timeout | null>(null);

  // Sync language with storage
  useEffect(() => {
    const syncLang = () => {
      setLatestLang(getDefaultLanguage());
    };
    window.addEventListener('storage', syncLang);
    return () => window.removeEventListener('storage', syncLang);
  }, []);

  // --- 2. TRENDING ANIME (DISABLED - Carga después en background) ---
  // Deshabilitado para mejorar performance: trendingAnime se cargará en background después
  const trendingAnime: any = null;

  // --- 3. LATEST UPDATES BY CATEGORY (SILOS) ---
  
  const extractUnique = (rawList: any[]) => {
    const seen = new Set();
    return rawList.filter((m: any) => {
      if (seen.has(m.id)) return false;
      seen.add(m.id);
      return true;
    });
  };

  const {
    data: rawManga,
    isLoading: loadingManga,
    refetch: refetchManga
  } = useQuery({
    queryKey: ['latestManga', currentSource, latestLang, showNSFW],
    queryFn: async () => {
      const res = await mangaProvider.getLatestUpdatedManga(6, 0, latestLang, 'manga', showNSFW);
      return res.data || [];
    },
    staleTime: 1000 * 60 * 5,
  });

  const {
    data: rawManhwa,
    isLoading: loadingManhwa,
    refetch: refetchManhwa
  } = useQuery({
    queryKey: ['latestManhwa', currentSource, latestLang, showNSFW],
    queryFn: async () => {
      const res = await mangaProvider.getLatestUpdatedManga(6, 0, latestLang, 'manhwa', showNSFW);
      return res.data || [];
    },
    staleTime: 1000 * 60 * 5,
    enabled: enableManhwaLoading, 
  });

  const {
    data: rawManhua,
    isLoading: loadingManhuaQuery,
    refetch: refetchManhua
  } = useQuery({
    queryKey: ['latestManhua', currentSource, latestLang, showNSFW],
    queryFn: async () => {
      const res = await mangaProvider.getLatestUpdatedManga(6, 0, latestLang, 'manhua', showNSFW);
      return res.data || [];
    },
    staleTime: 1000 * 60 * 5,
    enabled: enableManhuaLoading, 
  });

  // --- LÓGICA DE PERSISTENCIA PARA LISTAS ---
  const [cachedLists, setCachedLists] = useState<any>({ manga: [], manhwa: [], manhua: [] });

  useEffect(() => {
    const saved = localStorage.getItem(LISTS_CACHE_KEY);
    if (saved) {
      try {
        setCachedLists(JSON.parse(saved).data);
      } catch (e) {}
    }
  }, []);

  const latestManga = useMemo(() => extractUnique(rawManga || cachedLists.manga || []), [rawManga, cachedLists.manga]);
  const latestManhwa = useMemo(() => extractUnique(rawManhwa || cachedLists.manhwa || []), [rawManhwa, cachedLists.manhwa]);
  const latestManhua = useMemo(() => extractUnique(rawManhua || cachedLists.manhua || []), [rawManhua, cachedLists.manhua]);

  useEffect(() => {
    if (rawManga && rawManhwa && rawManhua) {
      localStorage.setItem(LISTS_CACHE_KEY, JSON.stringify({
        data: { manga: rawManga, manhwa: rawManhwa, manhua: rawManhua },
        timestamp: Date.now()
      }));
    }
  }, [rawManga, rawManhwa, rawManhua]);

  const loadingLatest = loadingManga || loadingManhwa || loadingManhuaQuery;

  // Interleave for Hero and Rankings to guarantee variety
  const latest = useMemo(() => {
    const mix = [];
    const maxLen = Math.max(latestManga.length, latestManhwa.length, latestManhua.length);
    for (let i = 0; i < maxLen; i++) {
        if (latestManga[i]) mix.push(latestManga[i]);
        if (latestManhwa[i]) mix.push(latestManhwa[i]);
        if (latestManhua[i]) mix.push(latestManhua[i]);
    }
    return mix;
  }, [latestManga, latestManhwa, latestManhua]);

  // --- HERO MIXED DATA ---
  const [heroItems, setHeroItems] = useState<any[]>([]);
  const [isHeroReady, setIsHeroReady] = useState(false);

  useEffect(() => {
    let mounted = true;
    const buildHero = async () => {
      let finalItems: any[] = [];
      const animes: any[] = [];
      const mangas: any[] = [];

      if (trendingAnime && trendingAnime.length > 0) {
        trendingAnime.slice(0, 3).forEach((a: any) => {
          animes.push({
            ...a,
            description: a.description || 'Cargando sinopsis...',
            isTranslated: false,
            status: a.status || 'Serie',
            type: 'anime',
            badge: 'ANIME',
            link: `/anime/${a.id}`
          });
        });
      }

      if (latest && latest.length > 0) {
        latest.slice(0, 4).forEach((m: any) => {
          mangas.push({
            id: m.id,
            title: mangaProvider.getLocalizedTitle(m),
            description: mangaProvider.getLocalizedDescription(m) || 'Cargando detalles...',
            isTranslated: false,
            image: mangaProvider.getCoverUrl(m, 'original'),
            type: 'manga',
            badge: 'MANGA',
            status: m.attributes?.status === 'completed' ? 'Concluido' : 'Serie',
            link: `/manga/${m.id}`,
            raw: m
          });
        });
      }

      const maxLength = Math.max(animes.length, mangas.length);
      for (let i = 0; i < maxLength; i++) {
        if (animes[i]) finalItems.push(animes[i]);
        if (mangas[i]) finalItems.push(mangas[i]);
      }
      
      finalItems = finalItems.slice(0, 8);
      if (mounted) {
         setHeroItems([...finalItems]);
         // Si ya tenemos items base, marcamos como ready para quitar el LoadingScreen
         if (finalItems.length > 0) setIsHeroReady(true);
      }

      // Parallel Enrichment of Hero Items
      await Promise.all(finalItems.map(async (item) => {
        if (!mounted) return;
        try {
          let updatedItem = { ...item };
          if (item.type === 'anime') {
             const full = await animeflvService.getAnimeInfo(item.id);
             if (full) {
                updatedItem.description = full.description || updatedItem.description;
                updatedItem.status = full.status || updatedItem.status;
                updatedItem.image = full.image || updatedItem.image;
                updatedItem.episodes = full.totalEpisodes;
             }
             const { text: desc, isTranslated } = await translationService.translateToSpanish(updatedItem.description || '');
             updatedItem.description = desc;
             updatedItem.isTranslated = isTranslated;
          } else if (item.type === 'manga') {
             const { text: desc, isTranslated } = await translationService.translateToSpanish(updatedItem.description || '');
             updatedItem.description = desc;
             updatedItem.isTranslated = isTranslated;
             try {
                const cleanedTitle = anilistService.cleanTitle(updatedItem.title);
                let aniRes = await anilistService.searchManga(cleanedTitle);
                if (aniRes && aniRes.length > 0) {
                  const fullAni = await anilistService.getMangaDetails(aniRes[0].id);
                  const aniCover = fullAni?.coverImage?.extraLarge || fullAni?.coverImage?.large;
                  if (aniCover) updatedItem.image = mangaProvider.getCoverUrl(item.raw, 'original', aniCover);
                }
             } catch (e) {}
          }
          if (mounted) {
             setHeroItems(prev => {
                const newItems = [...prev];
                const replaceIdx = newItems.findIndex(x => x.id === updatedItem.id);
                if (replaceIdx !== -1) newItems[replaceIdx] = updatedItem;
                return newItems;
             });
          }
        } catch (e) {}
      }));
      
      if (mounted) {
        setIsHeroReady(true);
        // Persistir en caché para evitar pantalla negra en el futuro
        try {
           localStorage.setItem(HERO_CACHE_KEY, JSON.stringify({
              data: finalItems,
              timestamp: Date.now()
           }));
        } catch(e) {}
      }
    };
    
    // Solo mostramos loading total si NO hay caché
    const cachedHero = localStorage.getItem(HERO_CACHE_KEY);
    if (cachedHero) {
       try {
          const { data, timestamp } = JSON.parse(cachedHero);
          if (Date.now() - timestamp < HERO_CACHE_TTL) {
             setHeroItems(data);
             setIsHeroReady(true);
          }
       } catch(e) {}
    } else {
       setIsHeroReady(false);
    }
    
    buildHero();
    return () => { mounted = false; };
  }, [latest, trendingAnime]);

  // Helpers
  const fetchData = useCallback(async (force = false) => {
    if (force) {
      await Promise.all([
        refetchManga(),
        refetchManhwa(),
        refetchManhua(),
        queryClient.invalidateQueries({ queryKey: ['trendingAnime'] }),
      ]);
    }
  }, [refetchManga, refetchManhwa, refetchManhua, queryClient]);

  const changeSource = useCallback((source: MangaSource) => {
    mangaProvider.setSource(source);
    setCurrentSource(source);
    queryClient.invalidateQueries({ queryKey: ['latestManga'] });
    queryClient.invalidateQueries({ queryKey: ['latestManhwa'] });
    queryClient.invalidateQueries({ queryKey: ['latestManhua'] });
  }, [queryClient]);

  const loadMoreLatest = useCallback(async (e: any) => {
    // Disabled in Home. Infinite scroll is delegated to /search
    if (e && e.target) e.target.complete();
  }, []);

  // Hero rotation
  useEffect(() => {
    const calculateIndex = () => {
      if (heroItems.length === 0) return 0;
      return Math.floor(Date.now() / 60000) % heroItems.length;
    };
    setHeroIndex(calculateIndex());
    const timer = setInterval(() => {
      setHeroIndex(calculateIndex());
    }, 60000); 
    return () => clearInterval(timer);
  }, [heroItems]);

  // Firebase auth
  useEffect(() => {
    let unsubsNotif: (() => void) | null = null;
    const unsubscribe = firebaseAuthService.subscribe((user: User | null) => {
      setCurrentUser(user);
      if (user) {
        useLibraryStore.getState().syncFromCloud(user.uid);
        if (unsubsNotif) unsubsNotif();
        const q = query(
          collection(db, 'notifications'),
          where('userId', '==', user.uid),
          where('read', '==', false)
        );
        unsubsNotif = onSnapshot(q, (snapshot) => {
          setUnreadNotifications(snapshot.size);
        }, (error) => {});
      } else {
        if (unsubsNotif) { unsubsNotif(); unsubsNotif = null; }
        setUnreadNotifications(0);
      }
    });
    return () => {
      unsubscribe();
      if (unsubsNotif) unsubsNotif();
    };
  }, []);

  return {
    heroItems,
    heroIndex,
    setHeroIndex,
    latest,
    latestManga,
    latestManhwa,
    latestManhua,
    loading: loadingLatest || !isHeroReady,
    isDone: true, // Infinite scroll disabled for Home
    unreadNotifications,
    currentUser,
    showLoginHint,
    setShowLoginHint,
    currentSource,
    changeSource,
    latestLang,
    setLatestLang,
    latestType,
    setLatestType,
    fetchData,
    loadMoreLatest
  };
}
