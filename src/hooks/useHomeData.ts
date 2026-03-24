import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { User } from 'firebase/auth';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../services/firebase';
import { firebaseAuthService } from '../services/firebaseAuthService';
import { mangaProvider, MangaSource } from '../services/mangaProvider';
import { useLibraryStore } from '../store/useLibraryStore';
import { getDefaultLanguage } from '../utils/translations';
import { useQuery, useInfiniteQuery, useQueryClient } from '@tanstack/react-query';

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

  // --- 2. MASTERPIECES (JP/Hero prioritized) ---
  const { 
    data: masterpieces, 
    isLoading: loadingMasterpieces,
    refetch: refetchMasterpieces
  } = useQuery({
    queryKey: ['masterpieces', currentSource, latestLang, showNSFW],
    queryFn: async () => {
      // Faster fetch: Only JP masterpieces first (highest weight/quality)
      const jpMD = await mangaProvider.getFullyTranslatedMasterpieces('JP', latestLang, 8, 0, null, false, showNSFW);
      const jpData = jpMD.data || [];
      
      // We return JP immediately for Hero/Carousel. KR/CN can be fetched in a second pass or background if needed,
      // but to solve the 6s delay, we minimize the first critical query.
      return jpData;
    },
    staleTime: 1000 * 60 * 60 * 4, // 4 hours
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
      const currentCount = allPages.length * 15;
      return lastPage.data?.length === 15 ? currentCount : undefined;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes fresh
    enabled: !!masterpieces, // V.I.P Priority: Wait for masterpieces/hero assets before flooding the network with latest updates
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

  const heroMangas = useMemo(() => masterpieces?.slice(0, 5) || [], [masterpieces]);
  const featuredMasterpiece = useMemo(() => masterpieces?.[0] || null, [masterpieces]);
  const completedMasterpieces = useMemo(() => masterpieces || [], [masterpieces]);

  // Helpers
  const fetchData = useCallback(async (force = false) => {
    if (force) {
      await Promise.all([
        refetchLatest(),
        refetchMasterpieces()
      ]);
    }
  }, [refetchLatest, refetchMasterpieces]);

  const changeSource = useCallback((source: MangaSource) => {
    mangaProvider.setSource(source);
    setCurrentSource(source);
    queryClient.invalidateQueries({ queryKey: ['latest'] });
    queryClient.invalidateQueries({ queryKey: ['masterpieces'] });
  }, [queryClient]);

  const loadMoreLatest = useCallback(async (e: any) => {
    if (hasNextPage && !isFetchingNextPage) {
      await fetchNextPage();
    }
    e.target.complete();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  // Hero auto-scroll
  useEffect(() => {
    if (heroMangas.length <= 1) return;
    if (heroTimer.current) clearInterval(heroTimer.current);
    heroTimer.current = setInterval(() => {
      setHeroIndex(prev => (prev + 1) % heroMangas.length);
    }, 8000);
    return () => { if (heroTimer.current) clearInterval(heroTimer.current); };
  }, [heroMangas]);

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
    if (heroMangas.length > 0) {
      // Preload current hero (for Desktop rotation)
      const currentUrl = mangaProvider.getCoverUrl(heroMangas[heroIndex], '512');
      const img = new Image();
      img.src = currentUrl;

      // Preload the specific Mobile Hero (stable 8h rotation)
      const now = Date.now();
      const eightHoursInMs = 8 * 60 * 60 * 1000;
      const mIndex = Math.floor(now / eightHoursInMs) % Math.min(heroMangas.length, 5);
      const mobileUrl = mangaProvider.getCoverUrl(heroMangas[mIndex], '512');
      const img2 = new Image();
      img2.src = mobileUrl;
      
      console.log('[Performance] Preloading hero assets:', { currentUrl, mobileUrl });
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
    heroIndex,
    setHeroIndex,
    latest,
    loading: loadingLatest,
    loadingMasterpieces,
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
