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
  IonIcon,
  useIonRouter,
  IonButton,
  IonToast
} from '@ionic/react';
import { 
  chevronDownOutline, 
  searchOutline, 
  lockClosedOutline, 
  personOutline,
  bookOutline,
  sparklesOutline,
  closeOutline
} from 'ionicons/icons';
import EmptyState from '../../components/EmptyState';
import LoadingScreen from '../../components/LoadingScreen';
import { useHomeData } from './hooks/useHomeData';
import { useReadingMood } from '../../hooks/useReadingMood';
import { hapticsService } from '../../services/hapticsService';
import { getTranslation } from '../../utils/translations';
import { useLanguageStore } from '../../store/useLanguageStore';
import HausSkeleton from '../../components/HausSkeleton';
import HeroGrid from './subcomponents/HeroGrid';
import HomeSectionGrid from './subcomponents/HomeSectionGrid';
import SidebarRankings from './subcomponents/SidebarRankings';
import TrendingGenres from './subcomponents/TrendingGenres';
import { RecommendationGrid } from './subcomponents/RecommendationGrid';
import { mangaProvider } from '../../services/mangaProvider';
import './styles.css';

const HomePage: React.FC = () => {
  const router = useIonRouter();
  const { lang } = useLanguageStore();
  const { mood, getMoodBasedRecommendations } = useReadingMood();
  
  const {
    latest,
    latestManga,
    latestManhwa,
    latestManhua,
    loading,
    isDone,
    currentUser,
    showLoginHint,
    setShowLoginHint,
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

  if (loading && latestManga.length === 0 && heroItems.length === 0) {
    return <IonPage><LoadingScreen /></IonPage>;
  }

  return (
    <IonPage className="home-page-container">
      <IonHeader className="ion-no-border desktop-header-ref" translucent={true}>
        <IonToolbar className="main-header">
          <div className="header-inner-content">
            {/* Logo Section */}
            <div 
              className="brand-container" 
              onClick={() => fetchData(true)}
              role="button"
              tabIndex={0}
              aria-label="Refrescar portada"
            >
              <img src="/logolh.webp" alt="Lector Haus Logo" className="brand-logo-img" width="38" height="34" />
              <div className="brand-text-wrapper">
                <span className="brand-name-main">Lector</span>
                <span className="brand-name-sub">Haus</span>
              </div>
            </div>

            {/* Navigation Links */}
            <nav className="desktop-nav">
              <span className="nav-link active" onClick={() => router.push('/home')}>Inicio</span>
              <span className="nav-link" onClick={() => router.push('/search?type=manga')}>Mangas</span>
              <span className="nav-link" onClick={() => router.push('/search?type=manhwa')}>Manhwa</span>
              <span className="nav-link" onClick={() => router.push('/search?type=one_shot')}>One Shot</span>
              <span className="nav-link" onClick={() => router.push('/search?type=manhua')}>Manhua</span>
              <span className="nav-link" onClick={() => router.push('/library')}>Biblioteca</span>
            </nav>

            {/* Search Bar */}
            <div className="header-search-wrapper" onClick={() => router.push('/search')}>
              <IonIcon icon={searchOutline} className="search-icon-mini" />
              <input 
                type="text" 
                placeholder="Busca tu manga favorito" 
                readOnly 
                className="header-search-input"
              />
            </div>

            {/* User/Login Section */}
            <div className="header-actions">
              {currentUser ? (
                <div className="profile-btn" onClick={handleProfileClick}>
                   <div className="profile-avatar-wrapper">
                    {currentUser.photoURL ? (
                      <div className="user-avatar-small">
                        <img src={currentUser.photoURL} alt="user avatar" width="32" height="32" />
                      </div>
                    ) : (
                      <div className="user-icon-blank">
                        <IonIcon icon={personOutline} />
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <button className="login-btn-tmo" onClick={() => router.push('/profile')}>
                  <IonIcon icon={lockClosedOutline} />
                  <span>Login</span>
                </button>
              )}
            </div>
          </div>
        </IonToolbar>
      </IonHeader>

      <IonContent fullscreen className="ion-padding home-main-content-area">
        {/* Minimalist Floating Login Pill */}
        {showLoginHint && (!currentUser || currentUser.isAnonymous) && (
          <div slot="fixed" className="login-pill-wrapper">
            <div 
              className="minimal-login-pill-top animate-fade-in" 
              onClick={() => router.push('/profile')}
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

        {/* --- HERO GRID SECTION --- */}
        {heroItems && heroItems.length > 0 && (
          <div className="hero-full-wrap animate-fade-in">
            {loading ? (
              <HausSkeleton type="hero" />
            ) : (
              <HeroGrid 
                heroItems={heroItems}
                onItemClick={(item) => {
                  hapticsService.lightImpact();
                  router.push(item.type === 'anime' ? `/anime/${item.id}` : `/manga/${item.id}`);
                }}
              />
            )}
          </div>
        )}

        {/* --- HAUS INTELLIGENCE: PERSONALIZED RECOMMENDATIONS --- */}
        {!loading && latestManga.length > 0 && (
          <div className="home-recommendations-section">
            <RecommendationGrid 
              allManga={latestManga.concat(latestManhwa).concat(latestManhua)}
              onMangaClick={handleLatestClick}
              limit={12}
              mood={mood}
            />
          </div>
        )}

        <div className="home-layout-container">
          {/* LEFT: MAIN CONTENT */}
          <main className="main-content-column">
            {loading ? (
              <div className="animate-fade-in">
                {[1, 2, 3].map(i => <HausSkeleton key={i} type="list-item" />)}
              </div>
            ) : latestManga.length === 0 && latestManhwa.length === 0 ? (
               <EmptyState 
                emoji="📵"
                title="Sin conexión"
                subtitle="No se pudieron cargar novedades."
                actionLabel="Reintentar"
                onAction={() => fetchData(true)}
              />
            ) : (
              <>
                <HomeSectionGrid 
                  title="Últimos Mangas  " 
                  icon={bookOutline}
                  items={latestManga}
                  onMangaClick={handleLatestClick}
                  mangaProvider={mangaProvider}
                  onViewAll={() => router.push('/search?type=manga')}
                />

                <HomeSectionGrid 
                  title="Últimos Manhwas (Corea)  " 
                  icon={bookOutline}
                  items={latestManhwa}
                  onMangaClick={handleLatestClick}
                  mangaProvider={mangaProvider}
                  onViewAll={() => router.push('/search?type=manhwa')}
                />

                <HomeSectionGrid 
                  title="Últimos Manhuas (China)  " 
                  icon={bookOutline}
                  items={latestManhua}
                  onMangaClick={handleLatestClick}
                  mangaProvider={mangaProvider}
                  onViewAll={() => router.push('/search?type=manhua')}
                />
              </>
            )}
          </main>

          {/* RIGHT: SIDEBAR */}
          <aside className="home-sidebar-column">
            <TrendingGenres 
              genres={['Acción', 'Aventura', 'Comedia', 'Drama', 'Fantasía', 'Romance', 'Ciencia Ficción', 'Terror']}
              onGenreClick={(g) => router.push(`/search?genre=${g}`)}
            />

            <SidebarRankings 
              rankings={latest.slice(0, 10).map(m => ({
                id: m.id,
                title: mangaProvider.getLocalizedTitle(m),
                cover: mangaProvider.getCoverUrl(m),
                score: m.attributes?.averageRating || 8.5,
                views: `${(Math.random() * 200).toFixed(1)}k views`
              }))}
              onItemClick={(id) => router.push(`/manga/${id}`)}
            />
          </aside>
        </div>

        {/* Infinite Scroll Removed for Performance - Managed in /search instead */}
      </IonContent>

      <IonToast
        isOpen={false}
        message=""
        duration={3000}
        position="top"
        className="custom-toast"
        color="dark"
      />
    </IonPage>
  );
};

export default HomePage;
