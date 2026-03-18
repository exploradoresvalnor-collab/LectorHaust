import { useState, useEffect, useRef } from 'react';
import { mangadexService } from '../services/mangadexService';
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
          mangaTitle: mangaTitle || undefined,
          mangaCover: mangaCover || undefined
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

        // 🔌 OFFLINE FIRST: Check if chapter is downloaded locally
        const downloaded = await offlineService.isDownloaded(chapterId);
        let pagesLoaded = false;

        if (downloaded) {
          const localPages = await offlineService.getLocalPages(chapterId);
          if (localPages.length > 0 && isMounted) {
            setPages(localPages);
            setIsOffline(true);
            markAsRead(chapterId);
            pagesLoaded = true;
            console.log(`[Reader] Loaded ${localPages.length} pages from offline storage`);
          }
        }

        // If no offline pages, fetch from network
        if (!pagesLoaded) {
          const data = await mangadexService.getChapterPages(chapterId, dataSaverMode ? 'data-saver' : 'data');
          if (!isMounted) return;
          if (data && data.pages) {
            setPages(data.pages);
            markAsRead(chapterId);
            if (auth.currentUser) userStatsService.awardChapterXP(auth.currentUser.uid);
          }
        }

        // Always fetch chapter metadata for navigation (prev/next)
        const chapterInfo = await mangadexService.getChapter(chapterId);
        if (!isMounted) return;

        setChapterNum(chapterInfo.data.attributes.chapter || '1');
        
        const mangaRel = chapterInfo.data.relationships?.find((r: any) => r.type === 'manga');
        if (mangaRel) {
          setMangaId(mangaRel.id);
          const format = mangaRel.attributes?.originalLanguage;
          setIsWebtoon(format === 'ko' || format === 'zh');

          // Fetch manga details to get title and cover for progress tracking
          try {
            const mangaData = await mangadexService.getMangaById(mangaRel.id);
            if (mangaData?.data && isMounted) {
              setMangaTitle(mangadexService.getLocalizedTitle(mangaData.data));
              setMangaCover(mangadexService.getCoverUrl(mangaData.data));
            }
          } catch { /* non-critical */ }

          const chaptersData = await mangadexService.getMangaChapters(
            mangaRel.id, 
            chapterInfo.data.attributes.translatedLanguage || 'es',
            100, 0
          );
          if (!isMounted) return;

          if (chaptersData.data) {
            const sorted = chaptersData.data
              .filter((c: any) => c.attributes.chapter)
              .sort((a: any, b: any) => parseFloat(a.attributes.chapter) - parseFloat(b.attributes.chapter));
            
            const currentIdx = sorted.findIndex((c: any) => c.id === chapterId);
            setPrevChapterId(currentIdx > 0 ? sorted[currentIdx - 1].id : null);
            setNextChapterId(currentIdx < sorted.length - 1 ? sorted[currentIdx + 1].id : null);
          }
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
