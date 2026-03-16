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
import { 
  collection, 
  query, 
  where, 
  onSnapshot 
} from 'firebase/firestore';
import { db } from '../services/firebase';
import { personCircleOutline, notifications, refreshOutline, chevronDownOutline, libraryOutline, sparklesOutline, checkmarkCircle, chevronBackOutline, chevronForwardOutline, logInOutline, closeOutline } from 'ionicons/icons';
import MangaCard from '../components/MangaCard';
import { mangadexService } from '../services/mangadexService';
import { firebaseAuthService } from '../services/firebaseAuthService';
import { User } from 'firebase/auth';
import LoadingScreen from '../components/LoadingScreen';
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
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [showLoginHint, setShowLoginHint] = useState(true);
  const [latestLang, setLatestLang] = useState('es');
  // New State for Home Completed Jewels Promo
  const [completedMasterpieces, setCompletedMasterpieces] = useState<any[]>([]);
  const [popularManga, setPopularManga] = useState<any[]>([]);
  const [featuredMasterpiece, setFeaturedMasterpiece] = useState<any | null>(null);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
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

  const scrollCarousel = (id: string, direction: 'left' | 'right') => {
    const container = document.getElementById(id);
    if (container) {
      const scrollAmount = window.innerWidth > 1024 ? 600 : 300;
      container.scrollBy({ left: direction === 'left' ? -scrollAmount : scrollAmount, behavior: 'smooth' });
    }
  };

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
      const seen = new Set<string>();
      const shuffledHero = pool
        .filter(m => { if (seen.has(m.id)) return false; seen.add(m.id); return true; })
        .sort(() => Math.random() - 0.5)
        .slice(0, 6); // Take up to 6 for the rotation

      setHeroMangas(shuffledHero);
      setHeroIndex(0);
      
      // Fetch latest updated mangas (AnimeFLV style - guaranteed covers)
      const latestData = await mangadexService.getLatestUpdatedManga(12, 0, latestLang);
      const updatedMangas = latestData.data || [];
      setLatest(updatedMangas);
      setLatestOffset(12);

      // Track last update for polling
      if (updatedMangas.length > 0) {
        lastFetchTime.current = updatedMangas[0].attributes.updatedAt;
      }

      // Fetch Popular Manga for Carousel
      const popularResponse = await mangadexService.getPopularManga('', 'es', 15, 0);
      setPopularManga(popularResponse.data || []);

      // Fetch a pool of diverse Masterpieces for promotion
      const masterpieces = await mangadexService.getFullyTranslatedMasterpieces(null, 'es', 15, 0);
      if (masterpieces.data && masterpieces.data.length > 0) {
        setCompletedMasterpieces(masterpieces.data);
        // Featured promo is a random one from the 15 results
        const pool = masterpieces.data;
        setFeaturedMasterpiece(pool[Math.floor(Math.random() * pool.length)]);
      }

    } catch (error) {
      console.error('Error fetching home data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMoreLatest = async (e: any) => {
    try {
      const latestData = await mangadexService.getLatestUpdatedManga(12, latestOffset, latestLang);
      const data = latestData.data || [];
      if (data.length < 12) setIsDone(true);
      setLatest(prev => {
        const existingIds = new Set(prev.map((m: any) => m.id));
        const unique = data.filter((m: any) => !existingIds.has(m.id));
        return [...prev, ...unique];
      });
      setLatestOffset(prev => prev + 12);
    } catch (err) {
      console.error('Error loading more mangas:', err);
    }
    e.target.complete();
  };

  const handleRefreshFromBanner = () => {
    setShowNewBanner(false);
    fetchData(true);
  };

  useEffect(() => {
    fetchData();
    
    // Subscribe to Firebase Auth
    const unsubscribe = firebaseAuthService.subscribe((user: User | null) => {
      setCurrentUser(user);
      if (user) {
        useLibraryStore.getState().syncFromCloud(user.uid);
        
        // Subscribe to Notifications
        const q = query(
          collection(db, 'notifications'),
          where('userId', '==', user.uid),
          where('read', '==', false)
        );
        const unsubsNotif = onSnapshot(q, (snapshot) => {
          setUnreadNotifications(snapshot.size);
        });
        return () => { unsubsNotif(); };
      } else {
        setUnreadNotifications(0);
      }
    });

    return () => unsubscribe();
  }, [latestLang]);

  const handleMangaClick = (manga: any) => {
    router.push(`/manga/${manga.id}`);
  };

  const handleLatestClick = (manga: any) => {
    router.push(`/manga/${manga.id}`);
  };

  const handleRefresh = async (event: any) => {
    await fetchData(true);
    event.detail.complete();
  };

  const currentHero = heroMangas[heroIndex];


  const handleAnonymousLogin = async () => {
    try {
      await firebaseAuthService.loginAnonymously();
    } catch (err) {
      console.error('Anonymous login failed:', err);
    }
  };

  const handleProfileClick = async () => {
    if (currentUser) {
      router.push('/profile');
    } else {
      try {
        await firebaseAuthService.loginWithGoogle();
      } catch (err) {
        console.error('Login failed:', err);
      }
    }
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
            <IonButton className="profile-btn" onClick={handleProfileClick}>
              {currentUser ? (
                <div className="profile-avatar-wrapper">
                  {currentUser.photoURL ? (
                    <div className="user-avatar-small animate-pop-in">
                      <img src={currentUser.photoURL} alt="user" />
                    </div>
                  ) : currentUser.isAnonymous ? (
                    <div className="user-ghost-icon animate-pop-in">👻</div>
                  ) : (
                    <div className="user-mascot-golden animate-pop-in">
                      <img src="/mascot.png" alt="pro" />
                    </div>
                  )}
                  {unreadNotifications > 0 && (
                    <div className="notification-dot animate-pulse"></div>
                  )}
                </div>
              ) : (
                <div className="user-icon-blank">
                  <IonIcon icon={personCircleOutline} />
                </div>
              )}
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen className="ion-padding">
        {/* Minimalist Floating Login/Welcome Hint */}
        {showLoginHint && (
          <div className="minimal-login-dock animate-slide-up">
            <div className="dock-content">
              {!currentUser ? (
                <>
                  <img src="/mascot.png" alt="Mascota" className="dock-mini-mascot" />
                  <div className="dock-text">
                    <p>¡No pierdas tu progreso!</p>
                  </div>
                  <div className="dock-buttons">
                    <IonButton fill="clear" className="dock-login-btn" onClick={handleProfileClick}>
                      CONECTAR
                    </IonButton>
                    <IonButton fill="clear" className="dock-anon-btn" onClick={handleAnonymousLogin}>
                      FANTASMA 👻
                    </IonButton>
                  </div>
                </>
              ) : (
                <>
                  <div className="dock-mini-avatar">
                   {currentUser.photoURL ? <img src={currentUser.photoURL} alt="Mascota" /> : 
                    currentUser.isAnonymous ? <div className="mini-ghost-pill">👻</div> :
                    <div className="mini-mascot-pill"><img src="/mascot.png" alt="pro" /></div>}
                  </div>
                  <div className="dock-text">
                    <p>¡Hola, {currentUser.isAnonymous ? 'Lector Fantasma' : currentUser.displayName?.split(' ')[0]}! 🌟</p>
                  </div>
                  <IonButton fill="clear" className="dock-logout-btn" onClick={async () => { await firebaseAuthService.logout(); setShowLoginHint(false); }}>
                    SALIR
                  </IonButton>
                  <IonButton fill="clear" className="dock-login-btn" onClick={() => router.push('/profile')}>
                    PERFIL
                  </IonButton>
                </>
              )}
              <IonButton fill="clear" className="dock-close-btn" onClick={() => setShowLoginHint(false)}>
                <IonIcon icon={closeOutline} />
              </IonButton>
            </div>
          </div>
        )}

        <IonRefresher slot="fixed" onIonRefresh={handleRefresh}>
          <IonRefresherContent 
            pullingIcon={chevronDownOutline}
            refreshingSpinner="crescent"
            pullingText="Desliza para actualizar"
            refreshingText="Cargando novedades..."
          />
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
          {loading ? (
             <div className="hero-card hero-skeleton">
               <div className="hero-info">
                 <IonSkeletonText animated style={{ width: '120px', height: '24px', borderRadius: '12px', marginBottom: '10px' }} />
                 <IonSkeletonText animated style={{ width: '80%', height: '40px', marginBottom: '15px' }} />
                 <IonSkeletonText animated style={{ width: '90%', height: '60px', marginBottom: '20px' }} />
                 <IonSkeletonText animated style={{ width: '140px', height: '36px', borderRadius: '18px' }} />
               </div>
             </div>
          ) : currentHero ? (
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

        {/* --- MAIN CAROUSEL: Tendencias (MangaDex) --- */}
        {(popularManga.length > 0 || loading) && (
          <div className="animate-fade-in" style={{ marginTop: '1rem' }}>
            <div className="section-header" style={{ paddingBottom: '0.5rem' }}>
              <div className="accent-bar" style={{ background: '#ffca28' }}></div>
              <h2>Tendencias 🔥</h2>
            </div>
            <div className="carousel-wrapper">
              <IonButton fill="clear" className="carousel-scroll-btn left" onClick={(e) => { e.stopPropagation(); scrollCarousel('popular-carousel', 'left'); }}>
                <IonIcon icon={chevronBackOutline} />
              </IonButton>
              <div className="manga-carousel" id="popular-carousel">
                {loading ? (
                  [1,2,3,4,5].map(i => (
                    <div key={`skel-${i}`} className="carousel-card">
                      <IonSkeletonText animated style={{ width: '130px', height: '190px', borderRadius: '8px' }} />
                    </div>
                  ))
                ) : (
                  popularManga.map((manga: any) => (
                    <div 
                      key={manga.id} 
                      className="carousel-card"
                      onClick={() => router.push(`/manga/${manga.id}`)}
                    >
                      <img 
                        src={mangadexService.getCoverUrl(manga)} 
                        className="carousel-cover" 
                        alt={mangadexService.getLocalizedTitle(manga) as string} 
                        loading="lazy"
                      />
                      <div className="carousel-title">{mangadexService.getLocalizedTitle(manga)}</div>
                    </div>
                  ))
                )}
              </div>
              <IonButton fill="clear" className="carousel-scroll-btn right" onClick={(e) => { e.stopPropagation(); scrollCarousel('popular-carousel', 'right'); }}>
                <IonIcon icon={chevronForwardOutline} />
              </IonButton>
            </div>
          </div>
        )}

        {/* --- CAROUSEL: Joyas Finalizadas --- */}
        {(completedMasterpieces.length > 0 || loading) && (
          <div className="animate-fade-in" style={{ marginTop: '1.5rem' }}>
            <div className="section-header" style={{ paddingBottom: '0.5rem' }}>
              <div className="accent-bar" style={{ background: '#4caf50' }}></div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <h2 style={{ marginBottom: 0 }}>Joyas Finalizadas 🏆</h2>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Obras 100% traducidas</span>
              </div>
            </div>
            <div className="carousel-wrapper">
              <IonButton fill="clear" className="carousel-scroll-btn left" onClick={(e) => { e.stopPropagation(); scrollCarousel('completed-carousel', 'left'); }}>
                <IonIcon icon={chevronBackOutline} />
              </IonButton>
              <div className="manga-carousel" id="completed-carousel">
                {loading ? (
                  [1,2,3,4,5].map(i => (
                    <div key={`skel-comp-${i}`} className="carousel-card">
                      <IonSkeletonText animated style={{ width: '130px', height: '190px', borderRadius: '8px' }} />
                    </div>
                  ))
                ) : (
                  completedMasterpieces.map((manga: any) => (
                    <div 
                      key={`comp-${manga.id}`} 
                      className="carousel-card"
                      onClick={() => router.push(`/manga/${manga.id}`)}
                    >
                      <img 
                        src={mangadexService.getCoverUrl(manga)} 
                        className="carousel-cover" 
                        alt={mangadexService.getLocalizedTitle(manga) as string} 
                        loading="lazy"
                      />
                      <div className="carousel-title">{mangadexService.getLocalizedTitle(manga)}</div>
                    </div>
                  ))
                )}
              </div>
              <IonButton fill="clear" className="carousel-scroll-btn right" onClick={(e) => { e.stopPropagation(); scrollCarousel('completed-carousel', 'right'); }}>
                <IonIcon icon={chevronForwardOutline} />
              </IonButton>
            </div>
          </div>
        )}

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

            {/* Content Logic */}
            {(() => {
              const filteredLatest = latest.filter((m: any) => 
                !popularManga.some(p => p.id === m.id)
              );

              return (
                <div className="home-sections-combined">
                  {/* --- Promotion Section: Obras Maestras --- */}
                  {featuredMasterpiece && (
                    <div className="masterpiece-promotion" onClick={() => handleLatestClick(featuredMasterpiece)}>
                      <div className="promo-badge">RECOMENDADO</div>
                      <div className="promo-content">
                        <img 
                          src={mangadexService.getCoverUrl(featuredMasterpiece)} 
                          alt="promo" 
                          className="promo-image" 
                        />
                        <div className="promo-text">
                          <span className="promo-label">
                            {featuredMasterpiece.attributes?.mangaType || 'Obra Maestra'} Finalizada
                          </span>
                          <h3 className="promo-title">{mangadexService.getLocalizedTitle(featuredMasterpiece)}</h3>
                          <p className="promo-desc">
                            Esta obra está 100% completada y traducida. ¡Ideal para maratonear!
                          </p>
                          <div className="promo-tags">
                            {featuredMasterpiece.attributes?.tags?.slice(0, 3).map((t: any, i: number) => (
                              <span key={i} className="promo-tag">
                                {t.attributes?.name?.en || t.attributes?.name?.es}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {filteredLatest.length > 0 ? (
                    <div className="manga-list-container">
                      {filteredLatest.map((manga: any) => {
                        const mangaTitle = mangadexService.getLocalizedTitle(manga);
                        const coverUrl = mangadexService.getCoverUrl(manga);
                        const formatLabel = manga?.attributes?.mangaType || 'Manga';
                        
                        const lastChapter = manga?.attributes?.latestChapterNumber || manga?.attributes?.lastChapter;
                        const readableAt = manga?.attributes?.latestChapterReadableAt || manga?.attributes?.updatedAt;
                        const timeAgo = readableAt ? getTimeAgo(readableAt) : '';
                        const tags = manga?.attributes?.tags
                          ?.filter((t: any) => t.attributes?.group === 'genre')
                          .slice(0, 2)
                          .map((t: any) => t.attributes?.name?.en || t.attributes?.name?.es || '');
                        
                        return (
                          <div 
                            key={manga.id} 
                            className="manga-list-item animate-fade-in"
                            onClick={() => handleLatestClick(manga)}
                          >
                            <div className="list-item-cover-wrapper">
                              <img src={coverUrl} alt={mangaTitle as string} className="list-item-cover" loading="lazy" />
                              <div className="list-item-format-badge">{formatLabel}</div>
                            </div>
                            <div className="list-item-details">
                              <h3 className="list-item-title">{mangaTitle}</h3>
                              <div className="list-item-meta">
                                {tags && tags.length > 0 && (
                                  <div className="list-item-tags">
                                    {tags.map((tag: string, idx: number) => (
                                      <span key={idx} className="list-item-tag">{tag}</span>
                                    ))}
                                  </div>
                                )}
                              </div>
                              <div className="list-item-footer">
                                <div className="list-item-chapter">
                                  <span className="chapter-label">
                                    {lastChapter ? `Cap. ${lastChapter}` : 'Nuevo'}
                                  </span>
                                </div>
                                <div className="list-item-time">
                                  <IonIcon icon={refreshOutline} className="time-icon" />
                                  <span>{timeAgo}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div style={{ textAlign: 'center', padding: '2rem', opacity: 0.7 }}>
                      <p>No se encontraron capítulos recientes.</p>
                      <IonButton fill="clear" onClick={() => fetchData(true)}>Reintentar</IonButton>
                    </div>
                  )}
                </div>
              );
            })()}
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
