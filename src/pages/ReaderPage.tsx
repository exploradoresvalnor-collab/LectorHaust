import React, { useEffect, useState, useRef } from 'react';
import { 
  IonContent, 
  IonHeader, 
  IonPage, 
  IonToolbar, 
  IonButtons, 
  IonBackButton, 
  IonSpinner, 
  IonButton,
  IonIcon,
  useIonRouter
} from '@ionic/react';
import { chevronBackOutline, chevronForwardOutline } from 'ionicons/icons';
import { useParams } from 'react-router-dom';
import { mangadexService } from '../services/mangadexService';
import { useLibraryStore } from '../store/useLibraryStore';
import { auth } from '../services/firebase';
import { userStatsService } from '../services/userStatsService';
import CommentSection from '../components/CommentSection';
import './ReaderPage.css';

const ReaderPage: React.FC = () => {
  const { chapterId } = useParams<{ chapterId: string }>();
  const router = useIonRouter();
  
  // Estados de datos
  const [pages, setPages] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mangaId, setMangaId] = useState<string | null>(null);
  const [chapterNum, setChapterNum] = useState<string>('1');
  
  // Estados de navegación
  const [prevChapterId, setPrevChapterId] = useState<string | null>(null);
  const [nextChapterId, setNextChapterId] = useState<string | null>(null);
  const [isWebtoon, setIsWebtoon] = useState(false);
  
  // Estados del Lector Modo Manga
  const [currentMangaPage, setCurrentMangaPage] = useState(0);
  const [showUi, setShowUi] = useState(true);
  const [showEndSection, setShowEndSection] = useState(false);
  
  // Store y Refs
  const saveProgress = useLibraryStore(state => state.saveProgress);
  const markAsRead = useLibraryStore(state => state.markAsRead);
  const dataSaverMode = useLibraryStore(state => state.dataSaverMode);
  
  const currentPageIndex = useRef(0);
  const lastLoadedId = useRef<string | null>(null);

  // --- GUARDAR PROGRESO AL SALIR ---
  useEffect(() => {
    return () => {
      if (mangaId && chapterId) {
        saveProgress(mangaId, {
          chapterId: chapterId as string,
          chapterNumber: chapterNum,
          pageIndex: currentPageIndex.current + 1,
          lastRead: Date.now()
        });
      }
    };
  }, [mangaId, chapterId, chapterNum]);

  // --- OBSERVER PARA MODO WEBTOON (Scroll Vertical) ---
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

  // --- SINCRONIZAR PROGRESO EN MODO MANGA ---
  useEffect(() => {
    if (!isWebtoon) {
      currentPageIndex.current = currentMangaPage;
    }
  }, [currentMangaPage, isWebtoon]);

  // --- CARGAR DATOS ---
  useEffect(() => {
    const fetchPages = async () => {
      if (!chapterId || lastLoadedId.current === chapterId) return;
      
      setLoading(true);
      setError(null);
      setCurrentMangaPage(0);
      setShowEndSection(false);
      setShowUi(true);
      
      try {
        lastLoadedId.current = chapterId as string;
        const data = await mangadexService.getChapterPages(chapterId, dataSaverMode ? 'data-saver' : 'data');
        
        if (data && data.pages) {
          setPages(data.pages);
          markAsRead(chapterId);
          if (auth.currentUser) userStatsService.awardChapterXP(auth.currentUser.uid);
          
          const chapterInfo = await mangadexService.getChapter(chapterId);
          setChapterNum(chapterInfo.data.attributes.chapter || '1');
          
          const mangaRel = chapterInfo.data.relationships?.find((r: any) => r.type === 'manga');
          if (mangaRel) {
            setMangaId(mangaRel.id);
            // Detectar formato: si es coreano (ko) o chino (zh) es Webtoon (Vertical). Si no, Manga (Paginado).
            const format = mangaRel.attributes?.originalLanguage;
            setIsWebtoon(format === 'ko' || format === 'zh');

            const chaptersData = await mangadexService.getMangaChapters(
              mangaRel.id, 
              chapterInfo.data.attributes.translatedLanguage || 'es',
              100, 0
            );
            if (chaptersData.data) {
              const sorted = chaptersData.data
                .filter((c: any) => c.attributes.chapter)
                .sort((a: any, b: any) => parseFloat(a.attributes.chapter) - parseFloat(b.attributes.chapter));
              
              const currentIdx = sorted.findIndex((c: any) => c.id === chapterId);
              setPrevChapterId(currentIdx > 0 ? sorted[currentIdx - 1].id : null);
              setNextChapterId(currentIdx < sorted.length - 1 ? sorted[currentIdx + 1].id : null);
            }
          }
        }
      } catch (err: any) {
        setError(err.message || 'Error al cargar las páginas.');
      } finally {
        setLoading(false);
      }
    };
    fetchPages();
  }, [chapterId, dataSaverMode]);

  // --- LÓGICA TÁCTIL (MODO MANGA RTL) ---
  const handleMangaTap = (e: React.MouseEvent) => {
    // Si ya estamos en la sección final, no hacemos nada con el tap
    if (showEndSection) return;

    const { clientX } = e;
    const width = window.innerWidth;

    // Zona Izquierda (30% de la pantalla) -> Avanzar (RTL)
    if (clientX < width * 0.3) {
      if (currentMangaPage < pages.length - 1) {
        setCurrentMangaPage(prev => prev + 1);
      } else {
        setShowEndSection(true); // Termina el capítulo
        setShowUi(true);
      }
    } 
    // Zona Derecha (30% de la pantalla) -> Retroceder (RTL)
    else if (clientX > width * 0.7) {
      if (currentMangaPage > 0) {
        setCurrentMangaPage(prev => prev - 1);
      }
    } 
    // Zona Central (40% de la pantalla) -> Mostrar/Ocultar Menú
    else {
      setShowUi(prev => !prev);
    }
  };

  // --- SECCIÓN FINAL (REUTILIZABLE) ---
  const renderEndSection = () => (
    <div className="reader-end-section animate-fade-in">
      <div className="end-divider"></div>
      <p className="end-status">Has terminado el capítulo {chapterNum}</p>
      
      <div className="end-actions">
        <IonButton fill="outline" disabled={!prevChapterId} onClick={() => prevChapterId && router.push(`/reader/${prevChapterId}`, 'back')} className="end-nav-btn">
          <IonIcon slot="start" icon={chevronBackOutline} /> Anterior
        </IonButton>

        {nextChapterId ? (
          <IonButton fill="solid" color="primary" onClick={() => router.push(`/reader/${nextChapterId}`, 'forward')} className="end-nav-btn next-btn">
            Siguiente <IonIcon slot="end" icon={chevronForwardOutline} />
          </IonButton>
        ) : (
          <IonButton fill="clear" disabled className="end-nav-btn">Fin del Manga</IonButton>
        )}
      </div>
      
      <IonButton fill="clear" color="medium" onClick={() => router.push('/home')} className="end-back-home">
        Volver al Inicio
      </IonButton>

      {mangaId && <CommentSection mangaId={mangaId} chapterId={chapterId} title={`Comentarios del Cap. ${chapterNum}`} />}
    </div>
  );

  return (
    <IonPage className="reader-page">
      {/* Header que aparece/desaparece */}
      <div className={`reader-header-overlay ${showUi ? 'visible' : 'hidden'}`}>
        <IonHeader className="ion-no-border">
          <IonToolbar className="reader-toolbar-transparent">
            <IonButtons slot="start">
              <IonBackButton text="" defaultHref="/home" className="reader-back-btn" />
            </IonButtons>
            <div className="reader-title-container">
              <span className="reader-chapter-badge">
                Cap. {chapterNum} {isWebtoon ? '' : `(${currentMangaPage + 1}/${pages.length})`}
              </span>
            </div>
            <IonButtons slot="end">
              <IonButton fill="clear" onClick={() => setIsWebtoon(!isWebtoon)} className="mode-toggle-btn">
                {isWebtoon ? '⬇️ Scroll' : '⬅️ Pag'}
              </IonButton>
            </IonButtons>
          </IonToolbar>
        </IonHeader>
      </div>

      <IonContent 
        className="reader-content" 
        scrollY={isWebtoon && !showEndSection} // Solo permite scroll nativo en modo Webtoon
      >
        {loading ? (
          <div className="reader-loader">
            <IonSpinner name="crescent" color="primary" />
            <p>Conectando...</p>
          </div>
        ) : error ? (
          <div className="reader-error-container ion-padding ion-text-center">
            <div className="error-icon">⚠️</div>
            <h2>Ups, algo salió mal</h2>
            <p>{error}</p>
            <IonButton expand="block" onClick={() => window.location.reload()}>Reintentar Carga</IonButton>
          </div>
        ) : (
          <div className="reader-core">
            
            {/* --- MODO WEBTOON (SCROLL VERTICAL CONTINUO) --- */}
            {isWebtoon && (
              <div className="pages-container manhwa-container" onClick={() => setShowUi(u => !u)}>
                {pages.map((page, index) => (
                  <div key={index} className="page-wrapper" data-index={index}>
                    <img 
                      src={page.includes('mangadex') ? mangadexService.getProxiedUrl(page) : page} 
                      className="manga-page loaded" 
                      alt={`Página ${index + 1}`}
                      loading={index < 2 ? "eager" : "lazy"}
                    />
                  </div>
                ))}
                {renderEndSection()}
              </div>
            )}

            {/* --- MODO MANGA (PAGINADO JAPONÉS RTL) --- */}
            {!isWebtoon && (
              <div className="manga-pager-container" onClick={handleMangaTap}>
                {!showEndSection ? (
                  <>
                    <img 
                      key={currentMangaPage} // Fuerza re-render al cambiar página
                      src={pages[currentMangaPage].includes('mangadex') ? mangadexService.getProxiedUrl(pages[currentMangaPage]) : pages[currentMangaPage]} 
                      className="manga-page-single loaded fade-in" 
                      alt={`Página ${currentMangaPage + 1}`}
                    />
                    
                    {/* Precargador silencioso de la siguiente página */}
                    {currentMangaPage + 1 < pages.length && (
                      <img 
                        src={pages[currentMangaPage + 1].includes('mangadex') ? mangadexService.getProxiedUrl(pages[currentMangaPage + 1]) : pages[currentMangaPage + 1]} 
                        style={{ display: 'none' }} 
                        alt="preload next" 
                      />
                    )}
                  </>
                ) : (
                  // Cuando se acaba el manga, mostramos los comentarios y botones
                  <div className="end-section-wrapper" onClick={(e) => e.stopPropagation()}>
                    {renderEndSection()}
                  </div>
                )}
              </div>
            )}

          </div>
        )}
      </IonContent>
    </IonPage>
  );
};

export default ReaderPage;
