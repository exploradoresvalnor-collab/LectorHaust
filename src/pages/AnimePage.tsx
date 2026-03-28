import React, { useState, useEffect } from 'react';
import { 
  IonContent, 
  IonHeader, 
  IonPage, 
  IonTitle, 
  IonToolbar, 
  IonGrid, 
  IonRow, 
  IonCol, 
  IonSearchbar, 
  IonButtons,
  IonButton,
  IonIcon,
  IonSkeletonText,
  useIonRouter,
  IonBadge,
  IonRefresher,
  IonRefresherContent,
  IonBackButton,
  IonChip,
  IonLabel
} from '@ionic/react';
import { 
  playCircleOutline, 
  tvOutline, 
  trendingUpOutline, 
  timeOutline, 
  sparklesOutline,
  starOutline,
  informationCircleOutline,
  optionsOutline
} from 'ionicons/icons';
import { useLocation } from 'react-router-dom';
import { animeflvService } from '../services/animeflvService';
import { tioanimeService } from '../services/tioanimeService';
import { hianimeService } from '../services/hianimeService';
import { anilistService } from '../services/anilistService';
import { hapticsService } from '../services/hapticsService';
import { useCrossMedia } from '../hooks/useCrossMedia';
import SmartImage from '../components/SmartImage';
import AnimeCardItem from '../components/AnimeCardItem';
import './AnimeCommon.css';
import './AnimePage.css'; 

