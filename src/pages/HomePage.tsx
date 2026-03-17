import React from 'react';
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
  IonToast,
  IonModal
} from '@ionic/react';
import { personCircleOutline, notifications, refreshOutline, chevronDownOutline, libraryOutline, sparklesOutline, checkmarkCircle, chevronBackOutline, chevronForwardOutline, logInOutline, closeOutline, cloudUploadOutline, chatbubblesOutline, trophyOutline, logoGoogle, personOutline } from 'ionicons/icons';
import MangaCard from '../components/MangaCard';
import { mangadexService } from '../services/mangadexService';
import { firebaseAuthService } from '../services/firebaseAuthService';
import LoadingScreen from '../components/LoadingScreen';
import { useHomeData } from '../hooks/useHomeData';
import { hapticsService } from '../services/hapticsService';
import './HomePage.css';

const HomePage: React.FC = () => {
  const router = useIonRouter();
  
  const {
    heroMangas,
    heroIndex,
    setHeroIndex,
    latest,
    loading,
    isDone,
    newChaptersCount,
    showNewBanner,
    setShowNewBanner,
    currentUser,
    showLoginHint,
    setShowLoginHint,
    latestLang,
    setLatestLang,
    completedMasterpieces,
    popularManga,
    featuredMasterpiece,
    unreadNotifications,
    fetchData,
    loadMoreLatest
  } = useHomeData();

  const handleRefreshFromBanner = () => {
    setShowNewBanner(false);
    fetchData(true);
  };

  const scrollCarousel = (id: string, direction: 'left' | 'right') => {
    const container = document.getElementById(id);
    if (container) {
      const scrollAmount = window.innerWidth > 1024 ? 600 : 300;
      container.scrollBy({ left: direction === 'left' ? -scrollAmount : scrollAmount, behavior: 'smooth' });
    }
  };

   const handleMangaClick = (manga: any) => {
    hapticsService.lightImpact();
    router.push(`/manga/${manga.id}`);
  };

  const handleLatestClick = (manga: any) => {
    hapticsService.lightImpact();
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
              <img src="/logo-premium.png" alt="Lector Haus Logo" className="brand-logo-img" />
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
        {/* Modern Bottom Sheet Login Promt  */}
        <IonModal 
          isOpen={showLoginHint && !currentUser} 
          initialBreakpoint={0.45} 
          breakpoints={[0, 0.45, 0.6]} 
          onDidDismiss={() => setShowLoginHint(false)}
          className="login-bottom-sheet"
        >
          <div className="glass-modal-content animate-fade-in">
            <div className="login-modal-header">
              <div className="header-icon-container">
                <IonIcon icon={sparklesOutline} />
              </div>
              <h2>LectorHaus Premium</h2>
              <p>Sincroniza tu progreso y únete a la comunidad oficial.</p>
            </div>
            
            <div className="login-perks-list">
              <div className="login-perk-item">
                <div className="perk-icon-wrapper"><IonIcon icon={cloudUploadOutline} /></div>
                <p>Nube personal para nunca más perder por dónde ibas.</p>
              </div>
              <div className="login-perk-item success">
                <div className="perk-icon-wrapper"><IonIcon icon={chatbubblesOutline} /></div>
                <p>Comenta e interactúa con otros lectores de LectorHaus.</p>
              </div>
              <div className="login-perk-item warning">
                <div className="perk-icon-wrapper"><IonIcon icon={trophyOutline} /></div>
                <p>Gana puntos de experiencia (XP) y sube tu Rango Hunter.</p>
              </div>
            </div>

            <div className="login-actions">
              <IonButton className="google-login-btn" expand="block" onClick={async () => {
                await firebaseAuthService.loginWithGoogle();
                setShowLoginHint(false);
              }}>
                <IonIcon icon={logoGoogle} slot="start" />
                Continuar con Google
              </IonButton>
              
              <IonButton fill="clear" className="anon-login-btn" expand="block" onClick={async () => {
                await handleAnonymousLogin();
                setShowLoginHint(false);
              }}>
                <IonIcon icon={personOutline} slot="start" />
                Continuar sin cuenta (Fantasma)
              </IonButton>
            </div>
          </div>
        </IonModal>

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
              <IonButton fill="clear" className="carousel-scroll-btn left" onClick={(e) => { e.stopPropagation(); hapticsService.lightImpact(); scrollCarousel('popular-carousel', 'left'); }}>
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
              <IonButton fill="clear" className="carousel-scroll-btn right" onClick={(e) => { e.stopPropagation(); hapticsService.lightImpact(); scrollCarousel('completed-carousel', 'right'); }}>
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
                  onClick={() => { hapticsService.lightImpact(); setLatestLang(lang.code); }}
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
