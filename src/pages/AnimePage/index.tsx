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
  sparklesOutline,
  starOutline,
  informationCircleOutline,
  optionsOutline
} from 'ionicons/icons';

import { tioanimeService } from '../../services/tioanimeService';
import { anilistService } from '../../services/anilistService';
import { hapticsService } from '../../services/hapticsService';
import { proxifyImage } from '../../utils/imageUtils';
import AnimeCardItem from '../../components/AnimeCardItem';
import HausSkeleton from '../../components/HausSkeleton';
import '../../theme/CinematicHero.css';
import './styles.css'; 

const AnimePage: React.FC = () => {
  const [spotlightAnimes, setSpotlightAnimes] = useState<any[]>([]);
  const [latestEpisodes, setLatestEpisodes] = useState<any[]>([]);
  const [latinoAnimes, setLatinoAnimes] = useState<any[]>([]);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [loadingPrimary, setLoadingPrimary] = useState(true);    // Hero + Tendencias
  const [loadingSecondary, setLoadingSecondary] = useState(true); // Nuevos Episodios
  const [loadingTertiary, setLoadingTertiary] = useState(true);   // Latino + Populares
  const [activeFilter, setActiveFilter] = useState<'all' | 'latino' | 'sub'>('all');
  const [searchLoading, setSearchLoading] = useState(false);
  const [query, setQuery] = useState('');
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
        try {
          const { data, timestamp } = JSON.parse(cached);
          if (Date.now() - timestamp < HERO_CACHE_TTL && data?.length > 0) {
            setSpotlightAnimes(data);
            setLoadingPrimary(false);
          }
        } catch (e) {}
      }
    } catch (e) {}

    try {
      let [trendingAnimes, recentEpisodes] = await Promise.all([
          tioanimeService.getLatestAnimes(),
          tioanimeService.getLatestEpisodes()
      ]);
      
      const finalSpotlight = [...(trendingAnimes || [])];
      setSpotlightAnimes(finalSpotlight);
      setLatestEpisodes(recentEpisodes || []);
      setLoadingPrimary(false);
      setLoadingSecondary(false);

      // Background enrichment: Hero spotlight + Episode covers
      const topTrending = finalSpotlight.slice(0, 5);
      
      (async () => {
        try {
          // --- Enrich Hero Spotlight with AniList HD ---
          const enhancedTrending: any[] = [];
          for (const anime of topTrending) {
             try {
                 const anilistInfo = await anilistService.getAnimeDetailsByName(anime.title);
                 if (anilistInfo) {
                     const data = { ...anime };
                     // CRITICAL: Separate banner (panoramic) from cover (poster)
                     (data as any).bannerImage = anilistInfo.bannerImage || null;
                     (data as any).coverImage = anilistInfo.coverImage?.extraLarge || anilistInfo.coverImage?.large || null;
                     // image = poster for cards, banner for hero bg
                     data.image = (data as any).coverImage || data.image;
                     data.description = anilistInfo.description || data.description;
                     (data as any).rating = anilistInfo.averageScore ? `${anilistInfo.averageScore}%` : (data as any).rating;
                     enhancedTrending.push(data);
                 } else {
                     enhancedTrending.push(anime);
                 }
             } catch (e) {
                 enhancedTrending.push(anime);
             }
             await new Promise(r => setTimeout(r, 500));
          }
          
          if (enhancedTrending.length > 0) {
              setSpotlightAnimes(prev => {
                  const updated = [...prev];
                  for (let i = 0; i < enhancedTrending.length; i++) {
                      updated[i] = enhancedTrending[i];
                   }
                  return updated;
              });
              try {
                localStorage.setItem(HERO_CACHE_KEY, JSON.stringify({
                  data: enhancedTrending,
                  timestamp: Date.now()
                }));
              } catch { /* storage full */ }
          }

          // --- Enrich Episode Cards with AniList HD Posters ---
          const enrichedEps: any[] = [...(recentEpisodes || [])];
          const enrichedNames = new Set<string>();
          for (let i = 0; i < enrichedEps.length; i++) {
            const ep = enrichedEps[i];
            const name = ep.animeName || ep.title;
            if (!name || enrichedNames.has(name)) continue;
            enrichedNames.add(name);
            try {
              const info = await anilistService.getAnimeDetailsByName(name);
              if (info?.coverImage?.extraLarge) {
                // Apply HD poster to ALL episodes of this anime
                for (let j = i; j < enrichedEps.length; j++) {
                  if ((enrichedEps[j].animeName || enrichedEps[j].title) === name) {
                    enrichedEps[j] = { ...enrichedEps[j], animePoster: info.coverImage.extraLarge };
                  }
                }
              }
            } catch {}
            await new Promise(r => setTimeout(r, 600));
          }
          setLatestEpisodes([...enrichedEps]);
        } catch (e) {}
      })();

      try {
        if (activeFilter === 'latino') {
          const latino = await tioanimeService.getLatestAnimes();
          setLatinoAnimes(latino.map(a => ({ ...a, language: 'latino', hasDub: true })));
        }
      } catch { /* Latino es opcional */ }
      setLoadingTertiary(false);
    } catch (err) {
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
      const trending = await anilistService.getTrendingAnime();
      setSpotlightAnimes(trending.slice(0, 5));
      setLoadingPrimary(false);
      setSearchLoading(true);
      const results = await tioanimeService.search(val);
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

        <div className="search-layout-container">
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
                    <IonCol size="6" sizeSm="6" sizeMd="4" style={{ flex: '0 0 20%', maxWidth: '20%' }} className="ion-hide-md-down" key={anime.id}>
                       <AnimeCardItem 
                          anime={anime} 
                          onClick={() => router.push(`/anime/${anime.id}`, 'forward', 'push', { anime } as any)}
                          index={idx}
                       />
                    </IonCol>
                  ))}
                  {searchResults.map((anime, idx) => (
                    <IonCol size="6" sizeSm="6" sizeMd="4" className="ion-hide-lg-up" key={anime.id + '_mobile'}>
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
                <HausSkeleton type="hero" />
            ) : spotlight ? (
                <div className="hero-spotlight animate-fade-in">
                    {/* Background: Use bannerImage (panoramic HD) if available, else blur the cover */}
                    {spotlight.bannerImage ? (
                      <img 
                        src={proxifyImage(spotlight.bannerImage)} 
                        alt={spotlight.title} 
                        className="hero-bg-img" 
                        loading="eager" 
                        fetchPriority="high"
                        decoding="sync"
                        onError={(e: any) => { e.target.style.display = 'none'; }}
                      />
                    ) : (
                      <img 
                        src={spotlight.coverImage ? proxifyImage(spotlight.coverImage) : (spotlight.image ? proxifyImage(spotlight.image) : '')} 
                        alt={spotlight.title} 
                        className="hero-bg-img hero-bg-fallback" 
                        loading="eager" 
                        fetchPriority="high"
                        decoding="sync"
                        onError={(e: any) => { e.target.style.display = 'none'; }}
                      />
                    )}
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
            <div className="catalog-sections animate-fade-in" style={{ marginTop: '-30px', position: 'relative', zIndex: 10, paddingBottom: '30px' }}>
              <div className="main-content-wrapper">
                
                {/* FILTER CHIPS */}
                <div className="discovery-filters-v2" style={{ display: 'flex', gap: '8px', marginBottom: '25px', overflowX: 'auto', paddingBottom: '10px', scrollbarWidth: 'none' }}>
                  <IonButton 
                    fill={activeFilter === 'all' ? 'solid' : 'outline'} 
                    size="small"
                    shape="round"
                    onClick={() => setActiveFilter('all')}
                    className="anime-filter-btn"
                  >
                    🚀 GLOBAL
                  </IonButton>
                  <IonButton 
                    fill={activeFilter === 'sub' ? 'solid' : 'outline'} 
                    size="small"
                    shape="round"
                    onClick={() => setActiveFilter('sub')}
                    className="anime-filter-btn"
                  >
                    🇯🇵 SUB
                  </IonButton>
                  <IonButton 
                    fill={activeFilter === 'latino' ? 'solid' : 'outline'} 
                    size="small"
                    shape="round"
                    onClick={() => setActiveFilter('latino')}
                    className="anime-filter-btn"
                  >
                    🇲🇽 LATINO
                  </IonButton>
                </div>

                {/* === GRID DE NOVEDADES (PARRILLA DE CUADROS) === */}
                <div className="catalog-row section-visible" style={{ marginTop: '0', animationDelay: '0.1s' }}>
                  <div className="section-header" style={{ marginBottom: '20px' }}>
                    <div className="accent-bar" style={{ background: 'var(--ion-color-primary)' }}></div>
                    <h2 className="section-title">Últimas Actualizaciones</h2>
                    <IonBadge color="primary" mode="ios" style={{ marginLeft: '10px' }}>NUEVO</IonBadge>
                  </div>
                  
                  {loadingSecondary ? (
                    <HausSkeleton type="grid" count={12} />
                  ) : (
                    <IonGrid className="anime-grid-v">
                      <IonRow className="anime-row-v">
                        {(() => {
                          const list = activeFilter === 'all' ? latestEpisodes : 
                                       activeFilter === 'latino' ? latinoAnimes : 
                                       latestEpisodes.filter(ep => !ep.animeName?.toLowerCase().includes('latino'));
                          
                          return list.map((ep, idx) => (
                            <React.Fragment key={'ep-'+(ep.id || ep.animeId)+idx}>
                              <IonCol size="6" sizeSm="6" sizeMd="4" style={{ flex: '0 0 20%', maxWidth: '20%' }} className="ion-hide-md-down">
                                <AnimeCardItem 
                                  anime={{ 
                                    ...ep, 
                                    id: ep.animeId || ep.id, 
                                    title: ep.animeName || ep.title, 
                                    image: ep.animePoster || ep.image, 
                                    hasSub: activeFilter !== 'latino',
                                    hasDub: activeFilter === 'latino' || ep.animeName?.toLowerCase().includes('latino')
                                  }} 
                                  onClick={() => router.push(`/anime/${ep.animeId || ep.id}`, 'forward', 'push', { anime: ep } as any)}
                                  index={idx}
                                  showEpisode={true}
                                />
                              </IonCol>
                              <IonCol size="6" sizeSm="6" sizeMd="4" className="ion-hide-lg-up">
                                <AnimeCardItem 
                                  anime={{ 
                                    ...ep, 
                                    id: ep.animeId || ep.id, 
                                    title: ep.animeName || ep.title, 
                                    image: ep.animePoster || ep.image, 
                                    hasSub: activeFilter !== 'latino',
                                    hasDub: activeFilter === 'latino' || ep.animeName?.toLowerCase().includes('latino')
                                  }} 
                                  onClick={() => router.push(`/anime/${ep.animeId || ep.id}`, 'forward', 'push', { anime: ep } as any)}
                                  index={idx}
                                  showEpisode={true}
                                />
                              </IonCol>
                            </React.Fragment>
                          ));
                        })()}
                      </IonRow>
                    </IonGrid>
                  )}
                </div>

                <div style={{ display: 'flex', justifyContent: 'center', margin: '30px 0' }}>
                   <IonButton fill="solid" color="primary" onClick={() => router.push('/browse-anime')} style={{ '--border-radius': '15px', fontWeight: 900, height: '48px', paddingInline: '28px', '--box-shadow': '0 10px 25px rgba(var(--ion-color-primary-rgb), 0.3)', fontSize: '0.95rem' }}>
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
        </div>
      </IonContent>
    </IonPage>
  );
};

export default AnimePage;
