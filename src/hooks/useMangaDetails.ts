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
  const [manga, setManga] = useState<any>(initialData || null);
  const [aniData, setAniData] = useState<any>(null);
  const [chapters, setChapters] = useState<any[]>([]);
  const [loading, setLoading] = useState(!initialData);
  const [loadingChapters, setLoadingChapters] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalChapters, setTotalChapters] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [hasMoreChapters, setHasMoreChapters] = useState(true);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [chapterLang, setChapterLang] = useState('es');
  const [availableLangs, setAvailableLangs] = useState<string[]>([]);
  const [mdStats, setMdStats] = useState<{ rating: number | null, follows: number }>({ rating: null, follows: 0 });
  const [chapterOrder, setChapterOrder] = useState<'asc' | 'desc'>('desc');
  const { showNSFW } = useLibraryStore();
  const [isOptimized, setIsOptimized] = useState(false);
  const [isTranslated, setIsTranslated] = useState(false);
  // Store the external ID if we had to fallback (for pagination)
  const externalFallbackId = useRef<string | null>(null);
  const isMounted = useRef(true);

  useEffect(() => {
    const fetchMangaDetails = async () => {
      if (!id) return;
      
      const cacheKey = `${id}_${chapterLang}_${chapterOrder}`;
      if (detailsMemoryCache.has(cacheKey)) {
        const c = detailsMemoryCache.get(cacheKey);
        if (c.manga && c.chapters && c.chapters.length > 0) {
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
          return;
        } else {
          detailsMemoryCache.delete(cacheKey);
          console.warn(`[Cache] Corrupted cache detected for ${cacheKey}, retrying...`);
        }
      }

      setLoading(true);
      externalFallbackId.current = null; // Reset fallback on each load

      // --- PROVIDER FETCH ---
      try {
        // Essential: Fetch MangaDex details and First Page of Chapters in parallel
        // If we have initialData, we only fetch chapters and extras.
        const [mdDetails, firstChapters] = await Promise.all([
          !initialData ? mangaProvider.getMangaDetails(id, showNSFW) : Promise.resolve({ data: initialData }),
          mangaProvider.getMangaChapters(id, chapterLang, 20, 0, chapterOrder, showNSFW)
        ]);
        
        if (!isMounted.current) return;

        const mangaObj = mdDetails.data;
        if (!mangaObj) throw new Error('Manga not found');
        
        // Translate description immediately
        const rawDesc = mangaProvider.getLocalizedDescription(mangaObj);
        const { text: translatedDesc, isTranslated: wasTr } = await translationService.translateToSpanish(rawDesc);
        
        if (isMounted.current) {
          setIsTranslated(wasTr);
          setManga({
            ...mangaObj,
            attributes: {
              ...mangaObj.attributes,
              translatedDescription: translatedDesc // Store specifically for UI
            }
          });
        }
        
        const title = mangaObj.attributes?.title?.en || Object.values(mangaObj.attributes?.title || {})[0];
        
        // Non-essential parallel fetches (with better error handling)
        Promise.all([
          mangaProvider.getMangaStatistics(id)
            .then((stats: any) => {
              if (isMounted.current) setMdStats(stats);
            })
            .catch((err: any) => {
              console.warn('[Stats] Failed to fetch manga statistics:', err.message || err);
            }),

          (async () => {
            if (!title) return;
            try {
              const aniListResults = await anilistService.searchManga(title as string);
              if (isMounted.current && aniListResults && aniListResults.length > 0) {
                const detail = await anilistService.getMangaDetails(aniListResults[0].id);
                if (isMounted.current) setAniData(detail);
              }
            } catch (err: any) {
              console.warn('[AniList] Failed to fetch AniList data:', err.message || err);
            }
          })(),

          mangaProvider.getMangaChapters(id, null as any, 100)
            .then((allChaptersData: any) => {
              if (isMounted.current && allChaptersData.data) {
                const langs = [...new Set(allChaptersData.data.map((c: any) => c.attributes?.translatedLanguage))] as string[];
                setAvailableLangs((prev: string[]) => prev.length > 0 ? prev : langs.filter((l: string) => !!l));
              }
            })
            .catch((err: any) => {
              console.warn('[Languages] Failed to fetch available languages:', err.message || err);
            })
        ]).catch((err: any) => {
          console.error('[NonEssential] Promise.all error:', err);
        });

        let chaptersData = firstChapters;
        
        // ────────────────────────────────────────────────────────
        // 🔄 HAUS INTELLIGENT FALLBACK (v2): 
        //    Step 1: If no chapters in user's language, check ALL languages on MangaDex first
        //    Step 2: Only go to external sources if MangaDex has 0 chapters globally
        // ────────────────────────────────────────────────────────
        const hasNoLocalChapters = !chaptersData.data || chaptersData.data.length === 0;
        const isManhwaOrManhua = mangaObj.attributes?.originalLanguage === 'ko' || mangaObj.attributes?.originalLanguage === 'zh';
        
        if (hasNoLocalChapters && !mangaProvider.isExternalId(id)) {
          console.log(`[Details] No chapters in "${chapterLang}" for "${title}". Checking MangaDex in ALL languages...`);
          
          // Step 1: Ask MangaDex for chapters in ANY language
          let allLangChapters: any = null;
          try {
            allLangChapters = await mangaProvider.getMangaChapters(id, null as any, 20, 0, chapterOrder, showNSFW);
          } catch (e) {
            console.warn('[Details] All-language check failed:', e);
          }

          const mdHasChaptersInOtherLangs = allLangChapters?.data && allLangChapters.data.length > 0;

          // ────────────────────────────────────────────────────────
          // 🔄 HAUS INTELLIGENT v3: For manhwas/manhuas, ALWAYS try 
          // external sources (ManhwaWeb has Spanish!) even if MangaDex 
          // has chapters in English. Spanish external > English MangaDex.
          // ────────────────────────────────────────────────────────
          let externalFound = false;

          if (isManhwaOrManhua && title && !mangaProvider.isExternalId(id)) {
            console.log(`[Details] 🇰🇷🇨🇳 Manhwa/Manhua detected: "${title}". Trying external Spanish sources FIRST...`);
            try {
              const candidates = await mangaProvider.findBestExternalSources(mangaObj);
              
              if (candidates && candidates.length > 0) {
                // Prioritize ManhwaWeb (Spanish) over other sources
                const sorted = [...candidates].sort((a, b) => {
                  if (a.source === 'manhwaweb' && b.source !== 'manhwaweb') return -1;
                  if (b.source === 'manhwaweb' && a.source !== 'manhwaweb') return 1;
                  return 0;
                });

                for (const bestSource of sorted) {
                  if (!isMounted.current) break;
                  const fullId = bestSource.id; 
                  console.log(`[Details] Testing candidate: ${bestSource.source} (${fullId})...`);
                  
                  try {
                    const extChaptersData = await mangaProvider.getMangaChapters(fullId);
                    
                    if (extChaptersData.data && extChaptersData.data.length > 0) {
                      externalFallbackId.current = fullId;
                      const isManhwaWeb = bestSource.source === 'manhwaweb';
                      const fallbackLang = isManhwaWeb ? 'es' : 'en';
                      
                      chaptersData = {
                        data: extChaptersData.data.map((c: any) => ({
                          id: c.id,
                          attributes: {
                            chapter: c.attributes.chapter,
                            title: c.attributes.title,
                            translatedLanguage: fallbackLang
                          }
                        })),
                        total: extChaptersData.total
                      };

                      if (isMounted.current) {
                        setAvailableLangs(prev => [...new Set([...prev, fallbackLang])]);
                        setIsOptimized(true);
                        setChapterLang(fallbackLang);
                        console.log(`[Details] ✅ Haus v3 Applied via ${bestSource.source} (${fallbackLang.toUpperCase()}). ${extChaptersData.total} chapters.`);
                      }
                      
                      externalFound = true;
                      break; // Stop at first valid source
                    }
                  } catch (chapErr) {
                    console.warn(`[Details] Candidate ${bestSource.source} failed chapter fetch:`, chapErr);
                  }
                }
              }
            } catch (err) {
              console.warn('[Details] Haus v3 manhwa external search failed:', err);
            }
          }

          // If external source worked, skip MangaDex fallback logic
          if (!externalFound) {
            if (mdHasChaptersInOtherLangs) {
              // MangaDex HAS chapters in other languages → use them as last resort
              console.log(`[Details] Using MangaDex (${allLangChapters.total} chapters in other languages).`);
              chaptersData = allLangChapters;
              
              if (isMounted.current) {
                const langCounts: Record<string, number> = {};
                allLangChapters.data.forEach((c: any) => {
                  const lang = c.attributes?.translatedLanguage || 'unknown';
                  langCounts[lang] = (langCounts[lang] || 0) + 1;
                });
                const bestLang = Object.entries(langCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'en';
                setChapterLang(bestLang);
                setIsOptimized(false);
              }
            } else {
              // ⚠️ AGGRESSIVE FALLBACK: Try external sources if MangaDex has <10 chapters
              const mdChapterCount = allLangChapters?.total || 0;
              const needsExternalFallback = title && (
                (!allLangChapters?.data || allLangChapters.data.length === 0) ||
                (mdChapterCount < 10 && mangaObj.attributes.status === 'completed') ||
                (mdChapterCount < 5)
              );

              if (needsExternalFallback) {
                console.log(`[Details] MangaDex has 0 chapters globally for "${title}". Trying Haus Intelligence...`);
                try {
                  const candidates = await mangaProvider.findBestExternalSources(mangaObj);
                  
                  if (candidates && candidates.length > 0) {
                    let foundValidSource = false;
                    
                    for (const bestSource of candidates) {
                      if (!isMounted.current) break;
                      const fullId = bestSource.id; 
                      console.log(`[Details] Testing candidate: ${bestSource.source} (${fullId})...`);
                      
                      try {
                        const extChaptersData = await mangaProvider.getMangaChapters(fullId);
                        
                        if (extChaptersData.data && extChaptersData.data.length > 0) {
                          externalFallbackId.current = fullId;
                          const isManhwaWeb = bestSource.source === 'manhwaweb';
                          const fallbackLang = isManhwaWeb ? 'es' : 'en';
                          
                          chaptersData = {
                            data: extChaptersData.data.map((c: any) => ({
                              id: c.id,
                              attributes: {
                                chapter: c.attributes.chapter,
                                title: c.attributes.title,
                                translatedLanguage: fallbackLang
                              }
                            })),
                            total: extChaptersData.total
                          };

                          if (isMounted.current) {
                            setAvailableLangs([fallbackLang]);
                            setIsOptimized(true);
                            setChapterLang(fallbackLang);
                            console.log(`[Details] ✅ Haus Applied via ${bestSource.source} (${fallbackLang.toUpperCase()}). ${extChaptersData.total} chapters.`);
                          }
                          
                          foundValidSource = true;
                          break;
                        }
                      } catch (chapErr) {
                        console.warn(`[Details] Candidate ${bestSource.source} failed chapter fetch:`, chapErr);
                      }
                    }

                    if (!foundValidSource && isMounted.current) {
                      setIsOptimized(false);
                    }
                  } else {
                    if (isMounted.current) setIsOptimized(false);
                  }
                } catch (err) {
                  console.warn('[Details] Haus Intelligence fallback failed:', err);
                }
              }
            }
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

  const loadMoreChapters = useCallback(async (e?: any) => {
    if (!id || currentPage >= totalPages || isFetchingMore) {
      if (e) e.target.complete();
      return;
    }
    
    setIsFetchingMore(true);
    try {
      const nextPageIndex = currentPage + 1;
      const offset = (nextPageIndex - 1) * 20;
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
                    translatedLanguage: chapterLang
                  }
              })),
              total: extChaptersData.total
          };
      } else {
          data = await mangaProvider.getMangaChapters(chapterId, chapterLang, 20, offset, chapterOrder, showNSFW);
      }
      if (!isMounted.current) return;

      const rawNewChapters = data.data || [];
      setHasMoreChapters(nextPageIndex < totalPages);
      setChapters(prev => deduplicateChapters([...prev, ...rawNewChapters]));
      setCurrentPage(nextPageIndex);
      
    } catch (err) {
      console.error('Error loading more chapters:', err);
    } finally {
      if (isMounted.current) setIsFetchingMore(false);
      if (e) e.target.complete();
    }
  }, [id, chapterLang, chapterOrder, totalPages, currentPage, isFetchingMore, showNSFW]);

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
    loadMoreChapters
  };
}

