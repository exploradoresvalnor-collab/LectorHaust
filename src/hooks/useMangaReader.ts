import { useState, useEffect, useRef } from 'react';
import { mangaProvider } from '../services/mangaProvider';
import { useLibraryStore } from '../store/useLibraryStore';
import { useSettingsStore } from '../store/useSettingsStore';
import { auth } from '../services/firebase';
import { userStatsService } from '../services/userStatsService';
import { offlineService } from '../services/offlineService';
import { hapticsService } from '../services/hapticsService';
import { useQueryClient } from '@tanstack/react-query';

export function useMangaReader(chapterId?: string) {
  const [pages, setPages] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mangaId, setMangaId] = useState<string | null>(null);
  const [chapterNum, setChapterNum] = useState<string>('1');
  const [isOffline, setIsOffline] = useState(false);
  const [mangaTitle, setMangaTitle] = useState<string>('');
  const [mangaCover, setMangaCover] = useState<string>('');
  
  const [prevChapterId, setPrevChapterId] = useState<string | null>(null);
  const [nextChapterId, setNextChapterId] = useState<string | null>(null);
  const [isWebtoon, setIsWebtoon] = useState(false);
  
  const [currentMangaPage, setCurrentMangaPage] = useState(0);
  const [showUi, setShowUi] = useState(true);
  const [showEndSection, setShowEndSection] = useState(false);
  const [fitMode, setFitMode] = useState<'fitWidth' | 'fitScreen'>('fitScreen');
  
  // Estado para avisar a la UI que debe hacer scroll automáticamente al abrir Webtoon
  const [initialScrollPage, setInitialScrollPage] = useState<number | null>(null);
  
  const [retryCount, setRetryCount] = useState(0);

  const saveProgress = useLibraryStore(state => state.saveProgress);
  const markAsRead = useLibraryStore(state => state.markAsRead);
  const getProgress = useLibraryStore(state => state.getProgress);
  const { dataSaverMode, readingDirection, setReadingDirection } = useSettingsStore();
  
  const currentPageIndex = useRef(0);
  const lastLoadedId = useRef<string | null>(null);
  const queryClient = useQueryClient();

  // Guardar progreso al salir
  useEffect(() => {
    return () => {
      if (mangaId && chapterId) {
        saveProgress(mangaId, {
          chapterId: chapterId,
          chapterNumber: chapterNum,
          pageIndex: currentPageIndex.current + 1,
          lastRead: Date.now(),
          mangaTitle: mangaTitle || '',
          mangaCover: mangaCover || ''
        });
      }
    };
  }, [mangaId, chapterId, chapterNum, mangaTitle, mangaCover, saveProgress]);

  // Observer para modo Webtoon
  useEffect(() => {
    if (!mangaId || pages.length === 0 || !isWebtoon) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const pageIdx = parseInt(entry.target.getAttribute('data-index') || '0');
            currentPageIndex.current = pageIdx;
            setCurrentMangaPage(pageIdx);
          }
        });
      },
      { threshold: 0.5 }
    );

    const targetPages = document.querySelectorAll('.page-wrapper');
    targetPages.forEach((p) => observer.observe(p));

    return () => observer.disconnect();
  }, [mangaId, pages, isWebtoon]);

  // Sincronizar progreso en modo manga
  useEffect(() => {
    if (!isWebtoon) {
      currentPageIndex.current = currentMangaPage;
    }
  }, [currentMangaPage, isWebtoon]);

  // ============================================================
  // SENIOR ARCHITECTURE: Carga paralela con prioridad a páginas
  // ============================================================
  useEffect(() => {
    let isMounted = true;
    let globalFetchTimeout: NodeJS.Timeout | null = null;

    const fetchPages = async () => {
      if (!chapterId || (lastLoadedId.current === chapterId && retryCount === 0)) return;
      
      setLoading(true);
      setError(null);
      setCurrentMangaPage(0);
      setShowEndSection(false);
      setShowUi(true);
      
      // GLOBAL TIMEOUT: Prevent infinite loading state in reader
      const READER_TIMEOUT_MS = 25000;
      globalFetchTimeout = setTimeout(() => {
        if (isMounted) {
          console.error(`[Reader] CRITICAL: Global timeout (${READER_TIMEOUT_MS}ms) exceeded for chapter ${chapterId}`);
          setError('Tiempo de espera agotado. Intenta de nuevo.');
          setLoading(false);
        }
      }, READER_TIMEOUT_MS);
      
      try {
        lastLoadedId.current = chapterId;

        let pagesLoaded = false;
        let downloaded = false;
        let finalPagesCount = 0;

        // ── PASO 1: Offline check (rápido, 2s max) ──
        try {
          const timeout = new Promise<boolean>((_, reject) => 
            setTimeout(() => reject(new Error('Offline check timeout')), 2000)
          );

          downloaded = await Promise.race([
            offlineService.isDownloaded(chapterId),
            timeout
          ]).catch(() => false);
          
          if (downloaded) {
            const localPages = await offlineService.getLocalPages(chapterId).catch(() => []);
            if (localPages.length > 0 && isMounted) {
              setPages(localPages);
              finalPagesCount = localPages.length;
              setIsOffline(true);
              markAsRead(chapterId);
              pagesLoaded = true;
              // ★ LOADING OFF INMEDIATO — las páginas ya están disponibles
              setLoading(false);
              console.log(`[Reader] ✅ Loaded ${localPages.length} pages from LOCAL storage`);
            }
          }
        } catch (storageErr) {
          console.warn('[Reader] ⚠️ Offline storage access blocked or failed:', storageErr);
        }

        // Helper: timeout wrapper
        const withTimeout = <T = any>(promise: Promise<T>, ms = 12000): Promise<T> => 
          Promise.race([
            promise, 
            new Promise<T>((_, reject) => setTimeout(() => reject(new Error('Network timeout')), ms))
          ]);

        // ── PASO 2: Fetch PARALELO — Páginas + Metadatos al mismo tiempo ──
        if (!pagesLoaded) {
          console.log('[Reader] Fetching pages + metadata in PARALLEL...');
          
          // Lanzar AMBOS al mismo tiempo sin esperar uno por el otro
          const pagesPromise = withTimeout(
            mangaProvider.getChapterPages(chapterId, dataSaverMode ? 'data-saver' : 'data'),
            12000
          );
          const metaPromise = withTimeout(
            mangaProvider.getChapter(chapterId),
            8000
          ).catch(err => {
            console.warn('[Reader] Metadata fetch failed (non-fatal):', err.message);
            return null;
          });

          // Esperar las páginas primero (son lo que el usuario necesita VER)
          try {
            const data = await pagesPromise;
            
            if (!isMounted) return;
            if (data && data.pages && data.pages.length > 0) {
              setPages(data.pages);
              finalPagesCount = data.pages.length;
              markAsRead(chapterId);
              pagesLoaded = true;
              // ★ LOADING OFF — el usuario puede empezar a leer AHORA
              setLoading(false);
              if (globalFetchTimeout) { clearTimeout(globalFetchTimeout); globalFetchTimeout = null; }
              console.log(`[Reader] ✅ ${data.pages.length} pages ready — UI desbloqueada`);
              if (auth.currentUser) userStatsService.awardChapterXP(auth.currentUser.uid);
            } else {
              console.error('[Reader] ❌ getChapterPages returned empty:', data);
            }
          } catch (pagesErr) {
            console.warn('[Reader] ❌ Pages fetch failed:', pagesErr instanceof Error ? pagesErr.message : pagesErr);
          }

          // Ahora procesamos los metadatos (ya están en vuelo, probablemente ya terminaron)
          const chapterInfo = await metaPromise;
          
          if (chapterInfo && isMounted) {
            setChapterNum(chapterInfo.data?.attributes?.chapter || '1');
            
            const mangaRel = chapterInfo.data?.relationships?.find((r: any) => r.type === 'manga');
            if (mangaRel) {
              setMangaId(mangaRel.id);
              const format = mangaRel.attributes?.originalLanguage;
              const tags = mangaRel.attributes?.tags || [];
              const hasWebtoonTag = tags.some((t: any) => {
                const name = t.attributes?.name?.en?.toLowerCase() || '';
                return name === 'long-strip' || name === 'long strip' || name === 'webtoon' || name === 'manhwa';
              });
              
              const isKnownManhwaSource = chapterId.startsWith('mweb:') || chapterId.startsWith('wc:');
              const webtoonStatus = format === 'ko' || format === 'zh' || hasWebtoonTag || isKnownManhwaSource;
              
              setIsWebtoon(webtoonStatus);
              
              if (!webtoonStatus) {
                setReadingDirection(format === 'ja' ? 'rtl' : 'ltr');
              }
              if (webtoonStatus) {
                setFitMode('fitWidth');
              }

              // Restaurar progreso
              const savedProgress = getProgress(mangaRel.id);
              if (savedProgress && savedProgress.chapterId === chapterId && savedProgress.pageIndex > 1) {
                let targetPage = savedProgress.pageIndex - 1;
                if (targetPage >= finalPagesCount) targetPage = Math.max(0, finalPagesCount - 1);
                setCurrentMangaPage(targetPage);
                currentPageIndex.current = targetPage;
                if (webtoonStatus) {
                  setInitialScrollPage(targetPage);
                }
              }

              // ── PASO 3: Background tasks (fire-and-forget, NO bloquean UI) ──
              Promise.all([
                mangaProvider.getMangaById(mangaRel.id).then((mangaData: any) => {
                  if (mangaData?.data && isMounted) {
                    setMangaTitle(mangaProvider.getLocalizedTitle(mangaData.data) as string);
                    setMangaCover(mangaProvider.getCoverUrl(mangaData.data));
                  }
                }),
                mangaProvider.getMangaChapters(
                  mangaRel.id, 
                  chapterInfo.data.attributes.translatedLanguage || 'es',
                  500, 0
                ).then((chaptersData: any) => {
                  if (chaptersData.data && isMounted) {
                    const sorted = chaptersData.data
                      .filter((c: any) => c.attributes.chapter)
                      .sort((a: any, b: any) => parseFloat(a.attributes.chapter) - parseFloat(b.attributes.chapter));
                    
                    const currentIdx = sorted.findIndex((c: any) => c.id === chapterId);
                    setPrevChapterId(currentIdx > 0 ? sorted[currentIdx - 1].id : null);
                    setNextChapterId(currentIdx < sorted.length - 1 ? sorted[currentIdx + 1].id : null);
                  }
                })
              ]).catch(err => {
                console.warn('[Reader] ⚠️ Background tasks failed (non-blocking):', err.message || err);
              });
            }
          } else if (!chapterInfo && pagesLoaded) {
            // Metadatos fallaron pero tenemos páginas — intentar extraer info del ID
            console.warn('[Reader] Metadata unavailable, using fallback detection...');
            const isKnownManhwaSource = chapterId.startsWith('mweb:') || chapterId.startsWith('wc:');
            if (isKnownManhwaSource) {
              setIsWebtoon(true);
              setFitMode('fitWidth');
            }
          }
        } else {
          // Offline path — cargar metadatos en background
          try {
            const chapterInfo = await withTimeout(mangaProvider.getChapter(chapterId), 8000).catch(() => null);
            if (chapterInfo && isMounted) {
              setChapterNum(chapterInfo.data?.attributes?.chapter || '1');
              const mangaRel = chapterInfo.data?.relationships?.find((r: any) => r.type === 'manga');
              if (mangaRel) {
                setMangaId(mangaRel.id);
                // Background nav fetch
                mangaProvider.getMangaChapters(mangaRel.id, chapterInfo.data.attributes.translatedLanguage || 'es', 500, 0)
                  .then((chaptersData: any) => {
                    if (chaptersData.data && isMounted) {
                      const sorted = chaptersData.data
                        .filter((c: any) => c.attributes.chapter)
                        .sort((a: any, b: any) => parseFloat(a.attributes.chapter) - parseFloat(b.attributes.chapter));
                      const currentIdx = sorted.findIndex((c: any) => c.id === chapterId);
                      setPrevChapterId(currentIdx > 0 ? sorted[currentIdx - 1].id : null);
                      setNextChapterId(currentIdx < sorted.length - 1 ? sorted[currentIdx + 1].id : null);
                    }
                  }).catch(() => {});
              }
            } else if (downloaded) {
              const meta = await offlineService.getChapterMeta(chapterId).catch(() => null);
              if (meta && isMounted) {
                setMangaId(meta.mangaId);
                setMangaTitle(meta.mangaTitle);
                setMangaCover(meta.coverUrl || '');
                setChapterNum(meta.chapterNumber || '1');
              }
            }
          } catch (metaErr) {
            console.warn('[Reader] Offline metadata fetch failed:', metaErr);
          }
        }

        // Si después de todo no tenemos páginas, mostrar error
        if (!pagesLoaded && isMounted) {
          setError('No se pudieron cargar las páginas. Intenta de nuevo.');
        }
      } catch (err: any) {
        console.error('[Reader] Fatal fetch error:', err.message || err);
        if (isMounted) setError(err.message || 'Error al cargar las páginas.');
      } finally {
        if (globalFetchTimeout) clearTimeout(globalFetchTimeout);
        // Seguridad: si loading sigue true por alguna razón, forzar false
        if (isMounted) setLoading(false);
      }
    };
    fetchPages();

    return () => { 
      isMounted = false;
      if (globalFetchTimeout) clearTimeout(globalFetchTimeout);
    };
  }, [chapterId, dataSaverMode, markAsRead, getProgress, retryCount]);
  
  const retry = () => {
    lastLoadedId.current = null;
    setRetryCount(c => c + 1);
  };

  // Auto-ocultar UI para inmersión inicial
  useEffect(() => {
    if (!loading && !error && pages.length > 0) {
      const timer = setTimeout(() => setShowUi(false), 2500);
      return () => clearTimeout(timer);
    }
  }, [loading, error, pages.length]);

  // --- SENIOR PREFETCHING: Anticipar carga del próximo capítulo ---
  useEffect(() => {
    if (nextChapterId && pages.length > 0 && currentMangaPage > pages.length * 0.7) {
      if (!isOffline) {
        queryClient.prefetchQuery({
          queryKey: ['chapterPages', nextChapterId, 'data'],
          queryFn: () => mangaProvider.getChapterPages(nextChapterId, 'data'),
          staleTime: 1000 * 60 * 10
        });
      }
    }
  }, [nextChapterId, currentMangaPage, pages.length, queryClient, isOffline]);

  // Lógica Táctil para el modo paginado
  const handleMangaTap = (e: React.MouseEvent | { clientX: number }) => {
    if (showEndSection) return;

    const { clientX } = e;
    const width = window.innerWidth;
    const isRtl = readingDirection === 'rtl';

    const isNextZone = isRtl ? (clientX < width * 0.3) : (clientX > width * 0.7);
    const isPrevZone = isRtl ? (clientX > width * 0.7) : (clientX < width * 0.3);

    if (isNextZone) {
      if (currentMangaPage < pages.length - 1) {
        setCurrentMangaPage(prev => prev + 1);
        hapticsService.lightImpact();
      } else {
        setShowEndSection(true);
        setShowUi(true);
        hapticsService.mediumImpact();
      }
    } 
    else if (isPrevZone) {
      if (currentMangaPage > 0) {
        setCurrentMangaPage(prev => prev - 1);
        hapticsService.lightImpact();
      }
    } 
    else {
      setShowUi(prev => !prev);
      hapticsService.lightImpact();
    }
  };

  return {
    pages,
    loading,
    error,
    mangaId,
    chapterNum,
    prevChapterId,
    nextChapterId,
    isWebtoon,
    setIsWebtoon,
    currentMangaPage,
    setCurrentMangaPage,
    showUi,
    setShowUi,
    showEndSection,
    setShowEndSection,
    handleMangaTap,
    isOffline,
    fitMode,
    setFitMode,
    initialScrollPage,
    mangaTitle,
    retry
  };
}
