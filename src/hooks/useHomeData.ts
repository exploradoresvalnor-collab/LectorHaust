import { useState, useEffect, useRef, useCallback } from 'react';
import { User } from 'firebase/auth';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../services/firebase';
import { firebaseAuthService } from '../services/firebaseAuthService';
import { mangadexService } from '../services/mangadexService';
import { useLibraryStore } from '../store/useLibraryStore';

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
  const [latestLang, setLatestLang] = useState('es');
  const [latestType, setLatestType] = useState('all'); // NEW: type filter
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
      const latestData = await mangadexService.getLatestUpdatedManga(12, 0, latestLang, latestType, showNSFW);
      const updatedMangas = latestData.data || [];
      
      setLatest(updatedMangas);
      setLatestOffset(12);

      // Track last update for polling
      if (updatedMangas.length > 0) {
        lastFetchTime.current = updatedMangas[0].attributes.updatedAt;
      }

      // SHOW CONTENT NOW
      setLoading(false);

      // 2. Fetch JP Masterpieces in the background
      mangadexService.getFullyTranslatedMasterpieces('JP', 'es', 12, 0, null, false, showNSFW)
        .then(jpMD => {
          const initialMasterpieces = jpMD.data || [];
          setCompletedMasterpieces(initialMasterpieces);
          setHeroMangas(initialMasterpieces.slice(0, 8));
          if (initialMasterpieces.length > 0) {
            setFeaturedMasterpiece(initialMasterpieces[0]);
          }
        })
        .catch(err => console.error('Error fetching JP masterpieces', err));

      // 2. Fetch KR and CN in background to fill the diversity
      setTimeout(async () => {
        try {
          const [krMD, cnMD] = await Promise.all([
            mangadexService.getFullyTranslatedMasterpieces('KR', 'es', 12, 0, null, false, showNSFW),
            mangadexService.getFullyTranslatedMasterpieces('CN', 'es', 12, 0, null, false, showNSFW)
          ]);

          const krData = krMD.data || [];
          const cnData = cnMD.data || [];
          
          setCompletedMasterpieces(prev => {
            const combined = [];
            const max = Math.max(prev.length, krData.length, cnData.length);
            for (let i = 0; i < max; i++) {
              if (prev[i]) combined.push(prev[i]);
              if (krData[i]) combined.push(krData[i]);
              if (cnData[i]) combined.push(cnData[i]);
            }
            return combined;
          });

          // Update Hero if we need more variety
          if (krData.length > 0 || cnData.length > 0) {
            setHeroMangas(prev => {
              const more = [];
              const max = Math.max(prev.length, krData.length, cnData.length);
              for (let i = 0; i < max; i++) {
                if (prev[i]) more.push(prev[i]);
                if (krData[i]) more.push(krData[i]);
                if (cnData[i]) more.push(cnData[i]);
              }
              return more.slice(0, 15);
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
    }, 120000);
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
