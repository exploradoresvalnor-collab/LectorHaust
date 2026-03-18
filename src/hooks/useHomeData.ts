import { useState, useEffect, useRef, useCallback } from 'react';
import { User } from 'firebase/auth';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../services/firebase';
import { firebaseAuthService } from '../services/firebaseAuthService';
import { mangadexService } from '../services/mangadexService';
import { useLibraryStore } from '../store/useLibraryStore';
import { cacheService } from '../services/cacheService';

import { getDefaultLanguage } from '../utils/translations';

export function useHomeData() {
  const [heroMangas, setHeroMangas] = useState<any[]>([]);
  const [heroIndex, setHeroIndex] = useState(0);
  const [latest, setLatest] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [latestOffset, setLatestOffset] = useState(0);
  const [isDone, setIsDone] = useState(false);
  const [newChaptersCount, setNewChaptersCount] = useState(0);
  const [showNewBanner, setShowNewBanner] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [showLoginHint, setShowLoginHint] = useState(true);
  const [latestLang, setLatestLang] = useState(getDefaultLanguage());
  const [latestType, setLatestType] = useState('all');
  const [completedMasterpieces, setCompletedMasterpieces] = useState<any[]>([]);
  const [popularManga, setPopularManga] = useState<any[]>([]);
  const [featuredMasterpiece, setFeaturedMasterpiece] = useState<any | null>(null);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const showNSFW = useLibraryStore(state => state.showNSFW);

  const heroTimer = useRef<NodeJS.Timeout | null>(null);
  const pollTimer = useRef<NodeJS.Timeout | null>(null);
  const lastFetchRef = useRef<string | null>(null);
  const lastFetchTime = useRef<string>('');

  const fetchData = useCallback(async (force = false) => {
    const fetchKey = `${latestLang}_${latestType}_${showNSFW}`;
    if (!force && lastFetchRef.current === fetchKey) return;
    lastFetchRef.current = fetchKey;

    setLoading(true);
    setLatestOffset(0);
    setIsDone(false);
    setShowNewBanner(false);
    setNewChaptersCount(0);
    try {
      // 1. Fetch Latest first (Extremely fast, 1 request)
      const latestCacheKey = `cache_latest_${latestLang}_${latestType}_${showNSFW}`;
      let updatedMangas: any[] = [];
      const cachedLatest = cacheService.get<any[]>(latestCacheKey);

      if (cachedLatest && !force) {
        updatedMangas = cachedLatest;
      } else {
        const latestData = await mangadexService.getLatestUpdatedManga(12, 0, latestLang, latestType, showNSFW);
        updatedMangas = latestData.data || [];
        if (updatedMangas.length > 0) {
          // 5 minutes TTL (0.083 hours)
          cacheService.set(latestCacheKey, updatedMangas, 5 / 60); 
        }
      }
      
      setLatest(updatedMangas);
      setLatestOffset(12);

      // Track last update for polling
      if (updatedMangas.length > 0 && updatedMangas[0].attributes) {
        lastFetchTime.current = updatedMangas[0].attributes.updatedAt;
      }

      // SHOW CONTENT NOW
      setLoading(false);

      // 2. Fetch JP Masterpieces
      const jpCacheKey = `cache_mp_JP_${latestLang}_${showNSFW}`;
      const cachedJP = cacheService.get<any[]>(jpCacheKey);

      if (cachedJP && !force) {
        setCompletedMasterpieces(cachedJP);
        setHeroMangas(cachedJP.slice(0, 4));
        if (cachedJP.length > 0) setFeaturedMasterpiece(cachedJP[0]);
      } else {
        mangadexService.getFullyTranslatedMasterpieces('JP', latestLang, 4, 0, null, false, showNSFW)
          .then(jpMD => {
            const initialMasterpieces = jpMD.data || [];
            if (initialMasterpieces.length > 0) {
              cacheService.set(jpCacheKey, initialMasterpieces, 4); // 4 hours TTL
            }
            setCompletedMasterpieces(initialMasterpieces);
            setHeroMangas(initialMasterpieces.slice(0, 4));
            if (initialMasterpieces.length > 0) {
              setFeaturedMasterpiece(initialMasterpieces[0]);
            }
          })
          .catch(err => console.error('Error fetching JP masterpieces', err));
      }

      // 3. Fetch KR and CN in background to fill the diversity
      setTimeout(async () => {
        try {
          const krKey = `cache_mp_KR_${latestLang}_${showNSFW}`;
          const cnKey = `cache_mp_CN_${latestLang}_${showNSFW}`;
          let krData = cacheService.get<any[]>(krKey);
          let cnData = cacheService.get<any[]>(cnKey);

          if ((!krData || !cnData) || force) {
            const [krMD, cnMD] = await Promise.all([
              mangadexService.getFullyTranslatedMasterpieces('KR', latestLang, 4, 0, null, false, showNSFW),
              mangadexService.getFullyTranslatedMasterpieces('CN', latestLang, 4, 0, null, false, showNSFW)
            ]);
            krData = krMD.data || [];
            cnData = cnMD.data || [];
            cacheService.set(krKey, krData, 4);
            cacheService.set(cnKey, cnData, 4);
          }
          
          setCompletedMasterpieces(prev => {
            const combined = [];
            const max = Math.max(prev.length, krData!.length, cnData!.length);
            for (let i = 0; i < max; i++) {
              if (prev[i]) combined.push(prev[i]);
              if (krData![i]) combined.push(krData![i]);
              if (cnData![i]) combined.push(cnData![i]);
            }
            return combined;
          });

          // Update Hero if we need more variety
          if (krData!.length > 0 || cnData!.length > 0) {
            setHeroMangas(prev => {
              const more = [];
              const max = Math.max(prev.length, krData!.length, cnData!.length);
              for (let i = 0; i < max; i++) {
                if (prev[i]) more.push(prev[i]);
                if (krData![i]) more.push(krData![i]);
                if (cnData![i]) more.push(cnData![i]);
              }
              return more.slice(0, 4); // Limitadísimo a 4 Tendencias Supremas
            });
          }
        } catch (err) { }
      }, 100);

    } catch (error) {
      console.error('Error fetching home data:', error);
      setLoading(false);
    }
  }, [latestLang, latestType, showNSFW]);

  const loadMoreLatest = useCallback(async (e: any) => {
    try {
      const latestData = await mangadexService.getLatestUpdatedManga(12, latestOffset, latestLang, latestType, showNSFW);
      const data = latestData.data || [];
      if (data.length < 12) setIsDone(true);
      setLatest(prev => {
        const existingIds = new Set(prev.map((m: any) => m.id));
        const unique = data.filter((m: any) => !existingIds.has(m.id));
        return [...prev, ...unique];
      });
      setLatestOffset(prev => prev + 12);
    } catch (err) {
      console.error('Error loading more mangas:', err);
    }
    e.target.complete();
  }, [latestOffset, latestLang, latestType, showNSFW]);

  useEffect(() => {
    if (heroMangas.length <= 1) return;
    if (heroTimer.current) clearInterval(heroTimer.current);
    heroTimer.current = setInterval(() => {
      setHeroIndex(prev => (prev + 1) % heroMangas.length);
    }, 8000);
    return () => { if (heroTimer.current) clearInterval(heroTimer.current); };
  }, [heroMangas]);

  useEffect(() => {
    const timer = setInterval(async () => {
      try {
        const pollData = await mangadexService.getLatestChapters(5, 0, latestLang);
        const newOnes = pollData.data || [];
        
        if (newOnes.length > 0 && lastFetchTime.current) {
          const latestServerTime = new Date(newOnes[0].attributes.readableAt).getTime();
          const ourLastTime = new Date(lastFetchTime.current).getTime();
          
          if (latestServerTime > ourLastTime) {
            setNewChaptersCount(newOnes.length);
            setShowNewBanner(true);
          }
        }
      } catch (err) { }
    }, 300000); // Poll every 5 minutes (300k ms) instead of 2 minutes
    pollTimer.current = timer;
    return () => { if (pollTimer.current) clearInterval(pollTimer.current); };
  }, [latestLang]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchData(false);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [fetchData]);

  useEffect(() => {
    fetchData();
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
  }, [fetchData]);

  return {
    heroMangas,
    heroIndex,
    setHeroIndex,
    latest,
    loading,
    setLoading,
    isDone,
    newChaptersCount,
    showNewBanner,
    setShowNewBanner,
    currentUser,
    showLoginHint,
    setShowLoginHint,
    latestLang,
    setLatestLang,
    latestType,
    setLatestType,
    completedMasterpieces,
    popularManga,
    featuredMasterpiece,
    unreadNotifications,
    fetchData,
    loadMoreLatest
  };
}
