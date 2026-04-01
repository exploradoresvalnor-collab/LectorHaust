import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { User } from 'firebase/auth';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../services/firebase';
import { firebaseAuthService } from '../services/firebaseAuthService';
import { mangaProvider, MangaSource } from '../services/mangaProvider';
import { useLibraryStore } from '../store/useLibraryStore';
import { getDefaultLanguage } from '../utils/translations';
import { useQuery, useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { animeflvService } from '../services/animeflvService';
import { translationService } from '../services/translationService';
import { anilistService } from '../services/anilistService';

export function useHomeData() {
  const queryClient = useQueryClient();
  const [heroIndex, setHeroIndex] = useState(0);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [showLoginHint, setShowLoginHint] = useState(true);
  const [latestLang, setLatestLang] = useState(getDefaultLanguage());
  const [latestType, setLatestType] = useState('all');
  const [currentSource, setCurrentSource] = useState<MangaSource>(mangaProvider.getSource());
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const showNSFW = useLibraryStore(state => state.showNSFW);

  const heroTimer = useRef<NodeJS.Timeout | null>(null);
  const pollTimer = useRef<NodeJS.Timeout | null>(null);

  // Sync language with storage (for reactive updates from Profile Page)
  useEffect(() => {
    const syncLang = () => {
      setLatestLang(getDefaultLanguage());
    };
    window.addEventListener('storage', syncLang);
    return () => window.removeEventListener('storage', syncLang);
  }, []);

  // --- 2. TRENDING ANIME (New for Pro Home) ---
  const {
    data: trendingAnime,
    isLoading: loadingAnime
  } = useQuery({
    queryKey: ['trendingAnime'],
    queryFn: async () => {
      let results = await animeflvService.getTrendingAnime();
      return results;
    },
    staleTime: 1000 * 60 * 60 * 6, // 6 hours
  });



  // --- 3. LATEST UPDATES (Staggered) ---
  const {
    data: latestData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: loadingLatest,
    refetch: refetchLatest
  } = useInfiniteQuery({
    queryKey: ['latest', currentSource, latestLang, latestType, showNSFW],
    queryFn: ({ pageParam = 0 }) => 
      mangaProvider.getLatestUpdatedManga(15, pageParam as number, latestLang, latestType, showNSFW),
    initialPageParam: 0,
    getNextPageParam: (lastPage: any, allPages: any[]) => {
      // The API fetches limit*4 chapters and deduplicates to ~limit manga.
      // So the offset must advance by limit*4 (60) per page to avoid re-fetching the same chapters.
      const chapterOffsetPerPage = 15 * 4; // 60 chapters per page
      const nextOffset = allPages.length * chapterOffsetPerPage;
      return lastPage.data?.length >= 10 ? nextOffset : undefined;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes fresh
    // PROFESSIONAL OPTIMIZATION: Parallel loading enabled. 
    // We no longer wait for masterpieces to avoid the "chained delay" effect.
    enabled: true, 
  });

  const latest = useMemo(() => {
    const raw = latestData?.pages.flatMap(page => page.data || []) || [];
    const seen = new Set();
    return raw.filter((m: any) => {
      if (seen.has(m.id)) return false;
      seen.add(m.id);
      return true;
    });
  }, [latestData]);

  // --- NEW: HERO MIXED DATA (Pro UX) ---
  const [heroItems, setHeroItems] = useState<any[]>([]);

  useEffect(() => {
    let mounted = true;

    const buildHero = async () => {
      let finalItems: any[] = [];
      const animes: any[] = [];
      const mangas: any[] = [];

      // 1. Añadir Animes Base (Instantáneo)
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

      // 2. Añadir Mangas Base (Instantáneo)
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

      // Hero items are now 100% data-driven from AnimeFLV trending + MangaDex latest.
      // No hardcoded injections — only real content appears in the hero carousel.

      // Interlear elementos
      const maxLength = Math.max(animes.length, mangas.length);
      for (let i = 0; i < maxLength; i++) {
        if (animes[i]) finalItems.push(animes[i]);
        if (mangas[i]) finalItems.push(mangas[i]);
      }
      
      finalItems = finalItems.slice(0, 8); // Mostrar 8 elementos

      if (mounted) {
        setHeroItems([...finalItems]);
      }

      // --- ENRIQUECIMIENTO ASÍNCRONO (NON-BLOCKING) ---
      // Realizamos 1 a 1 para evitar congelar el UI general
      for (const item of finalItems) {
        if (!mounted) break;
        
        try {
          let updatedItem = { ...item };
          
          if (item.type === 'anime') {
             if (item.id === 'jojo-no-kimyou-na-bouken-part-6-stone-ocean' && item.title === "JoJo's Bizarre Adventure") {
                 const jojo = await animeflvService.getAnimeInfo(item.id);
                 if (jojo) {
                     updatedItem = { ...updatedItem, ...jojo, title: jojo.title || updatedItem.title, image: jojo.image || updatedItem.image, description: jojo.description || updatedItem.description };
                 }
             } else {
                 const full = await animeflvService.getAnimeInfo(item.id);
                 if (full) {
                     updatedItem.description = full.description || updatedItem.description;
                     updatedItem.status = full.status || updatedItem.status;
                     updatedItem.image = full.image || updatedItem.image;
                 }
             }
             
             const { text: desc, isTranslated } = await translationService.translateToSpanish(updatedItem.description);
             updatedItem.description = desc;
             updatedItem.isTranslated = isTranslated;
             
          } else if (item.type === 'manga') {
             const { text: desc, isTranslated } = await translationService.translateToSpanish(updatedItem.description);
             updatedItem.description = desc;
             updatedItem.isTranslated = isTranslated;
             
             try {
                const cleanedTitle = anilistService.cleanTitle(updatedItem.title);
                let aniRes = await anilistService.searchManga(cleanedTitle);
                if (!aniRes || aniRes.length === 0) {
                  const shortTitle = cleanedTitle.split(' ').slice(0, 4).join(' ');
                  if (shortTitle.length > 3) aniRes = await anilistService.searchManga(shortTitle);
                }
                if (aniRes && aniRes.length > 0) {
                  const fullAni = await anilistService.getMangaDetails(aniRes[0].id);
                  const aniCover = fullAni?.coverImage?.extraLarge || fullAni?.coverImage?.large;
                  if (aniCover) updatedItem.image = mangaProvider.getCoverUrl(item.raw, 'original', aniCover);
                }
             } catch (e) { /* ignore anilist error */ }
          }

          if (mounted) {
             setHeroItems(prev => {
                const newItems = [...prev];
                const replaceIdx = newItems.findIndex(x => x.id === updatedItem.id);
                if (replaceIdx !== -1) newItems[replaceIdx] = updatedItem;
                return newItems;
             });
          }
        } catch (e) {
            console.warn(`[Hero] Error enriqueciendo fondo para ${item.id}`, e);
        }
      }
    };

    buildHero();
    return () => { mounted = false; };
  }, [latest, trendingAnime]);

  const heroMangas = heroItems; // Alias for compatibility
  const featuredMasterpiece = null;
  const completedMasterpieces = [] as any[];

  // Helpers
  const fetchData = useCallback(async (force = false) => {
    if (force) {
      await Promise.all([
        refetchLatest(),
        queryClient.invalidateQueries({ queryKey: ['trendingAnime'] }),
      ]);
    }
  }, [refetchLatest, queryClient]);

  const changeSource = useCallback((source: MangaSource) => {
    mangaProvider.setSource(source);
    setCurrentSource(source);
    queryClient.invalidateQueries({ queryKey: ['latest'] });
  }, [queryClient]);

  const loadMoreLatest = useCallback(async (e: any) => {
    if (hasNextPage && !isFetchingNextPage) {
      await fetchNextPage();
    }
    e.target.complete();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  // Hero stable rotation
  useEffect(() => {
    const calculateIndex = () => {
      if (heroItems.length === 0) return 0;
      const rotationInterval = 60 * 1000; // 1 minute per item
      return Math.floor(Date.now() / rotationInterval) % heroItems.length;
    };

    setHeroIndex(calculateIndex());
    if (heroTimer.current) clearInterval(heroTimer.current);
    heroTimer.current = setInterval(() => {
      setHeroIndex(calculateIndex());
    }, 60000); 
    return () => { if (heroTimer.current) clearInterval(heroTimer.current); };
  }, [heroItems]);

  // --- 4. PRELOAD ASSETS (Webtoon speed) ---
  useEffect(() => {
    if (heroMangas.length > 0 && heroIndex >= 0 && heroMangas[heroIndex]) {
      // PRO PRELOADER: Use the exact high-res URL that the UI will use
      const currentItem = heroMangas[heroIndex];
      const currentUrl = currentItem.image; // This is already 'original' for manga and high-res for anime

      if (currentUrl) {
        const img = new Image();
        img.src = currentUrl;
      }
    }
  }, [heroMangas, heroIndex]);

  // Firebase auth & notifications
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
        }, (error) => {
          console.warn('Firebase: Notification listener permission issue (ignoring)', error.message);
        });
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
    heroMangas,
    heroItems,
    heroIndex,
    setHeroIndex,
    trendingAnime: trendingAnime || [],
    loadingAnime,
    latest,
    loading: loadingLatest,
    loadingMasterpieces: false,
    setLoading: () => {}, // Compatibility
    isDone: !hasNextPage,
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
    completedMasterpieces,
    popularManga: [] as any[], // Handled by masterpieces/latest filter logic in UI
    featuredMasterpiece,
    fetchData,
    loadMoreLatest
  };
}
