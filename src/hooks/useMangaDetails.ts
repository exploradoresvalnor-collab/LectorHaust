import { useState, useEffect, useRef, useCallback } from 'react';
import { mangaProvider } from '../services/mangaProvider';
import { useLibraryStore } from '../store/useLibraryStore';
import { mangapillService } from '../services/mangapillService';
import { anilistService } from '../services/anilistService';

// Helper to deduplicate chapters by chapter number (keeps the first occurrence)
export const deduplicateChapters = (chaptersArray: any[]) => {
  const seen = new Set();
  return (chaptersArray || []).filter(ch => {
    const chapterNum = ch.attributes?.chapter;
    if (chapterNum === null || chapterNum === undefined) return true;
    if (seen.has(chapterNum)) return false;
    seen.add(chapterNum);
    return true;
  });
};

// Zero-latency Memory Cache for Screen Transitions (Details <-> Reader)
const detailsMemoryCache = new Map<string, any>();

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
  const { showNSFW } = useLibraryStore();
  const [isOptimized, setIsOptimized] = useState(false);
  // Store the external ID if we had to fallback (for pagination)
  const externalFallbackId = useRef<string | null>(null);
  const isMounted = useRef(true);

  useEffect(() => {
    const fetchMangaDetails = async () => {
      if (!id) return;
      
      const cacheKey = `${id}_${chapterLang}_${chapterOrder}`;
      if (detailsMemoryCache.has(cacheKey)) {
        const c = detailsMemoryCache.get(cacheKey);
        if (isMounted.current) {
          setManga(c.manga);
          setAniData(c.aniData);
          setChapters(c.chapters);
          setTotalChapters(c.totalChapters);
          setTotalPages(c.totalPages);
          setHasMoreChapters(c.hasMoreChapters);
          setAvailableLangs(c.availableLangs);
          setMdStats(c.mdStats);
          setCurrentPage(c.currentPage);
          setLoading(false);
          setLoadingChapters(false);
        }
        return; // Zero latency UI restore
      }

      setLoading(true);
      externalFallbackId.current = null; // Reset fallback on each load

      // --- PROVIDER FETCH ---
      try {
        const data = await mangaProvider.getMangaDetails(id, showNSFW);
        
        if (!isMounted.current) return;

        if (!data || !data.data) {
          throw new Error('No pudimos encontrar este manga en la aventura.');
        }

        const mangaObj = data.data;
        setManga(mangaObj);
        
        const title = mangaObj.attributes?.title?.en || Object.values(mangaObj.attributes?.title || {})[0];
        
        // Non-essential parallel fetches
        Promise.all([
          mangaProvider.getMangaStatistics(id).then((stats: any) => {
            if (isMounted.current) setMdStats(stats);
          }).catch(() => {}),

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

          mangaProvider.getMangaChapters(id, null as any, 100).then((allChaptersData: any) => {
            if (isMounted.current && allChaptersData.data) {
              const langs = [...new Set(allChaptersData.data.map((c: any) => c.attributes?.translatedLanguage))] as string[];
              setAvailableLangs((prev: string[]) => prev.length > 0 ? prev : langs.filter((l: string) => !!l));
            }
          }).catch(() => {})
        ]);

        if (isMounted.current) {
          setCurrentPage(1);
          setHasMoreChapters(true);
        }
        
        // Essential: First page of chapters from primary provider
        let chaptersData = await mangaProvider.getMangaChapters(id, chapterLang, 20, 0, chapterOrder, showNSFW);
        
        // ────────────────────────────────────────────────────────
        // 🔄 HAUS INTELLIGENT FALLBACK: 
        //    If MangaDex has 0 chapters OR very few chapters
        //    compared to what's expected, search on MangaPill.
        // ────────────────────────────────────────────────────────
        const needsFallback = (!chaptersData.data || chaptersData.data.length === 0) || 
                             (chaptersData.total < 5 && mangaObj.attributes.status === 'completed');

        if (needsFallback && title && !mangaProvider.isExternalId(id)) {
          console.log(`[Details] MangaDex content seems restricted for "${title}". Trying Haus Intelligence...`);
          try {
            const bestSource = await mangaProvider.findBestExternalSource(mangaObj);
            if (bestSource) {
              const fullId = bestSource.id; 
              externalFallbackId.current = fullId;
              
              console.log(`[Details] Haus Optimized: Found accurate source on ${bestSource.source} (${fullId}).`);
              const extChaptersData = await mangaProvider.getMangaChapters(fullId);
              
              if (extChaptersData.data && extChaptersData.data.length > 0) {
                chaptersData = {
                  data: extChaptersData.data.map((c: any) => ({
                    id: c.id,
                    attributes: {
                      chapter: c.attributes.chapter,
                      title: c.attributes.title,
                      translatedLanguage: 'en'
                    }
                  })),
                  total: extChaptersData.total
                };

                if (isMounted.current) {
                  setAvailableLangs(['en']);
                  setIsOptimized(true);
                  console.log(`[Details] Haus Optimization Applied via ${bestSource.source}. ${extChaptersData.total} chapters loaded.`);
                }
              } else {
                console.warn(`[Details] Haus Intelligence found a match but it has 0 chapters on ${bestSource.source}.`);
              }
            } else {
              if (isMounted.current) setIsOptimized(false);
            }
          } catch (err) {
            console.warn('[Details] Haus Intelligence fallback failed:', err);
          }
        }

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

  // Save to Memory Cache whenever essential data stabilizes
  useEffect(() => {
    if (manga && chapters.length > 0 && id) {
      const cacheKey = `${id}_${chapterLang}_${chapterOrder}`;
      detailsMemoryCache.set(cacheKey, {
        manga, aniData, chapters, totalChapters, totalPages, 
        hasMoreChapters, availableLangs, mdStats, currentPage
      });
    }
  }, [manga, aniData, chapters, totalChapters, totalPages, hasMoreChapters, availableLangs, mdStats, currentPage, id, chapterLang, chapterOrder]);

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
      // Use external fallback ID if available, otherwise use the original ID
      const chapterId = externalFallbackId.current || id;
      
      let data: any;
      if (externalFallbackId.current) {
          const extChaptersData = await mangaProvider.getMangaChapters(chapterId);
          // Slice for pagination
          const slice = extChaptersData.data.slice(offset, offset + 20);
          data = {
              data: slice.map((c: any) => ({
                  id: c.id,
                  attributes: {
                    chapter: c.attributes.chapter,
                    title: c.attributes.title,
                    translatedLanguage: 'en'
                  }
              })),
              total: extChaptersData.total
          };
      } else {
          data = await mangaProvider.getMangaChapters(chapterId, chapterLang, 20, offset, chapterOrder, showNSFW);
      }
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
    isOptimized,
    setChapterOrder,
    handleLangChange,
    loadPage
  };
}

