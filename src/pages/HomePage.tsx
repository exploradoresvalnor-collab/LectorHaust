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
import EmptyState from '../components/EmptyState';
import { useHomeData } from '../hooks/useHomeData';
import { hapticsService } from '../services/hapticsService';
import { getTranslation, Language } from '../utils/translations';
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
    latestLang, setLatestLang,
    latestType, setLatestType,
    completedMasterpieces,
    popularManga,
    featuredMasterpiece,
    unreadNotifications,
    fetchData,
    loadMoreLatest,
    setLoading
  } = useHomeData();

  const [previewData, setPreviewData] = React.useState<{ 
    url: string, 
    title: string, 
    desc: string,
    id: string,
    tags: string[],
    author: string,
    status: string,
    format: string
  } | null>(null);

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

  // Hide TabBar when preview is active
  React.useEffect(() => {
    if (previewData) {
      document.body.classList.add('hide-tabs');
    } else {
      document.body.classList.remove('hide-tabs');
    }
    return () => document.body.classList.remove('hide-tabs');
  }, [previewData]);

  const handleProfileClick = async () => {
    router.push('/profile');
  };

  return (
    <IonPage className="home-page-container">
      <IonHeader className="ion-no-border" translucent={true}>
        <IonToolbar className="main-header">
          <IonTitle slot="start">
            <div className="brand-container" onClick={() => fetchData(true)}>
              <img src="/logolh.webp" alt="Lector Haus Logo" className="brand-logo-img" />
              <span className="brand-name-text">lector<span style={{ marginRight: '10px' }}>Haus</span></span>
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
                      <img src="/Buho.png" alt="pro" />
                    </div>
                  )}
                  {unreadNotifications > 0 && (
                    <div className="notification-dot animate-pulse"></div>
                  )}
                </div>
              ) : (
                <div className="user-icon-blank animate-pop-in">
                  <img 
                    src="/Buho.png" 
                    alt="guest" 
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
        {/* Modern Bottom Sheet Login Promt  */}
        {/* Premium Entry Card / Login Prompt */}
        <IonModal 
          isOpen={showLoginHint && (!currentUser || currentUser.isAnonymous)} 
          initialBreakpoint={0.55} 
          breakpoints={[0, 0.55, 0.75, 1]} 
          onDidDismiss={() => setShowLoginHint(false)}
          className="premium-entry-modal"
          backdropDismiss={true}
        >
          <div className="premium-modal-content animate-fade-in">
            <div className="modal-close-handle" onClick={() => setShowLoginHint(false)}>
              <IonIcon icon={closeOutline} />
            </div>
            
            <div className="login-modal-header minimal">
              <h2 className="premium-title">Tu Aventura <span className="highlight">Nakama</span></h2>
              <p className="premium-subtitle">Desbloquea el nivel Hunter</p>
            </div>
            
            <div className="premium-perks-grid minimal">
              <div className="perk-item-compact">
                <IonIcon icon={cloudUploadOutline} className="perk-tiny-icon sync" />
                <span>Sincronización Total</span>
              </div>
              <div className="perk-item-compact">
                <IonIcon icon={chatbubblesOutline} className="perk-tiny-icon social" />
                <span>Muro Nakama</span>
              </div>
              <div className="perk-item-compact">
                <IonIcon icon={trophyOutline} className="perk-tiny-icon rank" />
                <span>Progreso Hunter</span>
              </div>
            </div>

            <div className="premium-actions-stack">
              <IonButton className="action-btn google" expand="block" onClick={async () => {
                hapticsService.mediumImpact();
                await firebaseAuthService.loginWithGoogle();
                setShowLoginHint(false);
              }}>
                <IonIcon icon={logoGoogle} slot="start" />
                Entrar con Google
              </IonButton>
              
              <IonButton fill="clear" className="action-btn ghost" expand="block" onClick={async () => {
                hapticsService.lightImpact();
                await handleAnonymousLogin();
                setShowLoginHint(false);
              }}>
                <IonIcon icon={personOutline} slot="start" />
                Modo Fantasma (Invitado)
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
                style={{ 
                  backgroundImage: `url(${mangadexService.getCoverUrl(currentHero, '512')})`,
                  backgroundPosition: 'center top'
                }}
              />
              <div className="hero-gradient-overlay" />
              <div className="hero-info">
                <span className="hero-badge">🔥 DESTACADO</span>
                <h1>{mangadexService.getLocalizedTitle(currentHero)}</h1>
                <p>
                  {mangadexService.getLocalizedDescription(currentHero).substring(0, 150)}...
                </p>
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

        {/* --- CAROUSEL: Joyas Finalizadas --- */}
        {(completedMasterpieces.length > 0 || loading) && (
          <div className="animate-fade-in" style={{ marginTop: '1.5rem' }}>
            <div className="section-header" style={{ paddingBottom: '0.5rem' }}>
              <div className="accent-bar" style={{ background: '#4caf50' }}></div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <h2>{getTranslation('home.masterpieces', latestLang as Language)} 🏆</h2>
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
        ) : latest.length > 0 ? (
          <div className="animate-fade-in">
            {/* Latest Chapters Section */}
            <div id="latest-section" className="section-header" style={{ marginTop: '1.5rem', paddingTop: '1rem', paddingBottom: '0.5rem' }}>
              <div className="accent-bar" style={{ background: 'var(--ion-color-secondary)' }}></div>
              <h2>{getTranslation('home.latest', latestLang as Language)}</h2>
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
                  {/* --- Promotion Section: Obras Maestras --- */}
                  {featuredMasterpiece && (
                    <div className="masterpiece-promotion" onClick={() => handleLatestClick(featuredMasterpiece)}>
                      <div className="promo-badge">RECOMENDADO</div>
                      <div className="promo-content">
                        <img 
                          src={mangadexService.getCoverUrl(featuredMasterpiece, '512')} 
                          alt="promo" 
                          className="promo-image" 
                          fetchPriority="high"
                          decoding="async"
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
                              <img 
                                src={mangadexService.getCoverUrl(manga, '256')} 
                                alt={mangaTitle as string} 
                                className="list-item-cover" 
                                loading="lazy"
                                decoding="async"
                                fetchPriority="low"
                                onError={(e: any) => {
                                  e.target.src = 'https://placehold.co/256x384/222222/cccccc?text=Error';
                                }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setPreviewData({
                                    url: mangadexService.getCoverUrl(manga, 'original'),
                                    title: mangadexService.getLocalizedTitle(manga),
                                    desc: mangadexService.getLocalizedDescription(manga) || 'Sin descripción disponible.',
                                    id: manga.id,
                                    tags: tags || [],
                                    author: manga.relationships?.find((r: any) => r.type === 'author')?.attributes?.name || 'Autor desconocido',
                                    status: manga.attributes?.status || 'unknown',
                                    format: formatLabel
                                  });
                                }}
                              />
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
                              <div className="format-tag-row">
                                <span className="format-tag-inline">{formatLabel}</span>
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
        {/* Image Preview Overlay (Lightbox) */}
        {previewData && (
          <div className="image-preview-overlay" onClick={() => setPreviewData(null)}>
            <div className="preview-container" onClick={(e) => e.stopPropagation()}>
              <img src={previewData.url} alt="Cover Preview" className="preview-img" />
              
              <div className="preview-info-card">
                <div className="preview-header-meta">
                   <span className={`status-badge ${previewData.status}`}>{previewData.status}</span>
                   <span className="author-name">{previewData.author}</span>
                </div>
                <h2 className="preview-title">{previewData.title}</h2>
                
                {previewData.tags.length > 0 && (
                  <div className="preview-tags">
                    {previewData.tags.slice(0, 4).map((tag, i) => (
                      <span key={i} className="preview-tag-item">{tag}</span>
                    ))}
                  </div>
                )}

                <p className="preview-desc">{previewData.desc}</p>
                <div className="preview-footer">
                  <IonButton 
                    expand="block" 
                    fill="solid" 
                    color="primary" 
                    className="preview-btn-main"
                    onClick={() => {
                        // Limpiar foco para evitar error aria-hidden en transiciones
                        if (document.activeElement instanceof HTMLElement) {
                            document.activeElement.blur();
                        }
                        setPreviewData(null);
                        setTimeout(() => {
                            router.push(`/manga/${previewData.id}`);
                        }, 150);
                    }}
                  >
                    Leer {previewData.format === 'WEBTOON' ? 'Manhwa' : 
                         previewData.format === 'MANHUA' ? 'Manhua' : 
                         previewData.format === 'MANHWA' ? 'Manhwa' : 'Manga'}
                  </IonButton>
                </div>
              </div>

              <button className="close-preview-btn fixed-close" onClick={() => setPreviewData(null)}>
                <IonIcon icon={closeOutline} />
              </button>
            </div>
          </div>
        )}
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
