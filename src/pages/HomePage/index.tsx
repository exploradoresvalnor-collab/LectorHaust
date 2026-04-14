import React from 'react';
import { 
  IonContent, 
  IonHeader, 
  IonPage, 
  IonToolbar, 
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
  IonChip,
  IonLabel,
  IonToast
} from '@ionic/react';
import { chevronDownOutline, sparklesOutline, checkmarkCircle, chevronBackOutline, chevronForwardOutline, closeOutline, personOutline, playCircleOutline } from 'ionicons/icons';
import EmptyState from '../../components/EmptyState';
import { useHomeData } from './hooks/useHomeData';
import { hapticsService } from '../../services/hapticsService';
import { getTranslation } from '../../utils/translations';
import { useLanguageStore } from '../../store/useLanguageStore';
import LatestUpdatesList from './subcomponents/LatestUpdatesList';
import HausSkeleton from '../../components/HausSkeleton';
import './styles.css';

const HomePage: React.FC = () => {
  const router = useIonRouter();
  const { lang } = useLanguageStore();
  
  const {
    heroIndex,
    setHeroIndex,
    latest,
    loading,
    isDone,
    currentUser,
    showLoginHint,
    setShowLoginHint,
    latestLang, setLatestLang,
    latestType, setLatestType,
    unreadNotifications,
    heroItems,
    fetchData,
    loadMoreLatest
  } = useHomeData();
  
  const handleLatestClick = (manga: any) => {
    hapticsService.lightImpact();
    router.push(`/manga/${manga.id}`);
  };

  const handleRefresh = async (event: any) => {
    await fetchData(true);
    event.detail.complete();
  };

  const handleProfileClick = async () => {
    router.push('/profile');
  };

  return (
    <IonPage className="home-page-container">
      <IonHeader className="ion-no-border" translucent={true}>
        <IonToolbar className="main-header">
          <IonTitle slot="start">
            <div 
              className="brand-container" 
              onClick={() => fetchData(true)}
              role="button"
              tabIndex={0}
              aria-label="Refrescar portada"
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  fetchData(true);
                }
              }}
            >
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
        {/* NEW: Fixed Slot for Ultra-Minimalist Floating Login Pill */}
        {showLoginHint && (!currentUser || currentUser.isAnonymous) && (
          <div slot="fixed" className="login-pill-wrapper">
            <div 
              className="minimal-login-pill-top animate-fade-in" 
              onClick={() => router.push('/profile')}
              role="button"
              tabIndex={0}
              aria-label="Ir al perfil para iniciar sesión"
            >
              <div className="pill-content-inner">
                <IonIcon icon={sparklesOutline} className="mini-sparkle" />
                <span className="pill-status-text">MODO INVITADO</span>
                <span className="pill-action-text">{getTranslation('home.loginHint', lang)}</span>
              </div>
              <div className="close-pill-icon" onClick={(e) => { e.stopPropagation(); setShowLoginHint(false); }}>
                <IonIcon icon={closeOutline} />
              </div>
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

        {/* --- CINEMATIC HERO SECTION (NEW v2) --- */}
        {heroItems && heroItems.length > 0 && (
          <div className="hero-container-v2 animate-fade-in">
            {loading ? (
               <HausSkeleton type="hero" />
            ) : (
              <div className="hero-slide-v2">
                {/* Backdrop Ambient Blur Layer */}
                <div 
                  className="hero-ambient-bg" 
                  style={{ backgroundImage: `url(${heroItems[heroIndex]?.image})` }}
                />
                
                {/* High Quality Overlay Gradient */}
                <div className="hero-overlay-v2" />

                <div 
                  className="hero-content-inner" 
                  onClick={() => router.push(heroItems[heroIndex]?.link)}
                  role="link"
                  tabIndex={0}
                  aria-label={`Ver detalles de ${heroItems[heroIndex]?.title || heroItems[heroIndex]?.name}`}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      router.push(heroItems[heroIndex]?.link);
                    }
                  }}
                >
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
                  <div className="nav-arrow-btn" onClick={(e) => { e.stopPropagation(); setHeroIndex((prev: any) => (prev > 0 ? prev - 1 : heroItems.length - 1)); }}>
                    <IonIcon icon={chevronBackOutline} />
                  </div>
                  <div className="nav-arrow-btn" onClick={(e) => { e.stopPropagation(); setHeroIndex((prev: any) => (prev < heroItems.length - 1 ? prev + 1 : 0)); }}>
                    <IonIcon icon={chevronForwardOutline} />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}




        {loading ? (
          <div className="animate-fade-in">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <HausSkeleton key={i} type="list-item" />
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
            ].map(langCode => (
              <IonChip 
                key={langCode.code}
                outline={latestLang !== langCode.code}
                color={latestLang === langCode.code ? "primary" : "medium"}
                onClick={() => setLatestLang(langCode.code as any)}
              >
                <IonLabel>{langCode.label}</IonLabel>
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
            {latest.length > 0 ? (
              <div className="home-sections-combined">
                <LatestUpdatesList 
                  latest={latest} 
                  onMangaClick={handleLatestClick} 
                  lang={lang} 
                />
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '2rem', opacity: 0.7 }}>
                <p>No se encontraron capítulos recientes.</p>
                <IonButton fill="clear" onClick={() => fetchData(true)}>Reintentar</IonButton>
              </div>
            )}
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
          isOpen={false}
          message=""
          duration={3000}
          position="top"
          className="custom-toast"
          color="dark"
        />

      </IonContent>
    </IonPage>
  );
};

export default HomePage;
