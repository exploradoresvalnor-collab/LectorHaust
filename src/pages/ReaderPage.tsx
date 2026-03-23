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
import { mangaProvider } from '../services/mangaProvider';
import CommentSection from '../components/CommentSection';
import { useMangaReader } from '../hooks/useMangaReader';
import { hapticsService } from '../services/hapticsService';
import './ReaderPage.css';

import { gridOutline, listOutline, bookOutline, refreshCircleOutline, cloudDownloadOutline, trashOutline } from 'ionicons/icons';

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
    setFitMode
  } = useMangaReader(chapterId);

  // Keyboard navigation for Desktop
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isWebtoon) return;
      if (e.key === 'ArrowRight') {
        const tapEvent = { clientX: window.innerWidth * 0.1 } as any; // Simula tap en zona "atrás" (RTL)
        handleMangaTap(tapEvent);
      } else if (e.key === 'ArrowLeft') {
        const tapEvent = { clientX: window.innerWidth * 0.9 } as any; // Simula tap en zona "adelante" (RTL)
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
              <span className={`reader-chapter-badge ${isOffline ? 'is-offline' : ''}`}>
                {isOffline && <IonIcon icon={cloudDownloadOutline} style={{ marginRight: '5px' }} />}
                Cap. {chapterNum} {isWebtoon ? '' : `(${currentMangaPage + 1}/${pages.length})`}
              </span>
            </div>
            <IonButtons slot="end">
              <IonButton fill="clear" onClick={() => setFitMode(fitMode === 'fitWidth' ? 'fitScreen' : 'fitWidth')} className="fit-toggle-btn">
                <IonIcon slot="icon-only" icon={fitMode === 'fitWidth' ? contractOutline : expandOutline} />
              </IonButton>
              <IonButton fill="clear" onClick={() => setIsWebtoon(!isWebtoon)} className="mode-toggle-btn">
                <IonIcon slot="start" icon={isWebtoon ? bookOutline : listOutline} />
                {isWebtoon ? 'Cascada' : 'Páginas'}
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
              <div className="pages-container manhwa-container" onClick={toggleUi}>
                {pages.map((page, index) => (
                  <div key={index} className="page-wrapper" data-index={index} style={{ contentVisibility: 'auto' }}>
                    <img 
                      src={page.includes('mangadex') ? mangaProvider.getProxiedUrl(page) : page} 
                      className="manga-page loaded" 
                      alt={`Página ${index + 1}`}
                      loading={index < 3 ? "eager" : "lazy"}
                      decoding="async"
                    />
                  </div>
                ))}
                {renderEndSection()}
              </div>
            )}

            {/* --- MODO MANGA (PAGINADO JAPONÉS RTL) --- */}
            {!isWebtoon && (
              <div className={`manga-pager-container ${fitMode === 'fitWidth' ? 'fit-width' : ''}`} onClick={handlePageTap}>
                
                {/* Indicadores Visuales de Tap (Zonas clicables) */}
                <div className="tap-zone tap-next" onClick={(e) => { e.stopPropagation(); handlePageTap({ clientX: 100 } as any); }}>
                  <IonIcon icon={chevronBackOutline} />
                </div>
                <div className="tap-zone tap-prev" onClick={(e) => { e.stopPropagation(); handlePageTap({ clientX: window.innerWidth - 100 } as any); }}>
                  <IonIcon icon={chevronForwardOutline} />
                </div>
                <div className="tap-zone tap-center" onClick={(e) => { e.stopPropagation(); toggleUi(); }}></div>

                {!showEndSection ? (
                  <div className={`manga-zoom-wrapper ${fitMode}`}>
                    <TransformWrapper
                      initialScale={1}
                      minScale={1}
                      maxScale={4}
                      centerOnInit={true}
                      wheel={{ disabled: true }}
                      doubleClick={{ step: 0.5 }}
                    >
                      <TransformComponent
                        wrapperStyle={{ width: '100vw', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        contentStyle={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      >
                        <img 
                          key={currentMangaPage} 
                          src={pages[currentMangaPage].includes('mangadex') ? mangaProvider.getProxiedUrl(pages[currentMangaPage]) : pages[currentMangaPage]} 
                          className={`manga-page-single loaded page-flip-anim ${fitMode}`} 
                          alt={`Página ${currentMangaPage + 1}`}
                          decoding="async"
                        />
                      </TransformComponent>
                    </TransformWrapper>
                    
                    {/* Precargador remains outside TransformWrapper for efficiency */}
                    {currentMangaPage + 1 < pages.length && (
                      <link 
                        rel="preload" 
                        as="image" 
                        href={pages[currentMangaPage + 1].includes('mangadex') ? mangaProvider.getProxiedUrl(pages[currentMangaPage + 1]) : pages[currentMangaPage + 1]} 
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

      {/* Footer que aparece/desaparece */}
      {!loading && !error && pages.length > 0 && (
        <div className={`reader-footer-overlay ${showUi ? 'visible' : 'hidden'}`}>
          <div className="reader-progress-container">
            <div className="reader-progress-bar">
              <div 
                className="progress-fill" 
                style={{ width: `${((currentMangaPage + 1) / pages.length) * 100}%` }}
              ></div>
            </div>
            <div className="reader-footer-info">
              <span>{currentMangaPage + 1} / {pages.length}</span>
            </div>
          </div>
        </div>
      )}
    </IonPage>
  );
};

export default ReaderPage;
