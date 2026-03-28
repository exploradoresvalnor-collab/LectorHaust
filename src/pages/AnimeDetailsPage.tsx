import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  IonContent, 
  IonHeader, 
  IonPage, 
  IonTitle,
  IonToolbar, 
  IonButtons, 
  IonBackButton, 
  IonSpinner, 
  IonBadge, 
  IonIcon, 
  IonButton,
  IonChip,
  IonLabel,
  IonSearchbar,
  useIonRouter
} from '@ionic/react';
import { 
  playCircleOutline, 
  starOutline,
  chevronBackOutline,
  chevronForwardOutline,
  closeOutline,
  playOutline,
  swapVerticalOutline,
  searchOutline,
  book,
  arrowForward,
  timeOutline,
  optionsOutline,
  sparklesOutline,
  playForwardOutline,
  alertCircleOutline
} from 'ionicons/icons';
import { useParams } from 'react-router-dom';
import { animeflvService } from '../services/animeflvService';
import { anilistService } from '../services/anilistService';
import LoadingScreen from '../components/LoadingScreen';
import SmartImage from '../components/SmartImage';
import './AnimeCommon.css';
import './AnimePage.css';
import VideoPlayer from '../components/VideoPlayer';
import CommentSection from '../components/CommentSection';
import UniversalEngagementBar from '../components/UniversalEngagementBar';
import { useCrossMedia } from '../hooks/useCrossMedia';
import { useLocation } from 'react-router-dom';
import { hianimeService } from '../services/hianimeService';

const EPISODES_PER_PAGE = 30;

const AnimeDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const router = useIonRouter();
  const location = useLocation();
  const epListRef = useRef<HTMLDivElement>(null);

  const [anime, setAnime] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedEpisode, setSelectedEpisode] = useState<any>(null);
  const [showPlayer, setShowPlayer] = useState(false);
  const [episodePage, setEpisodePage] = useState(0);
  const [episodeOrder, setEpisodeOrder] = useState<'desc' | 'asc'>('desc');
  const [episodeSearch, setEpisodeSearch] = useState('');
  const [sourceProvider, setSourceProvider] = useState<'hianime' | 'animeflv' | 'tioanime'>('animeflv');

  const { crossMedia, loadingCrossMedia } = useCrossMedia(anime?.title, 'ANIME');

  // Reset state when id changes (new anime page)
  useEffect(() => {
    const navData = (location.state as any)?.anime || (location.state as any)?.manga;
    
    // Reset all episode state
    setSelectedEpisode(null);
    setShowPlayer(false);
    setEpisodePage(0);
    setEpisodeSearch('');
    
    // Smart source detection
    const navSource = (navData?.source || navData?.preferredProvider) as string | undefined;
    const urlProvider = new URLSearchParams(window.location.search).get('provider');
    const detected = urlProvider || (navSource === 'hianime' ? 'hianime' : 'animeflv');
    setSourceProvider(detected as any);
    
    // Use navigation data as instant preview while fetching fresh data
    if (navData) {
      setAnime(navData);
      setLoading(false);
    } else {
      setAnime(null);
      setLoading(true);
    }
  }, [id]);

  // Monitor player close to scroll back
  useEffect(() => {
    if (!showPlayer && selectedEpisode && epListRef.current) {
        setTimeout(() => {
            epListRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 150);
    }
  }, [showPlayer]);

  useEffect(() => {
    const fetchAnime = async () => {
      if (!id) return;
      
      try {
        const provider = sourceProvider === 'hianime' ? hianimeService : animeflvService;
        
        const currentTitle = anime?.title || anime?.name;
        
        const [data, anilistInfo] = await Promise.all([
          provider.getAnimeInfo(id),
          currentTitle ? anilistService.getAnimeDetailsByName(currentTitle) : Promise.resolve(null)
        ]);
        
        if (data) {
           let finalAnilist = anilistInfo;
           if (!finalAnilist && data.title) {
              finalAnilist = await anilistService.getAnimeDetailsByName(data.title);
           }
           
           if (finalAnilist) {
              data.image = finalAnilist.bannerImage || finalAnilist.coverImage?.extraLarge || data.image;
              (data as any).coverImage = finalAnilist.coverImage?.extraLarge || data.image;
              data.description = finalAnilist.description || data.description;
              (data as any).rating = finalAnilist.averageScore ? `${finalAnilist.averageScore}%` : (data as any).rating;
           }
           setAnime(data);
        }
      } catch (err) {
        console.error("Failed to fetch anime info:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchAnime();
  }, [id, sourceProvider]);

  // Sorted & filtered episodes
  const sortedEpisodes = useMemo(() => {
    let eps = [...(anime?.episodes || [])];
    if (episodeOrder === 'desc') {
      eps.sort((a, b) => Number(b.number) - Number(a.number));
    } else {
      eps.sort((a, b) => Number(a.number) - Number(b.number));
    }
    // Apply search filter
    if (episodeSearch.trim()) {
      const q = episodeSearch.trim().toLowerCase();
      eps = eps.filter(ep =>
        String(ep.number).includes(q) ||
        (ep.title && ep.title.toLowerCase().includes(q))
      );
    }
    return eps;
  }, [anime?.episodes, episodeOrder, episodeSearch]);

  // Pagination logic
  const totalEpPages = Math.ceil(sortedEpisodes.length / EPISODES_PER_PAGE);
  const paginatedEpisodes = useMemo(() => {
    const start = episodePage * EPISODES_PER_PAGE;
    return sortedEpisodes.slice(start, start + EPISODES_PER_PAGE);
  }, [sortedEpisodes, episodePage]);

  // Reset page when order/search changes
  useEffect(() => {
    setEpisodePage(0);
  }, [episodeOrder, episodeSearch]);

  const handlePlayEpisode = (episode: any) => {
    setSelectedEpisode(episode);
    setShowPlayer(true);
  };

  if (loading) return <IonPage><LoadingScreen /></IonPage>;
  if (!anime) return <IonPage><IonContent className="anime-content-bg"><div style={{padding:'20px', textAlign:'center', color:'white'}}>Anime no encontrado</div></IonContent></IonPage>;

  return (
    <IonPage>
      <IonHeader className="ion-no-border glass-effect-header">
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/anime" style={{ color: 'white' }} />
          </IonButtons>
          <IonTitle style={{ textAlign: 'left', paddingLeft: '5px' }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <img src="/logolh.webp" width="24" height="24" style={{ filter: 'drop-shadow(0 0 8px rgba(var(--ion-color-primary-rgb), 0.6))' }} />
              <div style={{ marginLeft: '10px', display: 'flex', flexDirection: 'column', lineHeight: '1.1' }}>
                <span style={{ fontWeight: 900, fontSize: '1rem', color: '#fff', letterSpacing: '0.5px' }}>Lector<span style={{ color: 'var(--ion-color-primary)' }}>Haus</span></span>
                <span style={{ fontSize: '0.55rem', fontWeight: 700, color: 'rgba(255,255,255,0.4)', letterSpacing: '1px' }}>ANIME PREMIUM</span>
              </div>
            </div>
          </IonTitle>
          <IonButtons slot="end">
             <div className="header-search-box" style={{ maxWidth: '150px' }}>
                <IonSearchbar 
                  placeholder="Buscar..." 
                  className="header-custom-search"
                  onIonFocus={() => router.push('/browse-anime')}
                />
             </div>
             <IonButton fill="clear" onClick={() => router.push('/browse-anime')} style={{ '--color': 'var(--ion-color-primary)' }}>
               <IonIcon icon={searchOutline} />
             </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent fullscreen className="anime-content-bg">

        {/* ── VIDEO PLAYER OVERLAY ── */}
        {showPlayer && selectedEpisode && (
          <div className="anime-player-overlay" style={{ top: '56px', height: 'calc(100% - 56px)', paddingTop: '0' }}>
            <VideoPlayer
              episode={selectedEpisode}
              episodes={anime.episodes || []}
              animeTitle={anime.title || 'Anime'}
              animeId={id || ''}
              onEpisodeChange={(ep) => setSelectedEpisode(ep)}
              onClose={() => setShowPlayer(false)}
              sourceProvider={sourceProvider}
            />
          </div>
        )}

        {/* ── CINEMATIC HEADER ── */}
        {!showPlayer && (
          <>
            <div className="hero-spotlight animate-fade-in" style={{ height: '55vh', minHeight: '380px' }}>
              <img src={anime.image || 'https://placehold.co/1200x600/111111/444444?text=Lector+Haus+Premium'} alt="Banner" className="hero-bg-img" />
              <div className="hero-gradient"></div>
            </div>

            <div className="main-content-wrapper animate-fade-in">
              <div className="details-body">
                {/* ── HERO INFO (PHASE 11: Inside Container) ── */}
                <div className="details-hero-info">
                    <div className="hero-badges">
                      <IonBadge color="primary">{anime.status}</IonBadge>
                      {anime.rating && anime.rating !== 'N/A' && (
                          <IonBadge color="warning" style={{marginLeft: '8px'}}><IonIcon icon={starOutline} style={{marginRight: '4px'}}/> {anime.rating}</IonBadge>
                      )}
                    </div>
                    <h1 className="hero-title">{anime.title}</h1>
                    <p className="hero-description">
                      {anime.description}
                    </p>

                    {/* Embedded Text Suggestion */}
                    {!loadingCrossMedia && crossMedia && (
                      <div 
                        className="hero-embedded-suggestion animate-fade-in-up"
                        onClick={() => router.push(crossMedia.destinationUrl)}
                      >
                        <IonIcon icon={book} style={{ marginRight: '8px', color: '#3498db' }} />
                        <span>El manga de esta historia está disponible en nuestra app. <strong>Ir al Manga</strong></span>
                        <IonIcon icon={arrowForward} style={{ marginLeft: '10px', fontSize: '0.9rem', opacity: 0.6 }} />
                      </div>
                    )}
                </div>

                {/* ── EPISODE SECTION ── */}
                <div className="anime-ep-header" ref={epListRef}>
                  <h2 className="section-title">
                    Episodios
                  </h2>

                  {/* Controls Bar: Order Toggle + Search */}
                  <div className="anime-ep-controls">
                    <IonButton
                      fill="solid"
                      size="small"
                      className="ep-order-toggle"
                      onClick={() => setEpisodeOrder(o => o === 'desc' ? 'asc' : 'desc')}
                    >
                      <IonIcon icon={swapVerticalOutline} slot="start" />
                      {episodeOrder === 'desc' ? 'Mayor a menor' : 'Menor a mayor'}
                    </IonButton>

                    <IonSearchbar
                      value={episodeSearch}
                      onIonInput={(e: any) => setEpisodeSearch(e.detail.value || '')}
                      placeholder="Buscar ep..."
                      className="ep-search-bar"
                      debounce={200}
                    />
                  </div>

                  {/* Pagination Chips */}
                  {totalEpPages > 1 && (
                    <div className="anime-ep-pagination">
                      <IonButton fill="clear" size="small" disabled={episodePage === 0} onClick={() => setEpisodePage(p => p - 1)} className="ep-nav-btn">
                        <IonIcon icon={chevronBackOutline} />
                      </IonButton>

                      <div className="ep-range-chips">
                        {Array.from({ length: totalEpPages }, (_, i) => {
                          const s = i * EPISODES_PER_PAGE + 1;
                          const e = Math.min((i + 1) * EPISODES_PER_PAGE, sortedEpisodes.length);
                          return (
                            <IonChip
                              key={i}
                              className={`ep-range-chip ${i === episodePage ? 'active' : ''}`}
                              onClick={() => setEpisodePage(i)}
                            >
                              <IonLabel>{s}-{e}</IonLabel>
                            </IonChip>
                          );
                        })}
                      </div>

                      <IonButton fill="clear" size="small" disabled={episodePage >= totalEpPages - 1} onClick={() => setEpisodePage(p => p + 1)} className="ep-nav-btn">
                        <IonIcon icon={chevronForwardOutline} />
                      </IonButton>
                    </div>
                  )}
                </div>

                {/* Compact Episode Grid */}
                <div className="anime-ep-grid">
                    {paginatedEpisodes.map((ep) => (
                      <div
                        key={ep.id}
                        className={`anime-ep-card ${selectedEpisode?.id === ep.id ? 'playing' : ''}`}
                        onClick={() => handlePlayEpisode(ep)}
                      >
                        <div className="ep-card-thumb">
                          <SmartImage src={ep.image || (anime as any).coverImage || anime.image || ''} alt={`Ep ${ep.number}`} />
                          <div className="ep-card-number-badge">{ep.number}</div>
                          {ep.isFiller && <div className="ep-card-filler-tag">Filler</div>}
                        </div>
                        <div className="ep-card-info">
                          <div className="ep-card-main">
                            <span className="ep-card-title">{ep.title || `Episodio ${ep.number}`}</span>
                            <span className="ep-card-sub">HD • Sub</span>
                          </div>
                          <IonIcon icon={playCircleOutline} className="ep-card-play-icon" />
                        </div>
                      </div>
                    ))}
                  </div>

                {sortedEpisodes.length === 0 && !episodeSearch && (
                   <div style={{ textAlign: 'center', padding: '20px', color: '#888' }}>
                     No hay episodios disponibles actualmente.
                   </div>
                )}

                {sortedEpisodes.length === 0 && episodeSearch && (
                   <div style={{ textAlign: 'center', padding: '20px', color: '#888' }}>
                     No se encontraron episodios para "{episodeSearch}"
                   </div>
                )}

                {id && <UniversalEngagementBar contentId={id} title={anime.title || 'Anime'} type="anime" coverUrl={anime.image} />}
                {id && <CommentSection mangaId={id} title="El Muro Haus - Opiniones del Anime" />}

                {/* FOOTER PROFESIONAL (PHASE 12) */}
                <footer className="page-footer">
                  <div className="footer-content" style={{ textAlign: 'center' }}>
                    <p style={{ fontWeight: 800, letterSpacing: '2px', textTransform: 'uppercase', fontSize: '0.8rem', opacity: 0.7 }}>LectorHaus 2026</p>
                  </div>
                </footer>

              </div>
            </div>
          </>
        )}
      </IonContent>
    </IonPage>
  );
};

export default AnimeDetailsPage;
