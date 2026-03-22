import { useState, useEffect, useRef } from 'react';
import { mangaProvider } from '../services/mangaProvider';
import { useLibraryStore } from '../store/useLibraryStore';
import { useSettingsStore } from '../store/useSettingsStore';
import { auth } from '../services/firebase';
import { userStatsService } from '../services/userStatsService';
import { offlineService } from '../services/offlineService';

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
  
  const saveProgress = useLibraryStore(state => state.saveProgress);
  const markAsRead = useLibraryStore(state => state.markAsRead);
  const dataSaverMode = useSettingsStore(state => state.dataSaverMode);
  
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
      if (!chapterId || lastLoadedId.current === chapterId) return;
      
      setLoading(true);
      setError(null);
      setCurrentMangaPage(0);
      setShowEndSection(false);
      setShowUi(true);
      
      try {
        lastLoadedId.current = chapterId;

        let pagesLoaded = false;
        let downloaded = false;

        try {
          // 🔌 OFFLINE FIRST: Check if chapter is downloaded locally
          // Wrap in a try-catch to avoid hangs if storage is blocked by tracking/privacy settings
          downloaded = await offlineService.isDownloaded(chapterId).catch(() => false);
          
          if (downloaded) {
            const localPages = await offlineService.getLocalPages(chapterId).catch(() => []);
            if (localPages.length > 0 && isMounted) {
              setPages(localPages);
              setIsOffline(true);
              markAsRead(chapterId);
              pagesLoaded = true;
              console.log(`[Reader] Loaded ${localPages.length} pages from offline storage`);
            }
          }
        } catch (storageErr) {
          console.warn('[Reader] Offline storage access blocked or failed:', storageErr);
        }

        // If no offline pages, fetch from network
        if (!pagesLoaded) {
          const data = await mangaProvider.getChapterPages(chapterId, dataSaverMode ? 'data-saver' : 'data');
          if (!isMounted) return;
          if (data && data.pages) {
            setPages(data.pages);
            markAsRead(chapterId);
            if (auth.currentUser) userStatsService.awardChapterXP(auth.currentUser.uid);
          }
        }

        // Always fetch chapter metadata for navigation (prev/next) in parallel with details
        const [chapterInfo, _] = await Promise.all([
          mangaProvider.getChapter(chapterId),
          (async () => {
             // award XP if online
             if (!downloaded && auth.currentUser) userStatsService.awardChapterXP(auth.currentUser.uid);
          })()
        ]);

        if (!isMounted) return;

        setChapterNum(chapterInfo.data.attributes.chapter || '1');
        
        const mangaRel = chapterInfo.data.relationships?.find((r: any) => r.type === 'manga');
        if (mangaRel) {
          setMangaId(mangaRel.id);
          const format = mangaRel.attributes?.originalLanguage;
          setIsWebtoon(format === 'ko' || format === 'zh');

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
              100, 0
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
        if (isMounted) setError(err.message || 'Error al cargar las páginas.');
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchPages();

    return () => { isMounted = false; };
  }, [chapterId, dataSaverMode, markAsRead]);

  // Lógica Táctil para el modo paginado
  const handleMangaTap = (e: React.MouseEvent) => {
    if (showEndSection) return;

    const { clientX } = e;
    const width = window.innerWidth;

    if (clientX < width * 0.3) {
      if (currentMangaPage < pages.length - 1) {
        setCurrentMangaPage(prev => prev + 1);
      } else {
        setShowEndSection(true);
        setShowUi(true);
      }
    } 
    else if (clientX > width * 0.7) {
      if (currentMangaPage > 0) {
        setCurrentMangaPage(prev => prev - 1);
      }
    } 
    else {
      setShowUi(prev => !prev);
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
    isOffline
  };
}
