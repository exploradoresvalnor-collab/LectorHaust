import { useState, useEffect, useRef, useCallback } from 'react';
import { mangaProvider } from '../services/mangaProvider';
import { useLibraryStore } from '../store/useLibraryStore';
import { mangapillService } from '../services/mangapillService';
import { anilistService } from '../services/anilistService';
import { translationService } from '../services/translationService';
import { LRUCache } from '../utils/LRUCache';

// Helper to deduplicate chapters by chapter number with proper normalization
export const deduplicateChapters = (chaptersArray: any[]) => {
  const seen = new Map<string, any>();
  const normalizeChapterNum = (num: any) => {
    if (num === null || num === undefined) return 'SPECIAL_' + Math.random();
    const numStr = String(num).trim();
    const asFloat = parseFloat(numStr);
    return isNaN(asFloat) ? numStr : String(asFloat);
  };
  
  return (chaptersArray || []).filter(ch => {
    const chapterNum = ch.attributes?.chapter;
    const normalized = normalizeChapterNum(chapterNum);
    if (seen.has(normalized)) return false;
    seen.set(normalized, ch);
    return true;
  });
};

// Professional LRU Cache: bounded memory (max 30 manga), auto-expires after 10 min
const detailsCache = new LRUCache<string, any>(30, 10 * 60 * 1000);

