import React, { useEffect, useState, useRef } from 'react';
import { 
  IonContent, 
  IonHeader, 
  IonPage, 
  IonToolbar, 
  IonGrid, 
  IonRow, 
  IonCol, 
  IonText, 
  IonRefresher,
  IonRefresherContent,
  IonInfiniteScroll,
  IonInfiniteScrollContent,
  IonButtons,
  IonButton,
  IonIcon,
  IonTitle,
  useIonRouter,
  IonSkeletonText,
  IonBadge,
  IonChip,
  IonLabel,
  IonToast
} from '@ionic/react';
import { personCircleOutline, notifications, refreshOutline, chevronDownOutline, libraryOutline, sparklesOutline, checkmarkCircle } from 'ionicons/icons';
import { mangadexService } from '../services/mangadexService';
import { useLibraryStore } from '../store/useLibraryStore';
import './HomePage.css';

const HomePage: React.FC = () => {
  const [heroMangas, setHeroMangas] = useState<any[]>([]);
  const [heroIndex, setHeroIndex] = useState(0);
  const [latest, setLatest] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [latestOffset, setLatestOffset] = useState(0);
  const [isDone, setIsDone] = useState(false);
  const [newChaptersCount, setNewChaptersCount] = useState(0);
  const [showNewBanner, setShowNewBanner] = useState(false);
  const [showSecretToast, setShowSecretToast] = useState(false);
  const [latestLang, setLatestLang] = useState('es');
  const { history } = useLibraryStore();
  const router = useIonRouter();
  const heroTimer = useRef<NodeJS.Timeout | null>(null);
  const pollTimer = useRef<NodeJS.Timeout | null>(null);
  const lastFetchRef = useRef<string | null>(null);
  const lastFetchTime = useRef<string>('');

  // Auto-rotate hero every 5 seconds
  useEffect(() => {
    if (heroMangas.length <= 1) return;
    heroTimer.current = setInterval(() => {
      setHeroIndex(prev => (prev + 1) % heroMangas.length);
    }, 8000);
    return () => { if (heroTimer.current) clearInterval(heroTimer.current); };
  }, [heroMangas]);

  // Poll for new chapters based on selected language
  useEffect(() => {
    pollTimer.current = setInterval(async () => {
      try {
        const pollData = await mangadexService.getLatestChapters(5, 0, latestLang);
        const newOnes = pollData.data || [];
        
        if (newOnes.length > 0 && lastFetchTime.current) {
          const latestServerTime = new Date(newOnes[0].attributes.readableAt).getTime();
          const ourLastTime = new Date(lastFetchTime.current).getTime();
          
          if (latestServerTime > ourLastTime) {
            setNewChaptersCount(newOnes.length);
            setShowNewBanner(true);
          }
        }
      } catch (err) {
        // Silent fail — don't break UX on poll error
      }
    }, 120000); // 2 minutes
    return () => { if (pollTimer.current) clearInterval(pollTimer.current); };
  }, [latestLang]);

  const fetchData = async (force = false) => {
    const fetchKey = `${latestLang}`;
    if (!force && lastFetchRef.current === fetchKey) return;
    lastFetchRef.current = fetchKey;

    setLoading(true);
    setLatestOffset(0);
    setIsDone(false);
    setShowNewBanner(false);
    setNewChaptersCount(0);
    
    try {
      // Fetch a diverse pool of manga for the Hero (Manga, Manhwa, Manhua)
      // We fetch more than we need and shuffle to make it feel "alive"
      const [mangaData, manhwaData, manhuaData] = await Promise.all([
        mangadexService.getPopularManga('ja', 'es', 5, 0),
        mangadexService.getPopularManga('ko', 'es', 5, 0),
        mangadexService.getPopularManga('zh', 'es', 5, 0)
      ]);

      const pool = [
        ...(mangaData.data || []),
        ...(manhwaData.data || []),
        ...(manhuaData.data || [])
      ];

      // Shuffle logic to ensure variety on every load
      const shuffledHero = pool
        .sort(() => Math.random() - 0.5)
        .slice(0, 6); // Take up to 6 for the rotation

      setHeroMangas(shuffledHero);
      setHeroIndex(0);
      
      // Fetch latest chapters based on selected language
      const latestData = await mangadexService.getLatestChapters(12, 0, latestLang);
      const chapters = latestData.data || [];
      setLatest(chapters);
      setLatestOffset(12);

      // Track last fetch time for polling comparison
      if (chapters.length > 0) {
        lastFetchTime.current = chapters[0].attributes.readableAt;
      }
    } catch (error) {
      console.error('Error fetching home data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMoreLatest = async (e: any) => {
    try {
      const latestData = await mangadexService.getLatestChapters(12, latestOffset, latestLang);
      const data = latestData.data || [];
      if (data.length < 12) setIsDone(true);
      setLatest(prev => [...prev, ...data]);
      setLatestOffset(prev => prev + 12);
    } catch (err) {
      console.error('Error loading more chapters:', err);
    }
    e.target.complete();
  };

  const handleRefreshFromBanner = () => {
    setShowNewBanner(false);
    fetchData(true);
  };

  useEffect(() => {
    fetchData();
  }, [latestLang]);

  const handleMangaClick = (manga: any) => {
    router.push(`/manga/${manga.id}`);
  };

  const handleLatestClick = (chapter: any) => {
    const mangaRel = chapter.relationships.find((r: any) => r.type === 'manga');
    if (mangaRel) {
      router.push(`/manga/${mangaRel.id}`);
    }
  };

  const handleRefresh = async (event: any) => {
    await fetchData();
    event.detail.complete();
  };

  const currentHero = heroMangas[heroIndex];

  // Helper: get cover from chapter's manga relationship
  const getChapterCover = (chapter: any) => {
    const manga = chapter.relationships?.find((r: any) => r.type === 'manga');
    const cover = chapter.relationships?.find((r: any) => r.type === 'cover_art') || 
                  manga?.relationships?.find((r: any) => r.type === 'cover_art');
    if (cover?.attributes?.fileName && manga) {
      const rawUrl = `https://uploads.mangadex.org/covers/${manga.id}/${cover.attributes.fileName}.256.jpg`;
      return mangadexService.getOptimizedUrl(rawUrl);
    }
    return null;
  };

  return (
    <IonPage className="home-page-container">
      <IonHeader className="ion-no-border" translucent={true}>
        <IonToolbar className="main-header">
          <IonTitle slot="start">
            <div className="brand-container" onClick={() => fetchData(true)}>
              <img src="/logolh.webp" alt="Lector Haus Logo" className="brand-logo-img" />
              <span className="brand-name-text">lector<span>Haus</span></span>
            </div>
          </IonTitle>
          <IonButtons slot="end">
            <IonButton className="profile-btn" onClick={() => setShowSecretToast(true)}>
              <IonIcon icon={personCircleOutline} />
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonToast 
        isOpen={showSecretToast}
        onDidDismiss={() => setShowSecretToast(false)}
        message="Pronto podrás ver el secreto que te tenemos aquí"
        duration={3000}
        position="bottom"
        color="secondary"
        cssClass="secret-toast"
      />

      <IonContent fullscreen className="ion-padding">
        <IonRefresher slot="fixed" onIonRefresh={handleRefresh}>
          <IonRefresherContent></IonRefresherContent>
        </IonRefresher>

        {/* New Chapters Notification Banner */}
        {showNewBanner && (
          <div className="notification-pill-container animate-slide-down">
            <div className="notification-pill" onClick={handleRefreshFromBanner}>
              <div className="pill-pulse-icon">
                <IonIcon icon={notifications} />
              </div>
              <div className="pill-content">
                <span className="pill-title">{newChaptersCount} nuevo{newChaptersCount > 1 ? 's' : ''} capítulo{newChaptersCount > 1 ? 's' : ''}</span>
                <span className="pill-subtitle">Actualiza para leer lo último</span>
              </div>
              <IonIcon icon={refreshOutline} className="pill-refresh" />
            </div>
          </div>
        )}

        {/* Rotating Hero Banner */}
        <div className="hero-container animate-fade-in">
          {currentHero ? (
            <div 
              className="hero-card hero-transition" 
              key={heroIndex}
              onClick={() => handleMangaClick(currentHero)}
            >
              <div 
                className="hero-img-layer"
                style={{ backgroundImage: `url(${mangadexService.getCoverUrl(currentHero)})` }}
              />
              <div className="hero-gradient-overlay" />
              <div className="hero-info">
                <span className="hero-badge">🔥 DESTACADO</span>
                <h1>{mangadexService.getLocalizedTitle(currentHero)}</h1>
                <p>{mangadexService.getLocalizedDescription(currentHero).substring(0, 150)}...</p>
                <IonButton shape="round" color="primary" size="small">
                  Leer Ahora
                </IonButton>
              </div>
              <div className="hero-dots">
                {heroMangas.map((_, i) => (
                  <span 
                    key={i} 
                    className={`hero-dot ${i === heroIndex ? 'active' : ''}`}
                    onClick={(e) => { e.stopPropagation(); setHeroIndex(i); }}
                  />
                ))}
              </div>
              {/* Bouncing down arrow */}
              <div 
                className="scroll-indicator"
                onClick={(e) => {
                  e.stopPropagation();
                  document.getElementById('latest-section')?.scrollIntoView({ behavior: 'smooth' });
                }}
              >
                <IonIcon icon={chevronDownOutline} />
                <span>Explorar</span>
              </div>
            </div>
          ) : (
            <div className="hero-card">
              <div className="hero-info">
                <span className="hero-badge">Cargando a la aventura...</span>
                <h1>LECTOR HAUS</h1>
                <p>Tu puerta al mundo del manga, manhwa y manhua.</p>
              </div>
            </div>
          )}
        </div>

        {loading ? (
          <div className="animate-fade-in">
            {[1, 2, 3, 4].map(i => (
              <IonSkeletonText key={i} animated style={{ width: '100%', height: '80px', borderRadius: '14px', marginBottom: '10px' }} />
            ))}
          </div>
        ) : (
          <div className="animate-fade-in">
            {/* Latest Chapters Section */}
            <div id="latest-section" className="section-header" style={{ marginTop: '1.5rem', paddingTop: '1rem', paddingBottom: '0.5rem' }}>
              <div className="accent-bar" style={{ background: 'var(--ion-color-secondary)' }}></div>
              <h2>Últimos Capítulos</h2>
            </div>
            
            <div className="home-lang-filters" style={{ overflowX: 'auto', whiteSpace: 'nowrap', paddingBottom: '10px', marginBottom: '10px' }}>
              {[
                { code: 'es', label: '🇪🇸 Español (Todos)' },
                { code: 'en', label: '🇺🇸 English' },
                { code: 'ja', label: '🇯🇵 日本語' },
                { code: 'ko', label: '🇰🇷 한국어' },
                { code: 'zh', label: '🇨🇳 中文' }
              ].map(lang => (
                <IonChip 
                  key={lang.code}
                  color={latestLang === lang.code ? 'primary' : 'medium'}
                  outline={latestLang !== lang.code}
                  onClick={() => setLatestLang(lang.code)}
                >
                  <IonLabel>{lang.label}</IonLabel>
                </IonChip>
              ))}
            </div>

            {latest.length > 0 ? (
              <div className="latest-list">
                {latest.map((chapter: any) => {
                  const manga = chapter.relationships.find((r: any) => r.type === 'manga');
                  const mangaTitle = manga?.attributes?.title?.en || 
                                    manga?.attributes?.title?.ja || 
                                    (manga?.attributes?.title ? Object.values(manga.attributes.title)[0] : 'Manga');
                  const coverUrl = getChapterCover(chapter);
                  const lang = chapter.attributes.translatedLanguage;
                  const timeAgo = getTimeAgo(chapter.attributes.readableAt);
                  const format = manga?.attributes?.originalLanguage;
                  const tags = manga?.attributes?.tags
                    ?.filter((t: any) => t.attributes?.group === 'genre')
                    .slice(0, 1) // Only 1 genre for space on Home
                    .map((t: any) => t.attributes?.name?.en || t.attributes?.name?.es || '');
                  
                  return (
                    <div className="latest-card" key={chapter.id} onClick={() => handleLatestClick(chapter)}>
                      {coverUrl && (
                        <img src={coverUrl} alt="" className="latest-cover" loading="lazy" />
                      )}
                      <div className="latest-info">
                        <p className="latest-manga-title">{mangaTitle}</p>
                        <div className="latest-meta">
                          {format === 'ko' && <span className="home-format-badge manhwa">MHW</span>}
                          {format === 'zh' && <span className="home-format-badge manhua">MHA</span>}
                          {format === 'ja' && <span className="home-format-badge manga">MGA</span>}
                          <IonBadge color="secondary" mode="ios" className="latest-chapter-badge">
                            Cap. {chapter.attributes.chapter || '?'}
                          </IonBadge>
                          {history[manga?.id] && (
                            <IonBadge color="success" mode="ios" className="latest-read-badge">
                              <IonIcon icon={checkmarkCircle} style={{ fontSize: '0.8rem', marginRight: '2px' }} />
                              Leyendo {history[manga.id].chapterNumber}
                            </IonBadge>
                          )}
                          {tags && tags.length > 0 && <span className="home-genre-tag">{tags[0]}</span>}
                          <span className="latest-time" style={{ marginLeft: 'auto' }}>{timeAgo}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '2rem', opacity: 0.7 }}>
                <p>No se encontraron capítulos recientes en español.</p>
                <IonButton fill="clear" onClick={() => fetchData()}>Reintentar</IonButton>
              </div>
            )}
          </div>
        )}

        <IonInfiniteScroll threshold="100px" disabled={isDone} onIonInfinite={loadMoreLatest}>
          <IonInfiniteScrollContent loadingSpinner="bubbles" loadingText="Cargando más capítulos..." />
        </IonInfiniteScroll>
      </IonContent>
    </IonPage>
  );
};

/** Helper: relative time (e.g. "hace 3h", "hace 2d") */
function getTimeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMin = Math.floor((now - then) / 60000);
  if (diffMin < 1) return 'ahora';
  if (diffMin < 60) return `hace ${diffMin}m`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `hace ${diffH}h`;
  const diffD = Math.floor(diffH / 24);
  return `hace ${diffD}d`;
}

export default HomePage;
