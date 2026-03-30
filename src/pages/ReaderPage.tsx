import React from 'react';
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
  IonRange,
  useIonRouter
} from '@ionic/react';
import { 
  chevronBackOutline, 
  chevronForwardOutline,
  expandOutline,
  contractOutline,
  imageOutline
} from 'ionicons/icons';
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import { useParams } from 'react-router-dom';
import { LazyLoadImage } from 'react-lazy-load-image-component';
import 'react-lazy-load-image-component/src/effects/blur.css';
import { mangaProvider } from '../services/mangaProvider';
import CommentSection from '../components/CommentSection';
import UniversalEngagementBar from '../components/UniversalEngagementBar';
import { useMangaReader } from '../hooks/useMangaReader';
import { hapticsService } from '../services/hapticsService';
import { useSettingsStore } from '../store/useSettingsStore';
import './ReaderPage.css';

import { 
  gridOutline, listOutline, bookOutline, refreshCircleOutline, 
  cloudDownloadOutline, trashOutline, addCircleOutline, 
  removeCircleOutline, searchCircleOutline 
} from 'ionicons/icons';

const ReaderPage: React.FC = () => {
  const { chapterId } = useParams<{ chapterId: string }>();
  const router = useIonRouter();
  
  const {
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
    showUi,
    setShowUi,
    showEndSection,
    handleMangaTap,
    isOffline,
    fitMode,
    setFitMode,
    initialScrollPage,
    setCurrentMangaPage,
    retry
  } = useMangaReader(chapterId);

  const { readingDirection, setReadingDirection } = useSettingsStore();

  // NUEVO EFFECT: Hace el salto automático a la página para Manhwas (Webtoons)
  React.useEffect(() => {
    if (isWebtoon && initialScrollPage !== null && pages.length > 0) {
      setTimeout(() => {
        const targetElement = document.querySelector(`[data-index="${initialScrollPage}"]`);
        if (targetElement) {
          targetElement.scrollIntoView({ behavior: 'instant', block: 'start' }); 
        }
      }, 300);
    }
  }, [isWebtoon, initialScrollPage, pages.length]);

  // Keyboard navigation for Desktop
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isWebtoon) return;
      const isRtl = readingDirection === 'rtl';

      if (e.key === 'ArrowRight') {
        const tapEvent = { clientX: isRtl ? window.innerWidth * 0.1 : window.innerWidth * 0.9 } as any; 
        handleMangaTap(tapEvent);
      } else if (e.key === 'ArrowLeft') {
        const tapEvent = { clientX: isRtl ? window.innerWidth * 0.9 : window.innerWidth * 0.1 } as any;
        handleMangaTap(tapEvent);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isWebtoon, handleMangaTap]);

  const toggleUi = () => {
    hapticsService.lightImpact();
    setShowUi(u => !u);
  };

  const handlePageTap = (e: any) => {
    hapticsService.lightImpact();
    handleMangaTap(e);
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

      {mangaId && <UniversalEngagementBar contentId={chapterId || mangaId} title={`Capítulo ${chapterNum}`} type="chapter" />}
      {mangaId && <CommentSection mangaId={mangaId} chapterId={chapterId} title={`Comentarios del Cap. ${chapterNum}`} />}
    </div>
  );

  return (
    <IonPage className="reader-page">
      {/* UI PERSISTENTE (SIEMPRE VISIBLE) */}
      <div className="reader-persistent-bar">
        <div className="persistent-left">
          <IonButton fill="clear" onClick={() => router.back()} className="persistent-back">
            <IonIcon icon={chevronBackOutline} />
          </IonButton>
          <span className="persistent-chapter">
            Cap. {chapterNum} {!isWebtoon && pages.length > 0 && <span className="persistent-page">({currentMangaPage + 1}/{pages.length})</span>}
          </span>
        </div>
        <div className="persistent-right">
          <IonButton fill="clear" onClick={() => setIsWebtoon(!isWebtoon)} className="persistent-mode">
            <IonIcon icon={isWebtoon ? bookOutline : listOutline} slot="start" />
            {isWebtoon ? 'Cascada' : 'Páginas'}
          </IonButton>
        </div>
      </div>

      {/* Header Expandible (EXTRA) */}
      <div className={`reader-header-overlay ${showUi ? 'visible' : 'hidden'}`}>
        <IonHeader className="ion-no-border">
          <IonToolbar className="reader-toolbar-transparent">
            {/* Espacio reservado para no tapar el persistent */}
            <div style={{ height: '40px' }}></div>
            <IonButtons slot="end">
              {!isWebtoon && (
                <IonButton fill="clear" onClick={() => {
                  hapticsService.selection();
                  setReadingDirection(readingDirection === 'rtl' ? 'ltr' : 'rtl');
                }} className="direction-toggle-btn">
                  <span style={{ fontSize: '0.7rem', fontWeight: 'bold', marginRight: '4px' }}>
                    {readingDirection === 'rtl' ? 'RTL' : 'LTR'}
                  </span>
                  <IonIcon slot="icon-only" icon={refreshCircleOutline} />
                </IonButton>
              )}
              <IonButton fill="clear" onClick={() => setFitMode(fitMode === 'fitWidth' ? 'fitScreen' : 'fitWidth')} className="fit-toggle-btn">
                <IonIcon slot="icon-only" icon={fitMode === 'fitWidth' ? contractOutline : expandOutline} />
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
            <IonButton expand="block" onClick={retry}>Reintentar Carga</IonButton>
          </div>
        ) : (
          <div className="reader-core">
            
            {/* --- MODO WEBTOON (SCROLL VERTICAL CONTINUO) --- */}
            {isWebtoon && (
              <div className="pages-container manhwa-container" onClick={toggleUi}>
                {pages.map((page, index) => (
                  <div key={index} className="page-wrapper" data-index={index} style={{ contentVisibility: 'auto' }}>
                    <LazyLoadImage
                      src={page.includes('mangadex') ? mangaProvider.getOptimizedUrl(page) : page} 
                      className="manga-page loaded" 
                      alt={`Página ${index + 1}`}
                      visibleByDefault={index < 3}
                      effect="blur"
                      wrapperClassName="lazy-react-wrapper"
                      threshold={800} // Carga la página 800 pixeles antes (aprox 1.5 pantallas del celu)
                    />
                  </div>
                ))}
                {renderEndSection()}
              </div>
            )}

            {/* --- MODO MANGA (PAGINADO JAPONÉS RTL) --- */}
            {!isWebtoon && (
              <div 
                className={`manga-pager-container ${fitMode === 'fitWidth' ? 'fitWidth' : ''}`} 
                onClick={handlePageTap} // El tap ahora se maneja globalmente sin bloquear el zoom
              >
                {!showEndSection ? (
                  <div className={`manga-zoom-wrapper ${fitMode}`}>
                    <TransformWrapper
                      key={`zoom-wrapper-${chapterId}-${currentMangaPage}`}
                      initialScale={1}
                      minScale={1}
                      maxScale={4}
                      centerOnInit={true}
                      wheel={{ step: 0.1 }}
                      doubleClick={{ step: 0.5 }}
                      panning={{ excluded: ['input', 'button'] }}
                    >
                      {({ zoomIn, zoomOut, resetTransform }: any) => (
                        <TransformComponent
                          wrapperStyle={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                          contentStyle={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        >
                          <div className={`image-centering-container ${fitMode}`}>
                            <LazyLoadImage
                              key={`img-${currentMangaPage}`} 
                              src={pages[currentMangaPage].includes('mangadex') ? mangaProvider.getOptimizedUrl(pages[currentMangaPage]) : pages[currentMangaPage]} 
                              className={`manga-page-single loaded page-flip-anim ${fitMode}`} 
                              alt={`Página ${currentMangaPage + 1}`}
                              effect="blur"
                              wrapperClassName="lazy-react-wrapper"
                              threshold={400}
                              style={{ pointerEvents: 'none' }} 
                            />
                          </div>
                        </TransformComponent>
                      )}
                    </TransformWrapper>
                    
                    {/* Precargador remains outside TransformWrapper for efficiency */}
                    {currentMangaPage + 1 < pages.length && (
                      <link 
                        rel="preload" 
                        as="image" 
                        href={pages[currentMangaPage + 1].includes('mangadex') ? mangaProvider.getOptimizedUrl(pages[currentMangaPage + 1]) : pages[currentMangaPage + 1]} 
                        fetchPriority="high"
                      />
                    )}
                  </div>
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

      {/* Footer Interactivo Premium */}
      {!loading && !error && pages.length > 0 && (
        <div className={`reader-footer-overlay ${showUi ? 'visible' : 'hidden'}`}>
          <div className="reader-progress-container">
            
            {/* Slider interactivo para cambiar de página rápido */}
            {!isWebtoon && (
              <IonRange 
                className="reader-slider"
                min={0} 
                max={pages.length - 1} 
                value={currentMangaPage} 
                onIonChange={(e: any) => {
                  const newPage = e.detail.value as number;
                  setCurrentMangaPage(newPage);
                  hapticsService.lightImpact();
                }}
                color="primary"
              />
            )}

            <div className="reader-footer-info">
              <span className="page-counter">{currentMangaPage + 1} / {pages.length}</span>
            </div>
          </div>
        </div>
      )}
    </IonPage>
  );
};

export default ReaderPage;
