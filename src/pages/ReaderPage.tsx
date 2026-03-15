import React, { useEffect, useState } from 'react';
import { 
  IonContent, 
  IonHeader, 
  IonPage, 
  IonToolbar, 
  IonButtons, 
  IonBackButton, 
  IonTitle, 
  IonImg, 
  IonSpinner, 
  IonText,
  IonButton,
  IonIcon,
  useIonRouter
} from '@ionic/react';
import { chevronBackOutline, chevronForwardOutline } from 'ionicons/icons';
import { useParams } from 'react-router-dom';
import { mangadexService } from '../services/mangadexService';
import { useLibraryStore } from '../store/useLibraryStore';
import './ReaderPage.css';

const ReaderPage: React.FC = () => {
  const { chapterId } = useParams<{ chapterId: string }>();
  const [pages, setPages] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [host, setHost] = useState('');
  const [hash, setHash] = useState('');
  const saveProgress = useLibraryStore(state => state.saveProgress);
  const markAsRead = useLibraryStore(state => state.markAsRead);
  const [mangaId, setMangaId] = useState<string | null>(null);
  const [chapterNum, setChapterNum] = useState<string>('1');
  const [failedPages, setFailedPages] = useState<Set<number>>(new Set());
  const currentPageIndex = React.useRef(0);
  const lastLoadedId = React.useRef<string | null>(null);
  const [prevChapterId, setPrevChapterId] = useState<string | null>(null);
  const [nextChapterId, setNextChapterId] = useState<string | null>(null);
  const dataSaverMode = useLibraryStore(state => state.dataSaverMode);
  const [isWebtoon, setIsWebtoon] = useState(false);
  const router = useIonRouter();

  // Safety cleanup: save progress on unmount
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

  // Intersection Observer for precise page tracking
  useEffect(() => {
    if (!mangaId || pages.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const pageIdx = parseInt(entry.target.getAttribute('data-index') || '0');
            currentPageIndex.current = pageIdx;
            saveProgress(mangaId, {
              chapterId: chapterId as string,
              chapterNumber: chapterNum,
              pageIndex: pageIdx + 1,
              lastRead: Date.now()
            });
          }
        });
      },
      { threshold: 0.6 } // Needs to show 60% of the page to count
    );

    const targetPages = document.querySelectorAll('.page-wrapper');
    targetPages.forEach((p) => observer.observe(p));

    return () => observer.disconnect();
  }, [mangaId, pages, chapterId, chapterNum]);

  useEffect(() => {
    const fetchPages = async () => {
      // Avoid redundant fetches for the same chapter
      if (!chapterId || lastLoadedId.current === chapterId) return;
      
      setLoading(true);
      setError(null);
      setFailedPages(new Set());
      try {
        lastLoadedId.current = chapterId as string;
        const data = await mangadexService.getChapterPages(chapterId, dataSaverMode ? 'data-saver' : 'data');
        
        if (data && data.pages) {
          setPages(data.pages);
          markAsRead(chapterId);
          
          try {
            const chapterInfo = await mangadexService.getChapter(chapterId);
            const currentNum = chapterInfo.data.attributes.chapter || '1';
            setChapterNum(currentNum);
            const mangaRel = chapterInfo.data.relationships?.find((r: any) => r.type === 'manga');
            if (mangaRel) {
              setMangaId(mangaRel.id);
              
              const format = mangaRel.attributes?.originalLanguage;
              setIsWebtoon(format === 'ko' || format === 'zh');

              // Fetch chapter list to find prev/next
              try {
                const chaptersData = await mangadexService.getMangaChapters(
                  mangaRel.id, 
                  chapterInfo.data.attributes.translatedLanguage || 'es',
                  100, 0
                );
                if (chaptersData.data) {
                  // Sort by chapter number ascending
                  const sorted = chaptersData.data
                    .filter((c: any) => c.attributes.chapter)
                    .sort((a: any, b: any) => parseFloat(a.attributes.chapter) - parseFloat(b.attributes.chapter));
                  
                  const currentIdx = sorted.findIndex((c: any) => c.id === chapterId);
                  if (currentIdx > 0) setPrevChapterId(sorted[currentIdx - 1].id);
                  if (currentIdx < sorted.length - 1) setNextChapterId(sorted[currentIdx + 1].id);
                }
              } catch (navErr) {
                // Ssssh... silent nav error
              }
            }
          } catch (metaErr) {
            // Ssssh... silent meta error
          }
        } else {
          throw new Error('La respuesta no tiene el formato esperado.');
        }
      } catch (err: any) {
        setError(err.message || 'Error al conectar con la aventura.');
      } finally {
        setLoading(false);
      }
    };

    fetchPages();
  }, [chapterId, dataSaverMode]); // Using stable primitives

  return (
    <IonPage>
      <IonHeader className="ion-no-border reader-header-minimal">
        <IonToolbar className="reader-toolbar-transparent">
          <IonButtons slot="start">
            <IonBackButton text="" defaultHref="/home" className="reader-back-btn" />
          </IonButtons>
          <div className="reader-title-container">
            <span className="reader-chapter-badge">Cap. {chapterNum}</span>
          </div>
          <IonButtons slot="end">
            <IonButton fill="clear" className="reader-menu-btn">
              {/* Optional: Add menu or more buttons here if needed */}
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent className="reader-content">
        {loading ? (
          <div className="reader-loader">
            <IonSpinner name="crescent" color="primary" />
            <p>Conectando a MangaDex At-Home...</p>
          </div>
        ) : error ? (
          <div className="reader-error-container ion-padding ion-text-center">
            <div className="error-icon">⚠️</div>
            <h2>Ups, algo salió mal</h2>
            <p>{error}</p>
            <IonButton expand="block" onClick={() => window.location.reload()}>
              Reintentar Carga
            </IonButton>
          </div>
        ) : (
          <div className={`pages-container ${isWebtoon ? 'webtoon-mode' : 'manga-mode'}`}>
            {pages.length > 0 ? (
              pages.map((page, index) => (
                <div key={index} className="page-wrapper" data-index={index}>
                  {failedPages.has(index) ? (
                    <div className="page-error">
                      <p>Error al cargar página {index + 1}</p>
                      <IonButton fill="clear" size="small" onClick={() => {
                        const newFailed = new Set(failedPages);
                        newFailed.delete(index);
                        setFailedPages(newFailed);
                      }}>
                        Reintentar
                      </IonButton>
                    </div>
                  ) : (
                    <img 
                      src={mangadexService.getProxiedUrl(page)} 
                      className={`manga-page ${isWebtoon ? 'webtoon-img' : ''}`} 
                      alt={`Página ${index + 1}`}
                      onLoad={(e) => {
                        const target = e.currentTarget;
                        target.style.opacity = '1';
                        // Keep track of successful loads if needed
                      }}
                      onError={(e) => {
                        const target = e.currentTarget;
                        // If it failed and it was a proxied URL, try original
                        if (target.src.includes('res.cloudinary.com')) {
                          console.warn(`[Reader] Cloudinary failed for page ${index + 1}, falling back to original URL.`);
                          // The original URL is the part after the last /
                          const originalUrl = decodeURIComponent(target.src.split('fetch/f_auto,q_auto,c_limit/')[1]);
                          if (originalUrl) {
                            target.src = originalUrl;
                            return;
                          }
                        }
                        setFailedPages(prev => new Set(prev).add(index));
                      }}
                      style={{ opacity: 1 }}
                    />
                  )}
                </div>
              ))
            ) : (
              <div className="ion-padding ion-text-center">
                <p>Este capítulo no contiene páginas legibles en los servidores de MangaDex.</p>
              </div>
            )}
            <div className="reader-end-section animate-fade-in">
              <div className="end-divider"></div>
              <p className="end-status">Has terminado el capítulo {chapterNum}</p>
              
              <div className="end-actions">
                <IonButton 
                  fill="outline" 
                  disabled={!prevChapterId}
                  onClick={() => prevChapterId && router.push(`/reader/${prevChapterId}`, 'back')}
                  className="end-nav-btn"
                >
                  <IonIcon slot="start" icon={chevronBackOutline} />
                  Anterior
                </IonButton>

                {nextChapterId ? (
                  <IonButton 
                    fill="solid" 
                    color="primary"
                    onClick={() => router.push(`/reader/${nextChapterId}`, 'forward')}
                    className="end-nav-btn next-btn"
                  >
                    Siguiente Cap.
                    <IonIcon slot="end" icon={chevronForwardOutline} />
                  </IonButton>
                ) : (
                  <IonButton fill="clear" disabled className="end-nav-btn">
                    Fin del Manga
                  </IonButton>
                )}
              </div>
              
              <IonButton fill="clear" color="medium" onClick={() => router.push('/home')} className="end-back-home">
                Volver al Inicio
              </IonButton>
            </div>
          </div>
        )}
      </IonContent>
    </IonPage>
  );
};

export default ReaderPage;
