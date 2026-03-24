import { useState, useEffect, useRef } from 'react';
import { mangaProvider } from '../services/mangaProvider';
import { useLibraryStore } from '../store/useLibraryStore';
import { useSettingsStore } from '../store/useSettingsStore';
import { auth } from '../services/firebase';
import { userStatsService } from '../services/userStatsService';
import { offlineService } from '../services/offlineService';
import { hapticsService } from '../services/hapticsService';

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

  // Cargar datos del capítulo (offline first)
  useEffect(() => {
    let isMounted = true;

    const fetchPages = async () => {
      if (!chapterId || (lastLoadedId.current === chapterId && retryCount === 0)) return;
      
      setLoading(true);
      setError(null);
      setCurrentMangaPage(0);
      setShowEndSection(false);
      setShowUi(true);
      
      try {
        lastLoadedId.current = chapterId;

        let pagesLoaded = false;
        let downloaded = false;
        let finalPagesCount = 0;

        try {
          // 🔌 OFFLINE FIRST: Check if chapter is downloaded locally
          // Added 2s timeout to prevent local hangs in dev environment
          console.log(`[Reader] Checking offline status for: ${chapterId}`);
          
          const timeout = new Promise<boolean>((_, reject) => 
            setTimeout(() => reject(new Error('Offline check timeout')), 2000)
          );

          downloaded = await Promise.race([
            offlineService.isDownloaded(chapterId),
            timeout
          ]).catch(err => {
            console.warn('[Reader] Offline check bypassed (Timeout/Error):', err.message);
            return false;
          });
          
          if (downloaded) {
            const localPages = await offlineService.getLocalPages(chapterId).catch(() => []);
            if (localPages.length > 0 && isMounted) {
              setPages(localPages);
              finalPagesCount = localPages.length;
              setIsOffline(true);
              markAsRead(chapterId);
              pagesLoaded = true;
              console.log(`[Reader] ✅ Loaded ${localPages.length} pages from LOCAL storage`);
            }
          }
        } catch (storageErr) {
          console.warn('[Reader] ⚠️ Offline storage access blocked or failed:', storageErr);
        }

        // Enforce hard 15-second timeout on network fetch to prevent silent UI hangs
        const withTimeout = <T = any>(promise: Promise<T>, ms = 15000): Promise<T> => 
          Promise.race([
            promise, 
            new Promise<T>((_, reject) => setTimeout(() => reject(new Error('Network timeout')), ms))
          ]);

        // If no offline pages, fetch from network
        if (!pagesLoaded) {
          console.log('[Reader] Fetching pages from network...');
          const data = await withTimeout(mangaProvider.getChapterPages(chapterId, dataSaverMode ? 'data-saver' : 'data'));
          if (!isMounted) return;
          if (data && data.pages) {
            setPages(data.pages);
            finalPagesCount = data.pages.length;
            markAsRead(chapterId);
            if (auth.currentUser) userStatsService.awardChapterXP(auth.currentUser.uid);
          }
        }

        console.log('[Reader] Fetching chapter metadata...');
        let chapterInfo: any = null;

        try {
          const [ci, _] = await withTimeout(Promise.all([
            mangaProvider.getChapter(chapterId),
            (async () => {
               if (!downloaded && auth.currentUser) userStatsService.awardChapterXP(auth.currentUser.uid);
            })()
          ]));
          chapterInfo = ci;
        } catch (networkErr: any) {
          console.warn('[Reader] Network fetch for metadata failed:', networkErr.message || networkErr);
          if (downloaded) {
            console.log('[Reader] 📡 Offline Rescue: Using local IndexedDB metadata');
            const meta = await offlineService.getChapterMeta(chapterId);
            if (meta) {
              chapterInfo = {
                data: {
                  id: chapterId,
                  attributes: { chapter: meta.chapterNumber, translatedLanguage: 'es' },
                  relationships: [{ type: 'manga', id: meta.mangaId }]
                }
              };
              if (isMounted) {
                setMangaTitle(meta.mangaTitle);
                setMangaCover(meta.coverUrl || '');
                setIsWebtoon(false); // Default offline view
              }
            }
          }
          if (!chapterInfo) throw networkErr; // Rethrow if no local fallback exists
        }

        if (!isMounted) return;

        setChapterNum(chapterInfo.data.attributes.chapter || '1');
        
        const mangaRel = chapterInfo.data.relationships?.find((r: any) => r.type === 'manga');
        if (mangaRel) {
          setMangaId(mangaRel.id);
          const format = mangaRel.attributes?.originalLanguage;
          const tags = mangaRel.attributes?.tags || [];
          const hasWebtoonTag = tags.some((t: any) => {
            const name = t.attributes?.name?.en?.toLowerCase() || '';
            const description = t.attributes?.description?.en?.toLowerCase() || '';
            return name === 'long-strip' || name === 'long strip' || name === 'webtoon' || name === 'manhwa' || description.includes('manhwa');
          });
          
          // Determine if it should be scroll (Webtoon) or pages (Manga)
          // Defensivo: Si el ID viene de ManhwaWeb o WeebCentral, es 99% Manhwa/Scroll
          const isKnownManhwaSource = chapterId.startsWith('mweb:') || chapterId.startsWith('wc:');
          const webtoonStatus = format === 'ko' || format === 'zh' || hasWebtoonTag || isKnownManhwaSource;
          
          console.log(`[Reader] Format: ${format}, WebtoonTag: ${hasWebtoonTag} -> Mode: ${webtoonStatus ? 'Scroll' : 'Pages'}`);
          setIsWebtoon(webtoonStatus);
          
          // Auto-detect reading direction if not webtoon
          if (!webtoonStatus) {
            setReadingDirection(format === 'ja' ? 'rtl' : 'ltr');
          }

          if (webtoonStatus) {
            setFitMode('fitWidth');
          }

          // --- NUEVA LÓGICA DE RESTAURACIÓN DE PROGRESO ---
          const savedProgress = getProgress(mangaRel.id);
          // Si el progreso existe, pertenece a ESTE MISMO capítulo y es mayor a la página 1
          if (savedProgress && savedProgress.chapterId === chapterId && savedProgress.pageIndex > 1) {
             let targetPage = savedProgress.pageIndex - 1; // Convertir de vuelta a base 0
             // Evitar errores si la página guardada es mayor al total de páginas
             if (targetPage >= finalPagesCount) targetPage = finalPagesCount - 1;
             
             setCurrentMangaPage(targetPage);
             currentPageIndex.current = targetPage;
             
             // Si es Webtoon, enviamos la señal a ReaderPage.tsx para que haga scroll físico
             if (webtoonStatus) {
                 setInitialScrollPage(targetPage);
             }
          }
          // ------------------------------------------------

          // Parallelize manga info and chapters scan
          Promise.all([
            // Manga details (for title/cover)
            mangaProvider.getMangaById(mangaRel.id).then((mangaData: any) => {
              if (mangaData?.data && isMounted) {
                setMangaTitle(mangaProvider.getLocalizedTitle(mangaData.data) as string);
                setMangaCover(mangaProvider.getCoverUrl(mangaData.data));
              }
            }),
            // Chapters feed (for Nav)
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
          ]).catch(err => console.warn('Reader background tasks failed', err));
        }
      } catch (err: any) {
        console.error('[Reader] Fatal fetch error:', err);
        if (isMounted) setError(err.message || 'Error al cargar las páginas o timeout excedido.');
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchPages();

    return () => { isMounted = false; };
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

  // Lógica Táctil para el modo paginado
  const handleMangaTap = (e: React.MouseEvent | { clientX: number }) => {
    if (showEndSection) return;

    const { clientX } = e;
    const width = window.innerWidth;
    const isRtl = readingDirection === 'rtl';

    // Tap Zones for Non-Webtoon (Paged) Mode
    // LTR: Left (0-30%) -> Prev, Right (70-100%) -> Next
    // RTL: Left (0-30%) -> Next, Right (70-100%) -> Prev
    
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
    retry
  };
}