const AnimePage: React.FC = () => {
  const [spotlightAnimes, setSpotlightAnimes] = useState<any[]>([]);
  const [latestEpisodes, setLatestEpisodes] = useState<any[]>([]);
  const [latinoAnimes, setLatinoAnimes] = useState<any[]>([]);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [loadingPrimary, setLoadingPrimary] = useState(true);    // Hero + Tendencias
  const [loadingSecondary, setLoadingSecondary] = useState(true); // Nuevos Episodios
  const [loadingTertiary, setLoadingTertiary] = useState(true);   // Latino + Populares
  const [sourceProvider, setSourceProvider] = useState<'hianime' | 'animeflv' | 'tioanime'>(
    (new URLSearchParams(window.location.search).get('provider') as any) || 'animeflv'
  );
  const [activeFilter, setActiveFilter] = useState<'all' | 'latino' | 'english'>('all');
  const [searchLoading, setSearchLoading] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedType, setSelectedType] = useState('all');
  const [selectedGenre, setSelectedGenre] = useState('all');
  const router = useIonRouter();

  const HERO_CACHE_KEY = 'haus_anime_hero_cache';
  const HERO_CACHE_TTL = 12 * 60 * 60 * 1000; // 12 hours

  const fetchHomeData = async () => {
    setLoadingPrimary(true);
    setLoadingSecondary(true);
    setLoadingTertiary(true);

    // 1. Try to load hero from cache first (instant render)
    try {
      const cached = localStorage.getItem(HERO_CACHE_KEY);
      if (cached) {
        const { data, timestamp } = JSON.parse(cached);
        if (Date.now() - timestamp < HERO_CACHE_TTL && data?.length > 0) {
          setSpotlightAnimes(data);
          setLoadingPrimary(false);
          console.log('[Hero Cache] Loaded from cache, age:', Math.round((Date.now() - timestamp) / 60000), 'min');
        }
      }
    } catch { /* cache read error - ignore */ }

    try {
      const [flvTrending, flvRecent] = await Promise.all([
          animeflvService.getTrendingAnime(),
          animeflvService.getRecentEpisodes()
      ]);
      
      const topTrending = (flvTrending || []).slice(0, 5);
      const enhancedTrending = await Promise.all(topTrending.map(async (anime) => {
         const anilistInfo = await anilistService.getAnimeDetailsByName(anime.title);
         if (anilistInfo) {
             const data = { ...anime };
             data.image = anilistInfo.bannerImage || anilistInfo.coverImage?.extraLarge || data.image;
             (data as any).coverImage = anilistInfo.coverImage?.extraLarge || data.image;
             data.description = anilistInfo.description || data.description;
             (data as any).rating = anilistInfo.averageScore ? `${anilistInfo.averageScore}%` : (data as any).rating;
             return data;
         }
         return anime;
      }));
      
      const finalSpotlight = [...enhancedTrending, ...(flvTrending || []).slice(5)];
      setSpotlightAnimes(finalSpotlight);
      setLatestEpisodes(flvRecent || []);
      setLoadingPrimary(false);

      // Save to cache
      try {
        localStorage.setItem(HERO_CACHE_KEY, JSON.stringify({
          data: finalSpotlight.slice(0, 5), // Only cache top 5 for size
          timestamp: Date.now()
        }));
      } catch { /* storage full - ignore */ }

      await new Promise(r => setTimeout(r, 150));
      setLoadingSecondary(false);

      try {
        if (activeFilter === 'latino') {
          const latino = await tioanimeService.getLatestAnimes();
          setLatinoAnimes(latino.slice(0, 20).map(a => ({ ...a, preferredProvider: 'tioanime' })));
        } else if (activeFilter === 'english') {
          const english = await hianimeService.search('latest'); 
          setLatinoAnimes(english.slice(0, 20).map(a => ({ ...a, preferredProvider: 'hianime' })));
        } else {
          const latino = await tioanimeService.getLatestAnimes();
          setLatinoAnimes(latino.slice(0, 20).map(a => ({ ...a, preferredProvider: 'tioanime' })));
        }
      } catch { /* Latino es opcional */ }
      setLoadingTertiary(false);
    } catch (err) {
      console.error("Fetch anime error", err);
      setLoadingPrimary(false);
      setLoadingSecondary(false);
      setLoadingTertiary(false);
    }
  };

  useEffect(() => {
    fetchHomeData();
  }, [activeFilter]);

  const handleRefresh = async (event: any) => {
    await fetchHomeData();
    event.detail.complete();
  };

  const handleSearch = async (val: string) => {
    setQuery(val);
    if (val.length > 2) {
      setLoadingPrimary(true);
      if (activeFilter !== 'english') {
        const trending = await anilistService.getTrendingAnime();
        setSpotlightAnimes(trending.slice(0, 5));
      } else {
        // Spotlight for English (HiAnime)
        const engTrending = await hianimeService.search('action'); // Fallback search for trending
        setSpotlightAnimes(engTrending.slice(0, 5));
      }
      setLoadingPrimary(false);
      setSearchLoading(true);
      const results = await animeflvService.search(val);
      setSearchResults(results);
      setSearchLoading(false);
    } else {
      setSearchResults([]);
    }
  };

  const spotlight = spotlightAnimes.length > 0 ? spotlightAnimes[0] : null;

  return (
    <IonPage>
      <IonHeader className="ion-no-border glass-effect-header">
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/home" style={{ color: 'white' }} />
          </IonButtons>
          <IonTitle style={{ textAlign: 'left', paddingLeft: '5px' }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <img src="/logolh.webp" width="28" height="28" style={{ filter: 'drop-shadow(0 0 8px rgba(var(--ion-color-primary-rgb), 0.6))' }} />
              <div style={{ marginLeft: '10px', display: 'flex', flexDirection: 'column', lineHeight: '1.1' }}>
                <span style={{ fontWeight: 900, fontSize: '1.1rem', color: '#fff', letterSpacing: '0.5px' }}>Lector<span style={{ color: 'var(--ion-color-primary)' }}>Haus</span></span>
                <span style={{ fontSize: '0.6rem', fontWeight: 700, color: 'rgba(255,255,255,0.4)', letterSpacing: '2px' }}>ANIME PREMIUM</span>
              </div>
            </div>
          </IonTitle>
          <IonButtons slot="end">
            <div className="header-search-box">
              <IonSearchbar 
                placeholder="Buscar..." 
                value={query}
                debounce={500}
                onIonInput={(e) => handleSearch(e.detail.value!)}
                className="header-custom-search"
              />
            </div>
            <IonButton fill="clear" onClick={() => router.push('/browse-anime')} style={{ '--color': 'var(--ion-color-primary)' }}>
              <IonIcon icon={optionsOutline} />
            </IonButton>
            <IonButton fill="clear" onClick={() => hapticsService.mediumImpact()}>
              <IonIcon icon={sparklesOutline} color="secondary" />
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent fullscreen className="anime-content-bg">
        <IonRefresher slot="fixed" onIonRefresh={handleRefresh}>
          <IonRefresherContent />
        </IonRefresher>

        {query.length > 2 ? (
           <div className="search-overlay animate-fade-in" style={{ padding: '20px 15px', minHeight: '100vh', background: '#0f1014' }}>
            
            <h2 className="section-title" style={{ marginTop: '20px' }}>Resultados de "{query}"</h2>
            {searchLoading ? (
               <IonGrid className="anime-grid-v">
                <IonRow className="anime-row-v">
                  {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                    <IonCol size="6" sizeSm="4" sizeMd="3" key={i} className="anime-col-v">
                      <div className="card-media" style={{ marginBottom: '8px' }}>
                        <IonSkeletonText animated style={{ position: 'absolute', inset: 0, margin: 0 }} />
                      </div>
                      <IonSkeletonText animated style={{ width: '80%', height: '12px', borderRadius: '4px' }} />
                    </IonCol>
                  ))}
                </IonRow>
              </IonGrid>
            ) : searchResults.length > 0 ? (
              <IonGrid className="anime-grid-v">
                <IonRow className="anime-row-v">
                  {searchResults.map((anime, idx) => (
                    <IonCol size="6" sizeSm="4" sizeMd="3" key={anime.id} className="anime-col-v">
                       <AnimeCardItem 
                          anime={anime} 
                          onClick={() => router.push(`/anime/${anime.id}`, 'forward', 'push', { anime } as any)}
                          index={idx}
                       />
                    </IonCol>
                  ))}
                </IonRow>
              </IonGrid>
            ) : (
              <div className="ion-text-center"><p>No se encontraron resultados.</p></div>
            )}
           </div>
        ) : (
          <>
            {/* HERO SPOTLIGHT */}
            {loadingPrimary ? (
                <div className="hero-spotlight-skeleton">
                   <IonSkeletonText animated style={{ width: '100%', height: '100%' }} />
                </div>
            ) : spotlight ? (
                <div className="hero-spotlight animate-fade-in">
                    <img src={spotlight.image} alt={spotlight.title} className="hero-bg-img" loading="eager" />
                    <div className="hero-gradient"></div>
                    
                    <div className="hero-info-stack">
                        <div className="hero-badges">
                           <span className="premium-badge-spotlight">SPOTLIGHT</span>
                           <span className="premium-badge-featured"><IonIcon icon={starOutline} /> Destacado</span>
                        </div>
                        <h1 className="hero-title-main">{spotlight.title}</h1>
                        <p 
                           className="hero-desc-main" 
                           dangerouslySetInnerHTML={{ __html: spotlight.description || 'Sé el primero en ver los estrenos de esta temporada. Calidad premium y velocidad inigualable.' }}
                        />
                        <div className="hero-main-actions">
                           <IonButton 
                              className="btn-details-main"
                              onClick={() => router.push(`/anime/${spotlight.id}`, 'forward', 'push', { anime: spotlight } as any)}
                           >
                              <IonIcon slot="start" icon={informationCircleOutline} />
                              Saber Más
                           </IonButton>
                        </div>
                    </div>
                </div>
            ) : null}

            {/* CATALOG SECTIONS */}
            <div className="catalog-sections animate-fade-in" style={{ marginTop: '-40px', position: 'relative', zIndex: 10, paddingBottom: '40px' }}>
              <div className="main-content-wrapper">
                
                {/* FILTER CHIPS */}
                <div className="discovery-filters-v2" style={{ display: 'flex', gap: '10px', marginBottom: '20px', overflowX: 'auto', paddingBottom: '10px' }}>
                  <IonChip 
                    className={`filter-chip-v2 ${activeFilter === 'all' ? 'active' : ''}`}
                    onClick={() => setActiveFilter('all')}
                  >
                    <IonLabel>Todo</IonLabel>
                  </IonChip>
                  <IonChip 
                    className={`filter-chip-v2 ${activeFilter === 'latino' ? 'active' : ''}`}
                    onClick={() => setActiveFilter('latino')}
                  >
                    <IonLabel>🇲🇽 Latino</IonLabel>
                  </IonChip>
                  <IonChip 
                    className={`filter-chip-v2 ${activeFilter === 'english' ? 'active' : ''}`}
                    onClick={() => {
                        setActiveFilter('english');
                        setSourceProvider('hianime');
                    }}
                  >
                    <IonLabel>🇺🇸 English</IonLabel>
                  </IonChip>
                </div>

                {/* === GRID DE NOVEDADES (PARRILLA DE CUADROS) === */}
                <div className="catalog-row section-visible" style={{ marginTop: '0', animationDelay: '0.1s' }}>
                  <div className="section-header" style={{ marginBottom: '20px' }}>
                    <div className="accent-bar" style={{ background: 'var(--ion-color-primary)' }}></div>
                    <h2 className="section-title">Últimas Actualizaciones</h2>
                    <IonBadge color="primary" mode="ios" style={{ marginLeft: '10px' }}>NUEVO</IonBadge>
                  </div>
                  
                  {loadingSecondary ? (
                    <IonGrid className="anime-grid-v">
                      <IonRow className="anime-row-v">
                        {[1,2,3,4,5,6,7,8,9,12].map(i => (
                          <IonCol size="6" sizeSm="4" sizeMd="3" className="anime-col-5 anime-col-v" key={i}>
                            <div className="card-media" style={{ marginBottom: '8px' }}>
                              <IonSkeletonText animated style={{ position: 'absolute', inset: 0, margin: 0 }} />
                            </div>
                          </IonCol>
                        ))}
                      </IonRow>
                    </IonGrid>
                  ) : (
                    <IonGrid className="anime-grid-v">
                      <IonRow className="anime-row-v">
                        {latestEpisodes.map((ep, idx) => (
                          <IonCol size="6" sizeSm="4" sizeMd="3" className="anime-col-5 anime-col-v" key={'ep-'+(ep.id || ep.animeId)+idx}>
                            <AnimeCardItem 
                              anime={{ ...ep, id: ep.animeId || ep.id, title: ep.animeName || ep.title, image: ep.animePoster || ep.image, hasSub: true }} 
                              onClick={() => router.push(`/anime/${ep.animeId || ep.id}`, 'forward', 'push', { anime: ep } as any)}
                              index={idx}
                              showEpisode={true}
                            />
                          </IonCol>
                        ))}
                      </IonRow>
                    </IonGrid>
                  )}
                </div>

                <div style={{ display: 'flex', justifyContent: 'center', margin: '40px 0' }}>
                   <IonButton fill="solid" color="primary" onClick={() => router.push('/browse-anime')} style={{ '--border-radius': '15px', fontWeight: 900, height: '50px', paddingInline: '30px', '--box-shadow': '0 10px 25px rgba(var(--ion-color-primary-rgb), 0.3)' }}>
                      EXPLORAR TODO EL CATÁLOGO
                   </IonButton>
                </div>

                {/* FOOTER PROFESIONAL (PHASE 12) */}
                <footer className="page-footer">
                  <div className="footer-divider"></div>
                  <p style={{ fontWeight: 800, letterSpacing: '2px', textTransform: 'uppercase', fontSize: '0.8rem', opacity: 0.7 }}>LectorHaus 2026</p>
                </footer>
              </div>
            </div>
          </>
        )}
      </IonContent>
    </IonPage>
  );
};

export default AnimePage;
