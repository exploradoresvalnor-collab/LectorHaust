import React, { useEffect } from 'react';
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
  IonToast,
  useIonViewWillEnter
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
import UserAvatar from '../../components/UserAvatar';
import { useHomeData } from './hooks/useHomeData';
import { useGlobalLoading } from '../../contexts/GlobalLoadingContext';
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

  const allManga = React.useMemo(() => {
    return [...latestManga, ...latestManhwa, ...latestManhua];
  }, [latestManga, latestManhwa, latestManhua]);

  const { setIsLoading } = useGlobalLoading();
  const [isReady, setIsReady] = React.useState(false);

  // Umbral de imágenes críticas (Hero + primeras de cada sección)
  const CRITICAL_IMAGES_COUNT = 2;

  useIonViewWillEnter(() => {
    if (!isReady) {
      setIsLoading(true, 'home-view');
    }
  });

  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const safetyTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Si ya tenemos datos (cache), marcamos como listo inmediatamente para evitar parpadeos
    if (latest.length > 0) {
      setIsReady(true);
      setIsLoading(false, 'home-data');
      setIsLoading(false, 'home-view');
    } else {
      setIsLoading(true, 'home-data');
    }
    
    return () => {
      setIsLoading(false, 'home-data');
      setIsLoading(false, 'home-view');
    };
  }, [setIsLoading, latest.length]);

  useEffect(() => {
    if (isReady) return;

    // Si la data terminó de cargar (sin importar las imágenes para máxima velocidad)
    if (!loading) {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        setIsLoading(false, 'home-data');
        setIsLoading(false, 'home-view');
        setIsReady(true);
      }, 150);
    }
    
    if (!safetyTimerRef.current && !isReady) {
      safetyTimerRef.current = setTimeout(() => {
         if (!isReady) {
           setIsLoading(false, 'home-data');
           setIsLoading(false, 'home-view');
           setIsReady(true);
         }
      }, 8000);
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (safetyTimerRef.current) {
        clearTimeout(safetyTimerRef.current);
        safetyTimerRef.current = null;
      }
    };
  }, [loading, setIsLoading, isReady]);


  const handleImageLoad = React.useCallback(() => {
    // Disabled to prevent infinite re-renders. Component is marked ready on data fetch.
  }, []);
  
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
      {/* Integrated Floating Header (Overlay) */}
      <div className="floating-home-header animate-fade-in">
        <div className="header-float-left" onClick={() => fetchData(true)}>
          <img src="/logolh.webp" alt="LH" className="mini-float-logo" />
          <span className="mini-float-text">Lector Haus</span>
        </div>
        <div className="header-float-right">
          {currentUser ? (
            <div className="profile-btn-float" onClick={handleProfileClick}>
              <UserAvatar user={currentUser} size={36} className="profile-avatar-wrapper" />
            </div>
          ) : (
            <button className="login-btn-float" onClick={() => router.push('/profile')}>
              <IonIcon icon={lockClosedOutline} />
            </button>
          )}
        </div>
      </div>

      <IonContent fullscreen className="home-main-content-area no-top-padding">
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
                onImageLoad={handleImageLoad}
              />
            )}
          </div>
        )}

        {/* --- HAUS INTELLIGENCE: PERSONALIZED RECOMMENDATIONS --- */}
        {!loading && latestManga.length > 0 && (
          <div className="home-recommendations-section">
            <RecommendationGrid 
              allManga={allManga}
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
                  title="Mangas Legendarios" 
                  icon={sparklesOutline}
                  items={latestManga}
                  onMangaClick={handleLatestClick}
                  mangaProvider={mangaProvider}
                  onViewAll={() => router.push('/search?type=manga&order=follows')}
                  onMangaLoad={handleImageLoad}
                />

                <HomeSectionGrid 
                  title="Mejores Manhwas (Corea)" 
                  icon={sparklesOutline}
                  items={latestManhwa}
                  onMangaClick={handleLatestClick}
                  mangaProvider={mangaProvider}
                  onViewAll={() => router.push('/search?type=manhwa&order=follows')}
                  onMangaLoad={handleImageLoad}
                />

                <HomeSectionGrid 
                  title="Joyas del Manhua (China)" 
                  icon={sparklesOutline}
                  items={latestManhua}
                  onMangaClick={handleLatestClick}
                  mangaProvider={mangaProvider}
                  onViewAll={() => router.push('/search?type=manhua&order=follows')}
                  onMangaLoad={handleImageLoad}
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
