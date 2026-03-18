import { useState, useEffect, useRef, useCallback } from 'react';
import { mangadexService } from '../services/mangadexService';
import { anilistService } from '../services/anilistService';

// Helper to deduplicate chapters by chapter number (keeps the first occurrence)
export const deduplicateChapters = (chaptersArray: any[]) => {
  const seen = new Set();
  return (chaptersArray || []).filter(ch => {
    const chapterNum = ch.attributes?.chapter;
    // If it has no chapter number (like a one-shot) or we haven't seen this number, keep it
    if (chapterNum === null || chapterNum === undefined) return true;
    if (seen.has(chapterNum)) return false;
    seen.add(chapterNum);
    return true;
  });
};

export function useMangaDetails(id?: string) {
  const [manga, setManga] = useState<any>(null);
  const [aniData, setAniData] = useState<any>(null);
  const [chapters, setChapters] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingChapters, setLoadingChapters] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalChapters, setTotalChapters] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [hasMoreChapters, setHasMoreChapters] = useState(true);
  const [chapterLang, setChapterLang] = useState('es');
  const [availableLangs, setAvailableLangs] = useState<string[]>([]);
  const [mdStats, setMdStats] = useState<{ rating: number | null, follows: number }>({ rating: null, follows: 0 });
  const [chapterOrder, setChapterOrder] = useState<'asc' | 'desc'>('desc');
  const isMounted = useRef(true);

  useEffect(() => {
    const fetchMangaDetails = async () => {
      if (!id) return;
      setLoading(true);

      // --- MANGADEX PATH ---
      try {
        const data = await mangadexService.getMangaDetails(id);
        
        if (!isMounted.current) return;

        if (!data || !data.data) {
          throw new Error('No pudimos encontrar este manga en la aventura.');
        }

        const mangaObj = data.data;
        setManga(mangaObj);
        
        // --- PARALLEL BLOCK FOR NON-CRITICAL INFO ---
        const title = mangaObj.attributes?.title?.en || Object.values(mangaObj.attributes?.title || {})[0];
        
        // Let non-essential data fetch in background without 'await' blocks
        Promise.all([
          // Statistics
          mangadexService.getMangaStatistics(id).then(stats => {
            if (isMounted.current) setMdStats(stats);
          }).catch(() => {}),

          // AniList Metadata
          (async () => {
            if (!title) return;
            try {
              const aniListResults = await anilistService.searchManga(title as string);
              if (isMounted.current && aniListResults && aniListResults.length > 0) {
                const detail = await anilistService.getMangaDetails(aniListResults[0].id);
                if (isMounted.current) setAniData(detail);
              }
            } catch (err) { console.warn('AniList fetch failed', err); }
          })(),

          // Available Languages (Limited to 100 for speed)
          mangadexService.getMangaChapters(id, null as any, 100).then(allChaptersData => {
            if (isMounted.current && allChaptersData.data) {
              const langs = [...new Set(allChaptersData.data.map((c: any) => c.attributes?.translatedLanguage))] as string[];
              setAvailableLangs(prev => prev.length > 0 ? prev : langs.filter(l => !!l));
            }
          }).catch(() => {})
        ]);

        if (isMounted.current) {
          setCurrentPage(1);
          setHasMoreChapters(true);
        }
        
        // Essential: First page of chapters
        const chaptersData = await mangadexService.getMangaChapters(id, chapterLang, 20, 0, chapterOrder);
        
        if (isMounted.current) {
          const newChapters = deduplicateChapters(chaptersData.data || []);
          setTotalChapters(chaptersData.total || 0);
          setTotalPages(Math.ceil((chaptersData.total || 0) / 20));
          setChapters(newChapters);
          setHasMoreChapters((chaptersData.data || []).length >= 20);
        }

      } catch (error: any) {
        console.error('Error fetching manga details:', error);
        if (isMounted.current) setManga(null);
      } finally {
        if (isMounted.current) {
          setLoading(false);
          setLoadingChapters(false);
        }
      }
    };

    isMounted.current = true;
    fetchMangaDetails();

    return () => {
      isMounted.current = false;
    };
  }, [id, chapterLang, chapterOrder]);

  const handleLangChange = useCallback((newLang: string) => {
    setChapterLang(newLang);
    setLoadingChapters(true);
    setCurrentPage(1);
    setHasMoreChapters(true);
  }, []);

  const loadPage = useCallback(async (pageIndex: number) => {
    if (!id || pageIndex < 1 || (totalPages > 0 && pageIndex > totalPages)) return;
    
    setLoadingChapters(true);
    try {
      const offset = (pageIndex - 1) * 20;
      const data = await mangadexService.getMangaChapters(id, chapterLang, 20, offset, chapterOrder);
      if (!isMounted.current) return;

      const rawNewChapters = data.data || [];
      setHasMoreChapters(pageIndex < totalPages);
      setChapters(deduplicateChapters(rawNewChapters));
      setCurrentPage(pageIndex);
      
      document.querySelector('.chapters-container')?.scrollIntoView({ behavior: 'smooth' });
    } catch (err) {
      console.error('Error loading chapters page:', err);
    } finally {
      if (isMounted.current) setLoadingChapters(false);
    }
  }, [id, chapterLang, chapterOrder, totalPages]);

  return {
    manga,
    aniData,
    chapters,
    loading,
    loadingChapters,
    currentPage,
    totalChapters,
    totalPages,
    hasMoreChapters,
    chapterLang,
    availableLangs,
    mdStats,
    chapterOrder,
    setChapterOrder,
    handleLangChange,
    loadPage
  };
}
