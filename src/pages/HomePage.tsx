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
  IonSearchbar
} from '@ionic/react';
import { personCircleOutline, notifications, refreshOutline, chevronDownOutline, libraryOutline, sparklesOutline, checkmarkCircle, chevronBackOutline, chevronForwardOutline, logInOutline, closeOutline, cloudUploadOutline, chatbubblesOutline, trophyOutline, logoGoogle, personOutline, playCircleOutline } from 'ionicons/icons';
import MangaCard from '../components/MangaCard';
import { mangaProvider, MangaSource } from '../services/mangaProvider';
import { firebaseAuthService } from '../services/firebaseAuthService';
import LoadingScreen from '../components/LoadingScreen';
import EmptyState from '../components/EmptyState';
import { useHomeData } from '../hooks/useHomeData';
import { hapticsService } from '../services/hapticsService';
import { getTranslation, Language } from '../utils/translations';
import { useLanguageStore } from '../store/useLanguageStore';
import SmartImage from '../components/SmartImage';
import './HomePage.css';

const HomePage: React.FC = () => {
  const router = useIonRouter();
  const { lang } = useLanguageStore();
  
  const {
    heroMangas,
    heroIndex,
    setHeroIndex,
    latest,
    loading,
    loadingMasterpieces,
    isDone,
    newChaptersCount,
    showNewBanner,
    setShowNewBanner,
    currentUser,
    showLoginHint,
    setShowLoginHint,
    currentSource,
    changeSource,
    latestLang, setLatestLang,
    latestType, setLatestType,
    completedMasterpieces,
    trendingAnime,
    loadingAnime,
    popularManga,
    featuredMasterpiece,
    unreadNotifications,
    heroItems,
    fetchData,
    loadMoreLatest,
    setLoading
  } = useHomeData();
  
  const [isDesktop, setIsDesktop] = React.useState(window.innerWidth > 992);

  React.useEffect(() => {
    const handleResize = () => {
      const desktop = window.innerWidth > 992;
      setIsDesktop(desktop);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const [showToast, setShowToast] = React.useState(false);
  const [toastMsg, setToastMsg] = React.useState('');

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

   const handleMangaClick = async (manga: any) => {
    hapticsService.lightImpact();
    (router as any).push(`/manga/${manga.id}`, 'forward', 'push', { manga });
  };

  const handleLatestClick = (manga: any) => {
    hapticsService.lightImpact();
    (router as any).push(`/manga/${manga.id}`, 'forward', 'push', { manga });
  };

  const handleRefresh = async (event: any) => {
    await fetchData(true);
    event.detail.complete();
  };

  const currentHero = (heroMangas || [])[heroIndex];

  const handleAnonymousLogin = async () => {
    try {
      await firebaseAuthService.loginAnonymously();
    } catch (err) {
      console.error('Anonymous login failed:', err);
    }
  };

  const handleProfileClick = async () => {
    router.push('/profile');
  };

  return (
    <IonPage className="home-page-container">
      <IonHeader className="ion-no-border" translucent={true}>
        <IonToolbar className="main-header">
          <IonTitle slot="start">
            <div className="brand-container" onClick={() => fetchData(true)}>
              <img src="/logolh.webp" alt="Lector Haus Logo" className="brand-logo-img" width="48" height="42" />
              <span className="brand-name-text">lector<span style={{ marginRight: '10px' }}>Haus</span></span>
            </div>
          </IonTitle>
          <IonButtons slot="end">
            <IonButton className="profile-btn" onClick={handleProfileClick} aria-label="Ver perfil">
              {currentUser ? (
                <div className="profile-avatar-wrapper">
                  {currentUser.photoURL ? (
                    <div className="user-avatar-small animate-pop-in">
                      <img src={currentUser.photoURL} alt="user avatar" width="32" height="32" />
                    </div>
                  ) : currentUser.isAnonymous ? (
                    <div className="user-ghost-icon animate-pop-in">👻</div>
                  ) : (
                    <div className="user-mascot-golden animate-pop-in">
                      <img src="/Buho.webp" alt="pro mascot" width="32" height="32" />
                    </div>
                  )}
                  {unreadNotifications > 0 && (
                    <div className="notification-dot animate-pulse"></div>
                  )}
                </div>
              ) : (
                <div className="user-icon-blank animate-pop-in">
                  <img 
                    src="/Buho.webp" 
                    alt="guest avatar" 
                    width="32"
                    height="32"
                    style={{ width: '32px', height: '32px', objectFit: 'contain', filter: 'drop-shadow(0 0 5px rgba(140, 82, 255, 0.4))' }}
                    onError={(e) => (e.currentTarget.src = '/logolh.webp')} 
                  />
                </div>
              )}
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen className="ion-padding">
        {/* Subtle Sign-in Prompt */}
        {showLoginHint && (!currentUser || currentUser.isAnonymous) && (
          <div className="minimal-login-pill-top animate-fade-in" onClick={() => router.push('/profile')}>
            <div className="pill-content-inner">
              <IonIcon icon={sparklesOutline} className="mini-sparkle" />
              <span className="pill-status-text">{getTranslation('home.guestMode', lang)}</span>
              <span className="pill-action-text">{getTranslation('home.loginHint', lang)}</span>
              <IonIcon icon={chevronForwardOutline} className="pill-arrow" />
            </div>
            <div className="close-pill-icon" onClick={(e) => { e.stopPropagation(); setShowLoginHint(false); }}>
              <IonIcon icon={closeOutline} />
            </div>
          </div>
        )}

        <IonRefresher slot="fixed" onIonRefresh={handleRefresh}>
          <IonRefresherContent 
            pullingIcon={chevronDownOutline}
            refreshingSpinner="crescent"
            pullingText={getTranslation('home.pullToRefresh', lang)}
            refreshingText={getTranslation('home.refreshing', lang)}
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
                <span className="pill-title">{newChaptersCount} {getTranslation('home.newChapters', lang)}</span>
                <span className="pill-subtitle">{getTranslation('home.refreshToRead', lang)}</span>
              </div>
              <IonIcon icon={refreshOutline} className="pill-refresh" />
            </div>
          </div>
        )}

        {/* --- CINEMATIC HERO SECTION (NEW v2) --- */}
        {heroItems && heroItems.length > 0 && (
          <div className="hero-container-v2 animate-fade-in">
            {loading ? (
               <div className="hero-card-v2 hero-skeleton-v2">
                 <div className="skeleton-content-v2">
                   <IonSkeletonText animated style={{ width: '120px', height: '24px', borderRadius: '4px', marginBottom: '10px' }} />
                   <IonSkeletonText animated style={{ width: '60%', height: '40px', marginBottom: '15px' }} />
                   <IonSkeletonText animated style={{ width: '80%', height: '60px', marginBottom: '20px' }} />
                 </div>
               </div>
            ) : (
              <div className="hero-slide-v2">
                {/* Backdrop Ambient Blur Layer */}
                <div 
                  className="hero-ambient-bg" 
                  style={{ backgroundImage: `url(${heroItems[heroIndex]?.image})` }}
                />
                
                {/* High Quality Overlay Gradient */}
                <div className="hero-overlay-v2" />

                <div className="hero-content-inner" onClick={() => router.push(heroItems[heroIndex]?.link)}>
                  {/* Left Side: Text Info */}
                  <div className="hero-info-v2">
                    <div className="hero-top-badges">
                      <div className="hero-badge-item">
                        <IonIcon icon={playCircleOutline} style={{ marginRight: '6px' }} />
                        {heroItems[heroIndex]?.badge}
                      </div>
                      <div className="hero-badge-item status-badge">
                        <IonIcon icon={checkmarkCircle} style={{ marginRight: '6px' }} />
                        {heroItems[heroIndex]?.status}
                      </div>
                    </div>

                    <h1 className="hero-title-v2">{heroItems[heroIndex]?.title || heroItems[heroIndex]?.name}</h1>
                    <p className="hero-desc-v2">
                      {heroItems[heroIndex]?.isTranslated && (
                        <span style={{ color: 'var(--ion-color-secondary)', fontWeight: 800, fontSize: '0.7rem', marginRight: '6px' }}>✨ IA</span>
                      )}
                      {(heroItems[heroIndex]?.description || 'Sin descripción disponible.').substring(0, 160)}...
                    </p>

                    <div className="hero-actions-v2">
                      <IonButton 
                        className="hero-btn-primary"
                        onClick={(e) => { 
                          e.stopPropagation(); 
                          const item = heroItems[heroIndex];
                          router.push(item.type === 'anime' ? `/anime/${item.id}` : `/manga/${item.id}`); 
                        }}
                      >
                        <IonIcon icon={playCircleOutline} slot="start" />
                        {heroItems[heroIndex]?.type === 'anime' ? 'VER AHORA' : 'LEER AHORA'}
                      </IonButton>
                      <IonButton 
                        fill="clear" 
                        className="hero-btn-secondary"
                        onClick={(e) => { 
                          e.stopPropagation(); 
                          router.push(heroItems[heroIndex]?.link); 
                        }}
                      >
                        <IonIcon icon={personOutline} slot="start" />
                        DETALLES
                      </IonButton>
                    </div>
                  </div>

                  {/* Right Side: High-Res Floating Poster (Responsive) */}
                  <div className="hero-poster-v2">
                    <div className="poster-inner-v2">
                      <img src={heroItems[heroIndex]?.image} alt={heroItems[heroIndex]?.title} className="poster-img-v2" />
                      <div className="poster-shine-v2" />
                    </div>
                  </div>
                </div>

                {/* Navigation Dots (Centered Bottom) */}
                <div className="hero-dots-v2">
                  {heroItems.map((_: any, idx: number) => (
                    <div 
                      key={idx} 
                      className={`hero-dot ${idx === heroIndex ? 'active' : ''}`}
                      onClick={(e) => { e.stopPropagation(); setHeroIndex(idx); }}
                    />
                  ))}
                </div>

                {/* Nav Arrows (Desktop Only) */}
                <div className="hero-nav-arrows">
                  <div className="nav-arrow-btn" onClick={(e) => { e.stopPropagation(); setHeroIndex((prev) => (prev > 0 ? prev - 1 : heroItems.length - 1)); }}>
                    <IonIcon icon={chevronBackOutline} />
                  </div>
                  <div className="nav-arrow-btn" onClick={(e) => { e.stopPropagation(); setHeroIndex((prev) => (prev < heroItems.length - 1 ? prev + 1 : 0)); }}>
                    <IonIcon icon={chevronForwardOutline} />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}




        {loading ? (
          <div className="animate-fade-in">
            {[1, 2, 3, 4].map(i => (
              <IonSkeletonText key={i} animated style={{ width: '100%', height: '80px', borderRadius: '14px', marginBottom: '10px' }} />
            ))}
          </div>
        ) : latest.length > 0 ? (
          <div className="animate-fade-in">
            {/* Latest Chapters Section */}
            <div id="latest-section" className="section-header">
              <div className="accent-bar" style={{ background: 'var(--ion-color-secondary)' }}></div>
              <h2>{getTranslation('home.latest', lang)}</h2>
            </div>
            

            {/* Language Filters */}
          <div className="home-lang-filters">
            {[
              { code: 'all', label: '🌎 Mundial' },
              { code: 'es', label: '🇪🇸 Español' },
              { code: 'en', label: '🇺🇸 English' },
              { code: 'pt-br', label: '🇧🇷 Português' },
              { code: 'fr', label: '🇫🇷 Français' },
              { code: 'it', label: '🇮🇹 Italiano' },
              { code: 'de', label: '🇩🇪 Deutsch' },
              { code: 'ru', label: '🇷🇺 Русский' },
              { code: 'tr', label: '🇹🇷 Türkçe' },
              { code: 'vi', label: '🇻🇳 Tiếng Việt' },
              { code: 'th', label: '🇹🇭 ไทย' }
            ].map(lang => (
              <IonChip 
                key={lang.code}
                outline={latestLang !== lang.code}
                color={latestLang === lang.code ? "primary" : "medium"}
                onClick={() => setLatestLang(lang.code as any)}
              >
                <IonLabel>{lang.label}</IonLabel>
              </IonChip>
            ))}
          </div>

          {/* NEW: Type Filters (Global Expansion) */}
          <div className="home-lang-filters type-filters">
            {[
              { id: 'all', label: '✨ Todos' },
              { id: 'manga', label: '🇯🇵 Manga (JP)' },
              { id: 'manhwa', label: '🇰🇷 Manhwa (KR)' },
              { id: 'manhua', label: '🇨🇳 Manhua (CN)' },
              { id: 'en', label: '🇺🇸 Western (OEL)' },
              { id: 'fr', label: '🇫🇷 BD Française' }
            ].map(type => (
              <IonChip 
                key={type.id}
                outline={latestType !== type.id}
                color={latestType === type.id ? "secondary" : "medium"}
                onClick={() => setLatestType(type.id)}
              >
                <IonLabel>{type.label}</IonLabel>
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


                  {filteredLatest.length > 0 ? (
                    <div className="manga-list-container">
                      {filteredLatest.map((manga: any) => {
                        const mangaTitle = mangaProvider.getLocalizedTitle(manga);
                        const coverUrl = mangaProvider.getCoverUrl(manga);
                        const formatLabel = manga?.attributes?.mangaType || 'Manga';
                        
                        const lastChapter = manga?.attributes?.latestChapterNumber || manga?.attributes?.calculatedTotalChapters || manga?.attributes?.lastChapter;
                        const readableAt = manga?.attributes?.latestChapterReadableAt || manga?.attributes?.updatedAt;
                        const timeAgo = readableAt ? getTimeAgo(readableAt) : '';
                        const tags = manga?.attributes?.tags
                          ?.filter((t: any) => t.attributes?.group === 'genre')
                          .slice(0, 2)
                          .map((t: any) => t.attributes?.name?.en || t.attributes?.name?.es || '');

                        const isAdult = manga?.attributes?.contentRating === 'erotica' || 
                                        manga?.attributes?.contentRating === 'pornographic' ||
                                        manga?.attributes?.tags?.some((t: any) => {
                                          const name = t.attributes?.name?.en?.toLowerCase() || '';
                                          return name === 'ecchi' || name === 'smut' || name === 'hentai' || name === 'sexual violence';
                                        });

                        if (manga?.attributes?.contentRating !== 'safe') {
                          console.log('RATING CHECK:', {
                            title: mangaTitle,
                            rating: manga?.attributes?.contentRating,
                            isAdultResult: isAdult
                          });
                        }
                        
                        return (
                          <div 
                            key={manga.id} 
                            className="manga-list-item animate-fade-in"
                            onClick={() => handleLatestClick(manga)}
                          >
                            <SmartImage
                              src={mangaProvider.getCoverUrl(manga, '256')} 
                              alt={mangaTitle as string} 
                              className="list-item-cover" 
                              width={80}
                              height={110}
                              loading="lazy"
                              fetchPriority="low"
                            >
                              <div className="list-item-lang-badge">
                                {(() => {
                                  const code = manga.attributes?.latestChapterLang || manga.attributes?.originalLanguage || 'en';
                                  const flags: Record<string, string> = {
                                    'es': '🇪🇸', 'es-la': '🇲🇽', 'en': '🇺🇸', 'ja': '🇯🇵', 'ko': '🇰🇷', 'zh': '🇨🇳',
                                    'zh-hk': '🇭🇰', 'fr': '🇫🇷', 'it': '🇮🇹', 'de': '🇩🇪', 'ru': '🇷🇺', 'tr': '🇹🇷',
                                    'vi': '🇻🇳', 'th': '🇹🇭', 'id': '🇮🇩', 'pt-br': '🇧🇷'
                                  };
                                  return flags[code] || '🌐';
                                })()}
                              </div>
                              {isAdult && (
                                <div className="list-item-adult-badge">18+</div>
                              )}
                            </SmartImage>
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
                              <div className="format-tag-row">
                                <span className="format-tag-inline">{formatLabel}</span>
                                <div className="list-item-chapter">
                                  <span className="chapter-label">
                                    {lastChapter ? `Cap. ${lastChapter}` : 'Nuevo'}
                                  </span>
                                </div>
                              </div>
                              <div className="list-item-footer-minimal">
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
        ) : (
          <EmptyState 
            emoji="📵"
            title="Estás fuera de línea"
            subtitle="No se pudieron cargar novedades. Ve a tu biblioteca para leer tus capítulos descargados."
            actionLabel="Ir a Descargas"
            onAction={() => router.push('/library')}
          />
        )}

        <IonInfiniteScroll threshold="100px" disabled={isDone} onIonInfinite={loadMoreLatest}>
          <IonInfiniteScrollContent loadingSpinner="bubbles" loadingText="Cargando más capítulos..." />
        </IonInfiniteScroll>

        <IonToast
          isOpen={showToast}
          onDidDismiss={() => setShowToast(false)}
          message={toastMsg}
          duration={3000}
          position="top"
          className="custom-toast"
          color="dark"
        />
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
