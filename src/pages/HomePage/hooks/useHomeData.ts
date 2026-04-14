import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { User } from 'firebase/auth';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../../../services/firebase';
import { firebaseAuthService } from '../../../services/firebaseAuthService';
import { mangaProvider, MangaSource } from '../../../services/mangaProvider';
import { useLibraryStore } from '../../../store/useLibraryStore';
import { getDefaultLanguage } from '../../../utils/translations';
import { useQuery, useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { animeflvService } from '../../../services/animeflvService';
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

  const heroTimer = useRef<NodeJS.Timeout | null>(null);

  // Sync language with storage
  useEffect(() => {
    const syncLang = () => {
      setLatestLang(getDefaultLanguage());
    };
    window.addEventListener('storage', syncLang);
    return () => window.removeEventListener('storage', syncLang);
  }, []);

  // --- 2. TRENDING ANIME ---
  const {
    data: trendingAnime,
  } = useQuery({
    queryKey: ['trendingAnime'],
    queryFn: async () => {
      return await animeflvService.getTrendingAnime();
    },
    staleTime: 1000 * 60 * 60 * 6,
  });

  // --- 3. LATEST UPDATES ---
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
      const nextOffset = allPages.length * 15;
      return lastPage.data?.length >= 10 ? nextOffset : undefined;
    },
    staleTime: 1000 * 60 * 5,
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

  // --- HERO MIXED DATA ---
  const [heroItems, setHeroItems] = useState<any[]>([]);

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
      if (mounted) setHeroItems([...finalItems]);

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
    };
    buildHero();
    return () => { mounted = false; };
  }, [latest, trendingAnime]);

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
    if (e && e.target) e.target.complete();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

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
    loading: loadingLatest,
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
    fetchData,
    loadMoreLatest
  };
}
