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
  IonBackButton
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
import { animeflvService } from '../services/animeflvService';
import { tioanimeService } from '../services/tioanimeService';
import { anilistService } from '../services/anilistService';
import { hapticsService } from '../services/hapticsService';
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
  const [searchLoading, setSearchLoading] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedType, setSelectedType] = useState('all');
  const [selectedGenre, setSelectedGenre] = useState('all');
  const router = useIonRouter();

  const fetchHomeData = async () => {
    setLoadingPrimary(true);
    setLoadingSecondary(true);
    setLoadingTertiary(true);
    try {
      const [flvTrending, flvRecent] = await Promise.all([
          animeflvService.getTrendingAnime(),
          animeflvService.getRecentEpisodes()
      ]);
      
      const topTrending = (flvTrending || []).slice(0, 5);
      const enhancedTrending = await Promise.all(topTrending.map(async (anime) => {
         const anilistInfo = await anilistService.getAnimeDetailsByName(anime.title);
         if (anilistInfo) {
             return {
                 ...anime,
                 image: anilistInfo.bannerImage || anilistInfo.coverImage?.extraLarge || anime.image,
                 coverImage: anilistInfo.coverImage?.extraLarge || anime.image
             };
         }
         return anime;
      }));
      
      setSpotlightAnimes([...enhancedTrending, ...(flvTrending || []).slice(5)]);
      setLatestEpisodes(flvRecent || []);
      setLoadingPrimary(false);

      await new Promise(r => setTimeout(r, 150));
      setLoadingSecondary(false);

      try {
        const latino = await tioanimeService.getLatestAnimes();
        if (latino && Array.isArray(latino)) {
          setLatinoAnimes(latino.slice(0, 20).map(a => ({ ...a, preferredProvider: 'animeflv' })));
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
  }, []);

  const handleRefresh = async (event: any) => {
    await fetchHomeData();
    event.detail.complete();
  };

  const handleSearch = async (val: string) => {
    setQuery(val);
    if (val.length > 2) {
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
                <span style={{ fontWeight: 900, fontSize: '1.1rem', color: '#fff', letterSpacing: '0.5px' }}>Haus<span style={{ color: 'var(--ion-color-primary)' }}>Anime</span></span>
                <span style={{ fontSize: '0.6rem', fontWeight: 700, color: 'rgba(255,255,255,0.4)', letterSpacing: '2px' }}>PREMIUM</span>
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
                          onClick={() => router.push(`/anime/${anime.id}`)}
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
                              onClick={() => router.push(`/anime/${spotlight.id}`)}
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
                              anime={{ id: ep.animeId || ep.id, title: ep.animeName || ep.title, image: ep.animePoster || ep.image, hasSub: true }} 
                              onClick={() => router.push(`/anime/${ep.animeId || ep.id}`)}
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
                   <IonButton fill="solid" color="primary" onClick={() => router.push('/browse-anime')} style={{ '--border-radius': '15px', fontWeight: 900, height: '50px', paddingInline: '30px', boxShadow: '0 10px 25px rgba(var(--ion-color-primary-rgb), 0.3)' }}>
                      EXPLORAR TODO EL CATÁLOGO
                   </IonButton>
                </div>

                {/* FOOTER PROFESIONAL (PHASE 12) */}
                <footer className="page-footer">
                  <div className="footer-divider"></div>
                  <p>KamiReader • Animedex</p>
                  <span>Explora el universo Haus • v2.9</span>
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
