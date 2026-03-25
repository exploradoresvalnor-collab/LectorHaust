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
import { aniwatchService, HomeData, AnimeSearchResult } from '../services/aniwatchService';
import { animeflvService } from '../services/animeflvService';
import { tioanimeService } from '../services/tioanimeService';
import { hapticsService } from '../services/hapticsService';
import SmartImage from '../components/SmartImage';
import AnimeCardItem from '../components/AnimeCardItem';
import './AnimePage.css'; 

const AnimePage: React.FC = () => {
  const [homeData, setHomeData] = useState<HomeData | null>(null);
  const [latinoAnimes, setLatinoAnimes] = useState<any[]>([]);
  const [searchResults, setSearchResults] = useState<AnimeSearchResult[]>([]);
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
      // FASE 1: Hero + Tendencias (datos principales)
      const data = await aniwatchService.getHomeData();
      setHomeData(data);
      setLoadingPrimary(false);

      // FASE 2: Revelar Nuevos Episodios con micro-delay para render progresivo
      await new Promise(r => setTimeout(r, 150));
      setLoadingSecondary(false);

      // FASE 3: Latino (fetch separado) + Top Populares
      try {
        // En lugar de una búsqueda ruidosa, usamos los últimos animes de TioAnime (que son 100% español)
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
      const results = await aniwatchService.searchAnime(val);
      setSearchResults(results);
      setSearchLoading(false);
    } else {
      setSearchResults([]);
    }
  };

  const spotlight = homeData?.spotlightAnimes?.[0]; // Best hero anime

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
            <IonButton fill="clear" onClick={() => router.push('/anime-directory')} style={{ '--color': 'var(--ion-color-primary)' }}>
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
               <IonGrid>
                <IonRow>
                  {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                    <IonCol size="6" sizeSm="4" sizeMd="3" key={i}>
                      <div className="skeleton-card">
                        <IonSkeletonText animated style={{ height: '220px', borderRadius: '15px', marginBottom: '10px' }} />
                      </div>
                    </IonCol>
                  ))}
                </IonRow>
              </IonGrid>
            ) : searchResults.length > 0 ? (
              <IonGrid>
                <IonRow>
                  {searchResults.map((anime) => (
                    <IonCol size="6" sizeSm="4" sizeMd="3" sizeLg="2" key={anime.id}>
                      <div className="vertical-card" onClick={() => router.push(`/anime/${anime.id}`)}>
                        <div className="vertical-card-image">
                          <SmartImage src={anime.image || ''} alt={anime.title || 'Anime'} />
                          <div className="play-overlay"><IonIcon icon={playCircleOutline} /></div>
                        </div>
                        <p className="vertical-card-title">{anime.title}</p>
                      </div>
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
                        <p className="hero-desc-main">Sé el primero en ver los estrenos de esta temporada. Calidad premium y velocidad inigualable.</p>
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
                  <IonGrid style={{ padding: '0' }}>
                    <IonRow>
                      {[1,2,3,4,5,6,7,8,9,12].map(i => (
                        <IonCol size="6" sizeSm="3" sizeMd="2" key={i} style={{ padding: '6px' }}>
                          <IonSkeletonText animated style={{ aspectRatio: '3/4', borderRadius: '12px', width: '100%' }} />
                        </IonCol>
                      ))}
                    </IonRow>
                  </IonGrid>
                ) : (
                  <IonGrid style={{ padding: '0' }}>
                    <IonRow>
                      {homeData?.latestEpisodeAnimes?.map((ep, idx) => (
                        <IonCol size="6" sizeSm="3" sizeMd="2" key={'ep-'+ep.id+idx} style={{ padding: '6px' }}>
                          <AnimeCardItem 
                            anime={{ ...ep, hasSub: true }} 
                            onClick={() => router.push(`/anime/${ep.id}`)}
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