export function useMangaDetails(id?: string, initialData?: any) {
  // Synchronous cache lookup to prevent loading flashes
  const defaultLang = 'es';
  const defaultOrder = 'desc';
  const cacheKey = id ? `${id}_${defaultLang}_${defaultOrder}` : '';
  const cached = cacheKey ? detailsCache.get(cacheKey) : null;

  const [state, setState] = useState<{
    manga: any | null;
    aniData: any | null;
    chapters: any[];
    loading: boolean;
    loadingChapters: boolean;
    currentPage: number;
    totalChapters: number;
    totalPages: number;
    hasMoreChapters: boolean;
    availableLangs: string[];
    mdStats: { rating: number | null, follows: number };
    chapterLang: string;
    chapterOrder: 'asc' | 'desc';
    isOptimized: boolean;
    isTranslated: boolean;
  }>({
    manga: cached?.manga || initialData || null,
    aniData: cached?.aniData || null,
    chapters: cached?.chapters || [],
    loading: !(cached?.manga || initialData),
    loadingChapters: !(cached?.chapters && cached.chapters.length > 0),
    currentPage: cached?.currentPage || 1,
    totalChapters: cached?.totalChapters || 0,
    totalPages: cached?.totalPages || 0,
    hasMoreChapters: cached?.hasMoreChapters ?? true,
    availableLangs: cached?.availableLangs || [],
    mdStats: cached?.mdStats || { rating: null, follows: 0 },
    chapterLang: defaultLang,
    chapterOrder: defaultOrder,
    isOptimized: cached?.isOptimized || false,
    isTranslated: cached?.isTranslated || false
  });

  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const { showNSFW } = useLibraryStore();
  const externalFallbackId = useRef<string | null>(null);
  const isMounted = useRef(true);

  // Destructure for internal use and return
  const { 
    manga, aniData, chapters, loading, loadingChapters, 
    currentPage, totalChapters, totalPages, hasMoreChapters, 
    chapterLang, availableLangs, mdStats, chapterOrder, 
    isOptimized, isTranslated 
  } = state;

  const setChapterOrder = useCallback((order: 'asc' | 'desc') => {
    setState(prev => ({ 
      ...prev, 
      chapterOrder: order, 
      loadingChapters: true,
      chapters: [] // Limpiar capÃ­tulos inmediatamente para evitar desync visual
    }));
  }, []);


  useEffect(() => {
    const fetchMangaDetails = async () => {
      if (!id) {
        console.warn(`[Details] No ID provided, skipping fetch`);
        return;
      }
      
      // === STALE-WHILE-REVALIDATE ===
      // If we have cached data, render it immediately but still refresh in background
      const cacheKey = `${id}_${chapterLang}_${chapterOrder}`;
      const staleData = detailsCache.getStale(cacheKey);
      const isFreshCache = detailsCache.has(cacheKey); // has() checks TTL
      
      if (staleData?.manga && staleData?.chapters?.length > 0) {
        if (isMounted.current) {
          setState(prev => ({
            ...prev,
            ...staleData,
            loading: false,
            loadingChapters: false
          }));
        }
        // If cache is still fresh (within TTL), skip network fetch entirely
        if (isFreshCache) return;
        // Otherwise, continue to background refresh (stale-while-revalidate)
      }

      // Only show loading UI if we have no data at all (cold start)
      if (!staleData?.manga && !manga) {
        setState(prev => ({ ...prev, loading: true }));
      }

      externalFallbackId.current = null; // Reset fallback on each load

      // GLOBAL TIMEOUT: Prevent infinite loading state
      const globalTimeoutMs = 12000; // 12 seconds (reduced from 20s for better UX)
      let globalTimeout: NodeJS.Timeout | null = null;
      
      const MAX_EXTERNAL_SEARCH_ATTEMPTS = 3;
      try {
        console.log(`[Details] START: Parallel fetch for manga ${id}`);
        
        // 1. Parallel fetch for Metadata and initial Chapters
        const [mdDetails, chaptersData] = await Promise.all([
          !initialData ? mangaProvider.getMangaDetails(id, showNSFW) : Promise.resolve({ data: initialData }),
          mangaProvider.getMangaChapters(id, chapterLang, 20, 0, chapterOrder, showNSFW)
        ]);

        if (!isMounted.current) return;

        const mangaObj = mdDetails.data;
        if (!mangaObj) throw new Error('Manga not found');
        
        // 2. Set initial state immediately with original description
        const rawDesc = mangaProvider.getLocalizedDescription(mangaObj);
        
        // --- MIRROR DETECTION ---
        // If the first page of chapters came from a mirror (e.g. MangaPill), 
        // we MUST stick to it for pagination, otherwise page 2+ would fall back to MangaDex.
        if (chaptersData.data && chaptersData.data.length > 0) {
          const firstChapter = chaptersData.data[0];
          if (firstChapter.id?.startsWith('mp:')) {
            const parts = firstChapter.id.split('@');
            if (parts.length > 1) {
              // The parts[1] already contains the prefixed mangaId (e.g. mp:...)
              externalFallbackId.current = parts[1];
              console.log(`[Intelligence] ðŸ”— Stuck to mirror for pagination: ${externalFallbackId.current}`);
            }
          }
        }

        if (isMounted.current) {
          setState(prev => ({
            ...prev,
            manga: {
              ...mangaObj,
              attributes: {
                ...mangaObj.attributes,
                translatedDescription: rawDesc
              }
            },
            totalChapters: chaptersData.total || 0,
            totalPages: Math.ceil((chaptersData.total || 0) / 20),
            chapters: deduplicateChapters(chaptersData.data || []),
            hasMoreChapters: (chaptersData.data || []).length >= 20,
            loadingChapters: false
          }));
        }

        // 3. Background tasks
        const title = mangaObj.attributes?.title?.en || Object.values(mangaObj.attributes?.title || {})[0];
        
        Promise.all([
          // Background Translation
          (async () => {
            try {
              const result = await translationService.translateToSpanish(rawDesc);
              if (isMounted.current && result.isTranslated) {
                setState(prev => ({
                  ...prev,
                  isTranslated: true,
                  manga: prev.manga ? {
                    ...prev.manga,
                    attributes: {
                      ...prev.manga.attributes,
                      translatedDescription: result.text
                    }
                  } : null
                }));
              }
            } catch (err) {}
          })(),

          mangaProvider.getMangaStatistics(id)
            .then((stats: any) => {
              if (isMounted.current) setState(prev => ({ ...prev, mdStats: stats }));
            })
            .catch(() => {}),

          (async () => {
             const allLangs = await mangaProvider.getMangaChapters(id, null as any, 100);
             if (isMounted.current && allLangs.data) {
                const langs = [...new Set(allLangs.data.map((c: any) => c.attributes?.translatedLanguage))] as string[];
                setState(prev => ({ ...prev, availableLangs: langs.filter((l: string) => !!l) }));
             }
          })()
        ]);

        // === AniList SEPARATE - doesn't block UI ===
        (async () => {
          if (!title || !isMounted.current) return;
          try {
            console.log('[Details] 🌐 AniList fetch in background');
            const aniListResults = await anilistService.searchManga(title as string);
            if (isMounted.current && aniListResults && aniListResults.length > 0) {
              const detail = await anilistService.getMangaDetails(aniListResults[0].id);
              if (isMounted.current) {
                console.log('[Details] ✅ AniList loaded');
                setState(prev => ({ ...prev, aniData: detail }));
              }
            }
          } catch (err: any) {
            console.warn('[Details] ⚠️ AniList failed (non-blocking):', err?.message);
          }
        })();

      } catch (error: any) {
        console.error('[Details] âŒ Error fetching manga details:', error?.message || error);
        if (isMounted.current) {
          setState(prev => ({ ...prev, manga: null }));
        }
      } finally {
        if (globalTimeout) clearTimeout(globalTimeout);
        if (isMounted.current) {
          setState(prev => ({
            ...prev,
            loading: false,
            loadingChapters: false
          }));
        }
      }
    };

    isMounted.current = true;
    fetchMangaDetails();

    return () => {
      isMounted.current = false;
    };
  }, [id, chapterLang, chapterOrder]);

  // Persist to LRU Cache whenever essential data stabilizes
  useEffect(() => {
    if (manga && chapters.length > 0 && id) {
      const cacheKey = `${id}_${chapterLang}_${chapterOrder}`;
      detailsCache.set(cacheKey, {
        manga, aniData, chapters, totalChapters, totalPages, 
        hasMoreChapters, availableLangs, mdStats, currentPage,
        isOptimized, isTranslated
      });
    }
  }, [manga, aniData, chapters, totalChapters, totalPages, hasMoreChapters, availableLangs, mdStats, currentPage, id, chapterLang, chapterOrder, isOptimized, isTranslated]);

  const handleLangChange = useCallback((newLang: string) => {
    setState(prev => ({
      ...prev,
      chapterLang: newLang,
      loadingChapters: true,
      currentPage: 1,
      hasMoreChapters: true
    }));
  }, []);


  const goToPage = useCallback(async (page: number) => {
    if (!id || page < 1 || page > totalPages || isFetchingMore) return;
    
    const offset = (page - 1) * 20;
    const chapterId = externalFallbackId.current || id;
    console.log(`[DEBUG: Details] goToPage: ${page} | Offset: ${offset} | TargetID: ${chapterId}`);
    
    setIsFetchingMore(true);
    setState(prev => ({ ...prev, loadingChapters: true }));
    
    try {
      let data: any;
      if (externalFallbackId.current) {
          // Fetch a large enough chunk to allow slicing (mirrors usually return all anyway)
          const extChaptersData = await mangaProvider.getMangaChapters(chapterId, chapterLang, 2000, 0, chapterOrder, showNSFW);
          const slice = extChaptersData.data.slice(offset, offset + 20);
          data = {
              data: slice.map((c: any) => ({
                  id: c.id,
                  attributes: {
                    chapter: c.attributes.chapter,
                    title: c.attributes.title,
                    translatedLanguage: chapterLang,
                    scanlation_group: c.attributes.scanlation_group
                  }
              })),
              total: extChaptersData.total
          };
      } else {
          data = await mangaProvider.getMangaChapters(chapterId, chapterLang, 20, offset, chapterOrder, showNSFW);
      }

      if (!isMounted.current) return;

      setState(prev => ({
        ...prev,
        chapters: deduplicateChapters(data.data || []),
        currentPage: page,
        hasMoreChapters: page < totalPages,
        loadingChapters: false
      }));
      
    } catch (err) {
      console.error('Error jumping to page:', err);
      setState(prev => ({ ...prev, loadingChapters: false }));
    } finally {
      if (isMounted.current) setIsFetchingMore(false);
    }
  }, [id, chapterLang, chapterOrder, totalPages, isFetchingMore, showNSFW]);

  const loadMoreChapters = useCallback(async (e?: any) => {
    if (currentPage >= totalPages) {
       if (e) e.target.complete();
       return;
    }
    await goToPage(currentPage + 1);
    if (e) e.target.complete();
  }, [currentPage, totalPages, goToPage]);

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
    isTranslated,
    isFetchingMore,
    setChapterOrder,
    handleLangChange,
    loadMoreChapters,
    goToPage
  };
}

