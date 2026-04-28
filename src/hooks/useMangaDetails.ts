import { useState, useEffect, useRef, useCallback } from 'react';
import { mangaProvider } from '../services/mangaProvider';
import { useLibraryStore } from '../store/useLibraryStore';
import { mangapillService } from '../services/mangapillService';
import { anilistService } from '../services/anilistService';
import { translationService } from '../services/translationService';

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

// Zero-latency Memory Cache for Screen Transitions (Details <-> Reader)
const detailsMemoryCache = new Map<string, any>();

export function useMangaDetails(id?: string, initialData?: any) {
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
    manga: initialData || null,
    aniData: null,
    chapters: [],
    loading: !initialData,
    loadingChapters: true,
    currentPage: 1,
    totalChapters: 0,
    totalPages: 0,
    hasMoreChapters: true,
    availableLangs: [],
    mdStats: { rating: null, follows: 0 },
    chapterLang: 'es',
    chapterOrder: 'desc',
    isOptimized: false,
    isTranslated: false
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
      chapters: [] // Limpiar capítulos inmediatamente para evitar desync visual
    }));
  }, []);


  useEffect(() => {
    const fetchMangaDetails = async () => {
      if (!id) {
        console.warn(`[Details] No ID provided, skipping fetch`);
        return;
      }
      
      console.log(`[Details] 🔷 useEffect triggered for manga: ${id}, lang: ${chapterLang}`);
      
      const cacheKey = `${id}_${chapterLang}_${chapterOrder}`;
      if (detailsMemoryCache.has(cacheKey)) {
        const c = detailsMemoryCache.get(cacheKey);
        if (c.manga && c.chapters && c.chapters.length > 0) {
          if (isMounted.current) {
            setState(prev => ({
              ...prev,
              ...c,
              loading: false,
              loadingChapters: false
            }));
          }
          return;
        } else {
          detailsMemoryCache.delete(cacheKey);
          console.warn(`[Cache] Corrupted cache detected for ${cacheKey}, retrying...`);
        }
      }

      // Only set main loading to true if we don't have basic metadata yet
      if (!manga) {
        setState(prev => ({ ...prev, loading: true }));
      } else {
        // We have metadata, just show that chapters are loading
        setState(prev => ({ ...prev, loadingChapters: true }));
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
              externalFallbackId.current = 'mp:' + parts[1];
              console.log(`[Intelligence] 🔗 Stuck to mirror for pagination: ${externalFallbackId.current}`);
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
            if (!title) return;
            try {
              const aniListResults = await anilistService.searchManga(title as string);
              if (isMounted.current && aniListResults && aniListResults.length > 0) {
                const detail = await anilistService.getMangaDetails(aniListResults[0].id);
                if (isMounted.current) setState(prev => ({ ...prev, aniData: detail }));
              }
            } catch (err) {}
          })(),

          (async () => {
             const allLangs = await mangaProvider.getMangaChapters(id, null as any, 100);
             if (isMounted.current && allLangs.data) {
                const langs = [...new Set(allLangs.data.map((c: any) => c.attributes?.translatedLanguage))] as string[];
                setState(prev => ({ ...prev, availableLangs: langs.filter((l: string) => !!l) }));
             }
          })()
        ]);

      } catch (error: any) {
        console.error('[Details] ❌ Error fetching manga details:', error?.message || error);
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
    
    setIsFetchingMore(true);
    setState(prev => ({ ...prev, loadingChapters: true }));
    
    try {
      const offset = (page - 1) * 20;
      const chapterId = externalFallbackId.current || id;
      
      let data: any;
      if (externalFallbackId.current) {
          // If we are using a mirror, we might need the full list if the mirror doesn't support offset
          const extChaptersData = await mangaProvider.getMangaChapters(chapterId);
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

