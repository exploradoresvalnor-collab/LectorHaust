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
  const [completedMasterpieces, setCompletedMasterpieces] = useState<any[]>([]);
  const [popularManga, setPopularManga] = useState<any[]>([]);
  const [featuredMasterpiece, setFeaturedMasterpiece] = useState<any | null>(null);
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  const heroTimer = useRef<NodeJS.Timeout | null>(null);
  const pollTimer = useRef<NodeJS.Timeout | null>(null);
  const lastFetchRef = useRef<string | null>(null);
  const lastFetchTime = useRef<string>('');

  // Auto-rotate hero every 8 seconds
  useEffect(() => {
    if (heroMangas.length <= 1) return;
    heroTimer.current = setInterval(() => {
      setHeroIndex(prev => (prev + 1) % heroMangas.length);
    }, 8000);
    return () => { if (heroTimer.current) clearInterval(heroTimer.current); };
  }, [heroMangas]);

  // Poll for new chapters based on selected language
  useEffect(() => {
    pollTimer.current = setInterval(async () => {
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
      } catch (err) {
        // Silent fail — don't break UX on poll error
      }
    }, 120000); // 2 minutes
    return () => { if (pollTimer.current) clearInterval(pollTimer.current); };
  }, [latestLang]);

  const fetchData = useCallback(async (force = false) => {
    const fetchKey = `${latestLang}`;
    if (!force && lastFetchRef.current === fetchKey) return;
    lastFetchRef.current = fetchKey;

    setLoading(true);
    setLatestOffset(0);
    setIsDone(false);
    setShowNewBanner(false);
    setNewChaptersCount(0);
    
    try {
      // Fetch a diverse pool of manga for the Hero (Manga, Manhwa, Manhua)
      const [mangaData, manhwaData, manhuaData] = await Promise.all([
        mangadexService.getPopularManga('ja', 'es', 5, 0),
        mangadexService.getPopularManga('ko', 'es', 5, 0),
        mangadexService.getPopularManga('zh', 'es', 5, 0)
      ]);

      const pool = [
        ...(mangaData.data || []),
        ...(manhwaData.data || []),
        ...(manhuaData.data || [])
      ];

      // Shuffle logic to ensure variety on every load
      const seen = new Set<string>();
      const shuffledHero = pool
        .filter(m => { if (seen.has(m.id)) return false; seen.add(m.id); return true; })
        .sort(() => Math.random() - 0.5)
        .slice(0, 6);

      setHeroMangas(shuffledHero);
      setHeroIndex(0);
      
      // Fetch latest updated mangas
      const latestData = await mangadexService.getLatestUpdatedManga(12, 0, latestLang);
      const updatedMangas = latestData.data || [];
      setLatest(updatedMangas);
      setLatestOffset(12);

      // Track last update for polling
      if (updatedMangas.length > 0) {
        lastFetchTime.current = updatedMangas[0].attributes.updatedAt;
      }

      // Fetch Popular Manga for Carousel
      const popularResponse = await mangadexService.getPopularManga('', 'es', 15, 0);
      setPopularManga(popularResponse.data || []);

      // Fetch a pool of diverse Masterpieces for promotion
      const masterpieces = await mangadexService.getFullyTranslatedMasterpieces(null, 'es', 15, 0);
      if (masterpieces.data && masterpieces.data.length > 0) {
        setCompletedMasterpieces(masterpieces.data);
        const pool = masterpieces.data;
        setFeaturedMasterpiece(pool[Math.floor(Math.random() * pool.length)]);
      }

    } catch (error) {
      console.error('Error fetching home data:', error);
    } finally {
      setLoading(false);
    }
  }, [latestLang]);

  const loadMoreLatest = useCallback(async (e: any) => {
    try {
      const latestData = await mangadexService.getLatestUpdatedManga(12, latestOffset, latestLang);
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
  }, [latestOffset, latestLang]);

  // Main data fetching & Firebase Auth subscription
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
    isDone,
    newChaptersCount,
    showNewBanner,
    setShowNewBanner,
    currentUser,
    showLoginHint,
    setShowLoginHint,
    latestLang,
    setLatestLang,
    completedMasterpieces,
    popularManga,
    featuredMasterpiece,
    unreadNotifications,
    fetchData,
    loadMoreLatest
  };
}
