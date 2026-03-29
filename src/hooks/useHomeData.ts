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
import { jkanimeService } from '../services/jkanimeService';

export function useHomeData() {
  const queryClient = useQueryClient();
  const [heroIndex, setHeroIndex] = useState(0);
  const [newChaptersCount, setNewChaptersCount] = useState(0);
  const [showNewBanner, setShowNewBanner] = useState(false);
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
      if (!results || results.length === 0) {
        console.log('[Home] S-P failed or empty, falling back to S-C trends.');
        results = await jkanimeService.getTrendingAnime();
      }
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
    const buildHero = async () => {
      const items: any[] = [];
      
      // 1. Add top animes (fetch full info for descriptions)
      if (trendingAnime && trendingAnime.length > 0) {
        const topAnimes = trendingAnime.slice(0, 3);
        const detailedAnimes = await Promise.all(
          topAnimes.map(async (a: any) => {
            try {
              const full = await animeflvService.getAnimeInfo(a.id);
              return {
                ...a,
                description: full?.description || 'Sin descripción disponible.',
                status: full?.status || 'Serie',
                type: 'anime',
                badge: 'ANIME',
                link: `/anime/${a.id}`
              };
            } catch { return { ...a, type: 'anime', badge: 'ANIME', link: `/anime/${a.id}` }; }
          })
        );
        items.push(...detailedAnimes);
      }

      // 2. Add top mangas
      if (latest && latest.length > 0) {
        const topMangas = latest.slice(0, 4).map((m: any) => ({
          id: m.id,
          title: mangaProvider.getLocalizedTitle(m),
          description: mangaProvider.getLocalizedDescription(m),
          image: mangaProvider.getCoverUrl(m, 'original'),
          type: 'manga',
          badge: 'MANGA',
          status: m.attributes?.status === 'completed' ? 'Concluido' : 'Serie',
          link: `/manga/${m.id}`,
          raw: m
        }));
        items.push(...topMangas);
      }

      // 3. SPECIAL INJECTION: JoJo's Bizarre Adventure (User Request)
      // If none of the Jojos are in the hero list, let's try to add one specifically
      const hasJojo = items.some(it => it.title?.toLowerCase().includes('jojo'));
      if (!hasJojo) {
        // Fallback: This ID is for Stone Ocean in AnimeFLV as per search
        const jojoId = 'jojos-bizarre-adventure-stone-ocean';
        try {
          const jojo = await animeflvService.getAnimeInfo(jojoId);
          if (jojo) {
              items.unshift({
                ...jojo,
                type: 'anime',
                badge: 'LEGENDARIO',
                status: 'Finalizado',
                link: `/anime/${jojoId}`
              });
          }
        } catch { /* Fail silently */ }
      }

      // Shuffle or interleave? Let's interleave
      const finalItems = [];
      const animes = items.filter(it => it.type === 'anime');
      const mangas = items.filter(it => it.type === 'manga');
      const maxLength = Math.max(animes.length, mangas.length);
      
      for (let i = 0; i < maxLength; i++) {
        if (animes[i]) finalItems.push(animes[i]);
        if (mangas[i]) finalItems.push(mangas[i]);
      }

      setHeroItems(finalItems.slice(0, 8)); // Show 8 items for more variety
    };

    buildHero();
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

  // Polling for new chapters (Pro UX) — uses ref to avoid re-subscribing on data change
  const latestRef = useRef(latest);
  latestRef.current = latest;

  useEffect(() => {
    const timer = setInterval(async () => {
      try {
        const pollData = await mangaProvider.getLatestChapters(5, 0, latestLang, showNSFW);
        const newOnes = pollData.data || [];
        const currentLatest = latestRef.current;
        
        if (newOnes.length > 0 && currentLatest.length > 0) {
          const latestServerTime = new Date(newOnes[0].attributes.readableAt).getTime();
          const ourLastTime = new Date((currentLatest[0] as any).attributes.updatedAt).getTime();
          
          if (latestServerTime > ourLastTime) {
            setNewChaptersCount(newOnes.length);
            setShowNewBanner(true);
          }
        }
      } catch (err) { }
    }, 300000); 
    pollTimer.current = timer;
    return () => { if (pollTimer.current) clearInterval(pollTimer.current); };
  }, [latestLang]);

  // --- 4. PRELOAD ASSETS (Webtoon speed) ---
  useEffect(() => {
    if (heroMangas.length > 0 && heroIndex >= 0 && heroMangas[heroIndex]) {
      // PRO PRELOADER: Use the exact high-res URL that the UI will use
      const currentItem = heroMangas[heroIndex];
      const currentUrl = currentItem.image; // This is already 'original' for manga and high-res for anime

      if (currentUrl) {
        const img = new Image();
        img.src = currentUrl;
        console.log('[Performance] Preloading high-res hero asset:', { currentUrl, type: currentItem.type });
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
    newChaptersCount,
    showNewBanner,
    setShowNewBanner,
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
    unreadNotifications,
    fetchData,
    loadMoreLatest
  };
}
