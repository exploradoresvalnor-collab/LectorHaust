import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { User } from 'firebase/auth';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../../../services/firebase';
import { firebaseAuthService } from '../../../services/firebaseAuthService';
import { mangaProvider, MangaSource } from '../../../services/mangaProvider';
import { useLibraryStore } from '../../../store/useLibraryStore';
import { getDefaultLanguage } from '../../../utils/translations';
import { useQuery, useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { tioanimeService } from '../../../services/tioanimeService';
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
  
  // Control de carga escalonada para optimizar performance
  const [enableManhwaLoading, setEnableManhwaLoading] = useState(false);
  const [enableManhuaLoading, setEnableManhuaLoading] = useState(false);
  const [enableAnimeLoading, setEnableAnimeLoading] = useState(false);

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
    queryKey: ['popularMangaV3', currentSource, latestLang, showNSFW],
    queryFn: () => mangaProvider.getPopularManga('ja', latestLang, 6, 0, null, false, false, false),
    staleTime: 1000 * 60 * 30,
  });

  const {
    data: rawManhwa,
    isLoading: loadingManhwa,
    refetch: refetchManhwa
  } = useQuery({
    queryKey: ['popularManhwaV3', currentSource, latestLang, showNSFW],
    queryFn: () => mangaProvider.getPopularManga('ko', latestLang, 6, 0, null, false, false, true),
    staleTime: 1000 * 60 * 30,
    enabled: enableManhwaLoading,
  });

  const {
    data: rawManhua,
    isLoading: loadingManhua,
    refetch: refetchManhua
  } = useQuery({
    queryKey: ['popularManhuaV3', currentSource, latestLang, showNSFW],
    queryFn: () => mangaProvider.getPopularManga('zh', latestLang, 6, 0, null, false, false, true),
    staleTime: 1000 * 60 * 30,
    enabled: enableManhuaLoading,
  });

  // Chain loading triggers
  useEffect(() => {
    if (rawManga?.data && rawManga.data.length > 0) {
      // Si ya hay data (cache), activamos el siguiente bloque inmediatamente
      setEnableManhwaLoading(true);
    }
  }, [rawManga]);

  useEffect(() => {
    if (rawManhwa?.data && rawManhwa.data.length > 0) {
      setEnableManhuaLoading(true);
    }
  }, [rawManhwa]);



  const latestManga = useMemo(() => extractUnique(rawManga?.data || []), [rawManga]);
  const latestManhwa = useMemo(() => extractUnique(rawManhwa?.data || []), [rawManhwa]);
  const latestManhua = useMemo(() => extractUnique(rawManhua?.data || []), [rawManhua]);


  // --- 4. FEATURED MANGA (BERSERK) ---
  const { data: featuredBerserk } = useQuery({
    queryKey: ['featuredBerserk'],
    queryFn: () => mangaProvider.getMangaDetails('80d0af33-3bc7-400e-9004-1249b657492c'),
    staleTime: 1000 * 60 * 60 * 24, // 24 hours
  });


  const loadingLatest = loadingManga;

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
  const [enrichedHeroItems, setEnrichedHeroItems] = useState<any[]>([]);
  const [isHeroReady, setIsHeroReady] = useState(false);

  // 1. Synchronous build of basic items for instant display
  const heroItems = useMemo(() => {
    const final: any[] = [];

    // Prepend Featured Berserk if available
    if (featuredBerserk?.data) {
      const b = featuredBerserk.data;
      final.push({
        id: b.id,
        title: mangaProvider.getLocalizedTitle(b),
        description: mangaProvider.getLocalizedDescription(b) || 'La obra maestra de Kentaro Miura.',
        isTranslated: false,
        image: mangaProvider.getCoverUrl(b, 'original'),
        type: 'manga',
        badge: 'LEYENDA',
        status: 'En publicación',
        link: `/manga/${b.id}`,
        raw: b
      });
    }

    if (latest && latest.length > 0) {
      latest.slice(0, 5).forEach((m: any) => {
        // Avoid duplication if Berserk happens to be in latest (unlikely but safe)
        if (m.id === '80d0af33-3bc7-400e-9004-1249b657492c') return;

        final.push({
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
    
    return final.slice(0, 8);
  }, [latest, featuredBerserk]);

  // 2. Background Enrichment Effect
  useEffect(() => {
    let mounted = true;
    
    const enrich = async () => {
      if (heroItems.length === 0) {
        setIsHeroReady(false);
        return;
      }

      setIsHeroReady(true); // Base items are ready immediately

      // Parallel Enrichment
      Promise.all(heroItems.map(async (item) => {
        if (!mounted) return;
        try {
          let updatedItem = { ...item };
          // Background translation
          const { text: desc, isTranslated } = await translationService.translateToSpanish(updatedItem.description || '');
          updatedItem.description = desc;
          updatedItem.isTranslated = isTranslated;

          // AniList Enrichment
          try {
            const cleanedTitle = anilistService.cleanTitle(updatedItem.title);
            let aniRes = await anilistService.searchManga(cleanedTitle);
            if (aniRes && aniRes.length > 0) {
              const fullAni = await anilistService.getMangaDetails(aniRes[0].id);
              const aniCover = fullAni?.coverImage?.extraLarge || fullAni?.coverImage?.large;
              if (aniCover) updatedItem.image = mangaProvider.getCoverUrl(item.raw, 'original', aniCover);
            }
          } catch (e) {}

          if (mounted) {
            setEnrichedHeroItems(prev => {
              const newItems = prev.length === 0 ? [...heroItems] : [...prev];
              const idx = newItems.findIndex(x => x.id === updatedItem.id);
              if (idx !== -1) newItems[idx] = updatedItem;
              return newItems;
            });
          }
        } catch (e) {}
      }));
    };

    enrich();
    return () => { mounted = false; };
  }, [heroItems]);

  // Merge base items with enriched ones
  const displayHeroItems = useMemo(() => {
    if (enrichedHeroItems.length === 0) return heroItems;
    // Map enriched items back to the current order of heroItems
    return heroItems.map(base => {
      const enriched = enrichedHeroItems.find(e => e.id === base.id);
      return enriched || base;
    });
  }, [heroItems, enrichedHeroItems]);

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
    heroItems: displayHeroItems,
    heroIndex,
    setHeroIndex,
    latest,
    latestManga,
    latestManhwa,
    latestManhua,
    loading: loadingLatest,
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
    loadMoreLatest,
    isHeroReady
  };
}
