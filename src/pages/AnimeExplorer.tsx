import React, { useState, useEffect } from 'react';
import {
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar,
  IonSearchbar,
  IonButton,
  IonSpinner,
  IonCard,
  IonCardContent,
  useIonRouter,
  IonSegment,
  IonSegmentButton,
  IonLabel,
} from '@ionic/react';
import { animeflvService } from '../services/animeflvService';
import AnimeCardItem from '../components/AnimeCardItem';
import VideoPlayer from '../components/VideoPlayer';
import './AnimeExplorer.css';

const AnimeExplorer: React.FC = () => {
  const router = useIonRouter();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedAnime, setSelectedAnime] = useState<any | null>(null);
  const [animeInfo, setAnimeInfo] = useState<any | null>(null);
  const [infoLoading, setInfoLoading] = useState(false);
  const [apiLog, setApiLog] = useState<string[]>([]);
  const [trending, setTrending] = useState<any[]>([]);
  const [trendingLoading, setTrendingLoading] = useState(true);
  const [recentEpisodes, setRecentEpisodes] = useState<any[]>([]);
  const [recentLoading, setRecentLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'search' | 'trending' | 'recent' | 'commands'>('search');
  const [playingEpisode, setPlayingEpisode] = useState<any | null>(null);
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);

  const GENRES = [
    'accion', 'aventuras', 'comedia', 'drama', 'recuentos-de-la-vida', 
    'ecchi', 'fantasia', 'magia', 'sobrenatural', 'horror', 'misterio', 
    'psicologico', 'romance', 'ciencia-ficcion', 'mecha', 'deportes', 
    'escolar', 'shounen'
  ];

  const addLog = (msg: string) => {
    setApiLog(prev => [...prev.slice(-9), `[${new Date().toLocaleTimeString()}] ${msg}`]);
  };

  // Cargar tendencias al iniciar
  useEffect(() => {
    loadTrending();
  }, []);

  useEffect(() => {
    if (activeTab === 'recent' && recentEpisodes.length === 0 && !recentLoading) {
      loadRecentEpisodes();
    }
  }, [activeTab]);

  const loadTrending = async () => {
    setTrendingLoading(true);
    addLog('📍 Cargando anime en tendencia...');
    try {
      const response = await animeflvService.getTrendingAnime();
      addLog(`✅ Tendencias cargadas: ${response.length} animes`);
      setTrending(response);
    } catch (error) {
      addLog(`❌ Error cargando tendencias: ${error}`);
    } finally {
      setTrendingLoading(false);
    }
  };

  const loadRecentEpisodes = async () => {
    setRecentLoading(true);
    addLog('📍 Cargando últimos capítulos agregados...');
    try {
      const response = await animeflvService.getRecentEpisodes();
      addLog(`✅ Capítulos recientes cargados: ${response.length} episodios`);
      setRecentEpisodes(response);
    } catch (error) {
      addLog(`❌ Error cargando capítulos: ${error}`);
    } finally {
      setRecentLoading(false);
    }
  };

  const handleSearch = async (searchQuery: string) => {
    if (!searchQuery || searchQuery.length < 2) {
      setResults([]);
      return;
    }

    setLoading(true);
    addLog(`📍 Buscando: "${searchQuery}"`);

    try {
      const response = await animeflvService.search(searchQuery);
      addLog(`✅ Búsqueda completada: ${response.length} resultados`);
      setResults(response);
    } catch (error) {
      addLog(`❌ Error en búsqueda: ${error}`);
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAdvancedSearch = async () => {
    if ((!query || query.length < 2) && selectedGenres.length === 0) return;
    
    setLoading(true);
    addLog(`🔎 Búsqueda avanzada: "${query}" | Géneros: ${selectedGenres.length}`);
    
    try {
      const response = await animeflvService.search(query, selectedGenres);
      addLog(`✅ Búsqueda avanzada: ${response.length} resultados`);
      setResults(response);
    } catch (error) {
      addLog(`❌ Error: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAnime = async (anime: any) => {
    setSelectedAnime(anime);
    setAnimeInfo(null);
    setInfoLoading(true);

    addLog(`📍 Obteniendo info de: "${anime.title || anime.name}"`);
    addLog(`   ID: ${anime.id}`);

    try {
      const info = await animeflvService.getAnimeInfo(anime.id);
      addLog(`✅ Info obtenida`);
      console.log('Anime Info Response:', info);
      setAnimeInfo(info);
    } catch (error) {
      addLog(`❌ Error obteniendo info: ${error}`);
      console.error('Info error:', error);
    } finally {
      setInfoLoading(false);
    }
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar color="primary">
          <IonTitle>🎬 Anime Haus</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent className="anime-explorer">
        <div style={{ padding: '15px' }}>
          {/* TAB NAVIGATION */}
          <IonSegment value={activeTab} onIonChange={(e) => setActiveTab(e.detail.value as any)}>
            <IonSegmentButton value="search">
              <IonLabel>🔍 Búsqueda</IonLabel>
            </IonSegmentButton>
            <IonSegmentButton value="trending">
              <IonLabel>🔥 Tendencias</IonLabel>
            </IonSegmentButton>
            <IonSegmentButton value="recent">
              <IonLabel>📺 Últ. Caps</IonLabel>
            </IonSegmentButton>
            <IonSegmentButton value="commands">
              <IonLabel>⚙️ Comandos</IonLabel>
            </IonSegmentButton>
          </IonSegment>
        </div>
        {/* SEARCH TAB */}
        {activeTab === 'search' && (
          <div className="search-section">
            <IonSearchbar
              value={query}
              onIonInput={(e) => setQuery(e.detail.value || '')}
              placeholder="Busca un anime..."
              debounce={500}
            />
            {/* Genre Chips */}
            <div style={{ display: 'flex', overflowX: 'auto', gap: '8px', padding: '0 10px 15px', scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}>
              {GENRES.map(g => (
                <IonButton 
                  key={g} 
                  size="small" 
                  fill={selectedGenres.includes(g) ? 'solid' : 'outline'} 
                  color="tertiary"
                  style={{ textTransform: 'capitalize', flexShrink: 0 }}
                  onClick={() => {
                     const newG = selectedGenres.includes(g) ? selectedGenres.filter(x=>x!==g) : [...selectedGenres, g];
                     setSelectedGenres(newG);
                  }}
                >
                  {g.replace(/-/g, ' ')}
                </IonButton>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <IonButton
                expand="block"
                onClick={() => handleSearch(query)}
                disabled={(query.length < 2 && selectedGenres.length === 0) || loading}
              >
                {loading ? <IonSpinner name="crescent" /> : '🔍 Búsqueda Normal'}
              </IonButton>
              <IonButton
                expand="block"
                onClick={() => handleAdvancedSearch()}
                disabled={(query.length < 2 && selectedGenres.length === 0) || loading}
                color="secondary"
              >
                🔎 Búsqueda Avanzada
              </IonButton>
            </div>
          </div>
        )}

        {/* TRENDING TAB */}
        {activeTab === 'trending' && (
          <div className="trending-section">
            <h2>🔥 Animes en Tendencia</h2>
            {trendingLoading ? (
              <div style={{ textAlign: 'center', padding: '40px' }}>
                <IonSpinner />
                <p>Cargando tendencias...</p>
              </div>
            ) : (
              <div className="results-grid">
                {trending.map((anime, idx) => (
                  <AnimeCardItem
                    key={anime.id || idx}
                    anime={anime}
                    onClick={() => {
                      handleSelectAnime(anime);
                      setActiveTab('search');
                    }}
                    index={idx}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* RECENT EPISODES TAB */}
        {activeTab === 'recent' && (
          <div className="recent-section">
            <h2>📺 Últimos Capítulos Agregados</h2>
            {!recentLoading && recentEpisodes.length === 0 ? (
              <IonButton expand="block" onClick={loadRecentEpisodes} color="primary" style={{ marginTop: '20px' }}>
                ⚡ Cargar Últimos Capítulos
              </IonButton>
            ) : recentLoading ? (
              <div style={{ textAlign: 'center', padding: '40px' }}>
                <IonSpinner />
                <p>Cargando capítulos recientes...</p>
              </div>
            ) : (
              <div>
                <IonButton expand="block" onClick={loadRecentEpisodes} color="secondary" style={{ marginBottom: '20px' }}>
                  🔄 Recargar
                </IonButton>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                  {recentEpisodes.map((ep, idx) => (
                    <IonCard key={ep.id || idx} style={{ margin: '0' }}>
                      <div style={{ display: 'flex', gap: '15px', padding: '15px' }}>
                        {/* Portada del anime */}
                        <img
                          src={ep.animePoster || 'https://via.placeholder.com/100x140?text=No+Image'}
                          alt={ep.animeName}
                          style={{
                            width: '80px',
                            height: '110px',
                            objectFit: 'cover',
                            borderRadius: '6px',
                            flexShrink: 0
                          }}
                        />
                        {/* Info del capítulo */}
                        <div style={{ flex: 1 }}>
                          <h4 style={{ margin: '0 0 5px 0', fontSize: '0.95rem' }}>
                            {ep.animeName}
                          </h4>
                          <div style={{
                            background: 'rgba(140, 82, 255, 0.2)',
                            padding: '6px 10px',
                            borderRadius: '4px',
                            marginBottom: '8px',
                            display: 'inline-block'
                          }}
                          >
                            <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: 'var(--ion-color-primary)' }}>
                              Ep. {ep.number}
                            </span>
                          </div>
                          <p style={{ margin: '5px 0 0 0', fontSize: '0.85rem', color: '#aaa' }}>
                            {ep.title}
                          </p>
                          <IonButton
                            size="small"
                            fill="outline"
                            onClick={() => {
                              setSelectedAnime({ id: ep.animeId, name: ep.animeName, image: ep.animePoster });
                              setActiveTab('search');
                            }}
                            style={{ marginTop: '8px' }}
                          >
                            Ver Anime
                          </IonButton>
                        </div>
                      </div>
                    </IonCard>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* COMMANDS TAB */}
        {activeTab === 'commands' && (
          <div className="commands-section">
            <h2>⚙️ Comandos Disponibles</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', padding: '15px' }}>
              <IonCard>
                <IonCardContent>
                  <h4>1️⃣ Buscar Anime</h4>
                  <p>Busca animes por nombre</p>
                  <IonButton expand="block" onClick={() => setActiveTab('search')} color="primary">
                    Ir a búsqueda
                  </IonButton>
                </IonCardContent>
              </IonCard>

              <IonCard>
                <IonCardContent>
                  <h4>2️⃣ Obtener Información</h4>
                  <p>Obtiene detalles completos del anime (descripción, episodios, rating)</p>
                  <code style={{ fontSize: '0.8rem' }}>getAnimeInfo(animeId)</code>
                </IonCardContent>
              </IonCard>

              <IonCard>
                <IonCardContent>
                  <h4>3️⃣ Listar Episodios</h4>
                  <p>Obtiene todos los episodios disponibles</p>
                  <code style={{ fontSize: '0.8rem' }}>getEpisodes(animeId)</code>
                </IonCardContent>
              </IonCard>

              <IonCard>
                <IonCardContent>
                  <h4>4️⃣ Obtener Fuentes de Streaming</h4>
                  <p>Obtiene enlaces de reproducción para un episodio específico</p>
                  <code style={{ fontSize: '0.8rem' }}>getEpisodeSources(episodeId, server, category)</code>
                </IonCardContent>
              </IonCard>

              <IonCard>
                <IonCardContent>
                  <h4>5️⃣ Ver Tendencias</h4>
                  <p>Obtiene los animes más populares en este momento</p>
                  <IonButton expand="block" onClick={() => {
                    setActiveTab('trending');
                    loadTrending();
                  }} color="secondary">
                    Ver Tendencias
                  </IonButton>
                </IonCardContent>
              </IonCard>

              <IonCard>
                <IonCardContent>
                  <h4>6️⃣ Búsqueda Avanzada</h4>
                  <p>Busca con filtros avanzados (tipo, año, géneros, etc.)</p>
                  <code style={{ fontSize: '0.8rem' }}>advancedSearch(params)</code>
                </IonCardContent>
              </IonCard>

              <IonCard>
                <IonCardContent>
                  <h4>📊 Información Interna</h4>
                  <p><strong>Motor:</strong> Anime Haus Native Scraper</p>
                  <p><strong>Proveedor:</strong> AnimeFLV</p>
                  <p><strong>Formatos soportados:</strong> Iframe Directo (Cero bloqueos HTTP)</p>
                </IonCardContent>
              </IonCard>
            </div>
          </div>
        )}

        {/* RESULTS SECTION */}
        {activeTab === 'search' && results.length > 0 && !selectedAnime && (
          <div className="results-section">
            <h3>📺 Resultados de la búsqueda</h3>
            <div className="results-grid">
              {results.map((anime, idx) => (
                <AnimeCardItem
                  key={anime.id || idx}
                  anime={anime}
                  onClick={() => handleSelectAnime(anime)}
                  index={idx}
                />
              ))}
            </div>
          </div>
        )}

        {/* ANIME INFO SECTION */}
        {activeTab === 'search' && selectedAnime && (
          <div className="info-section animate-fade-in">
            <IonButton fill="clear" onClick={() => setSelectedAnime(null)} style={{ marginBottom: '10px' }}>
              ⬅ Volver a los resultados
            </IonButton>

            {infoLoading ? (
              <div style={{ textAlign: 'center', padding: '40px' }}>
                <IonSpinner name="crescent" />
                <p>Cargando información del anime...</p>
                <p style={{ fontSize: '0.85rem', color: '#aaa' }}>Obteniendo detalles e episodios</p>
              </div>
            ) : animeInfo && (
              <div className="anime-details-container">
                {/* Cabecera del Anime */}
                <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
                  <img
                    src={animeInfo.image}
                    alt={animeInfo.title}
                    style={{ width: '160px', height: '230px', objectFit: 'cover', borderRadius: '8px', boxShadow: '0 4px 10px rgba(0,0,0,0.3)' }}
                  />
                  <div style={{ flex: 1, minWidth: '250px' }}>
                    <h2 style={{ marginTop: 0, marginBottom: '5px' }}>{animeInfo.title}</h2>
                    <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
                      <span style={{ background: 'rgba(255,255,255,0.1)', padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem' }}>
                        Estado: {animeInfo.status}
                      </span>
                      <span style={{ background: 'rgba(255,255,255,0.1)', padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem' }}>
                        Episodios: {animeInfo.totalEpisodes}
                      </span>
                    </div>
                    
                    {/* Sinopsis con scroll si es muy larga */}
                    <div style={{ maxHeight: '120px', overflowY: 'auto', paddingRight: '10px', fontSize: '0.9rem', color: '#ccc', lineHeight: '1.5' }}>
                      {animeInfo.description}
                    </div>
                  </div>
                </div>

                {/* Lista de Episodios */}
                {animeInfo.episodes && animeInfo.episodes.length > 0 ? (
                  <div style={{ marginTop: '30px' }}>
                    <h3>🎬 Lista de Episodios ({animeInfo.episodes.length})</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '10px', marginTop: '15px' }}>
                      {animeInfo.episodes.map((ep: any, idx: number) => (
                        <div
                          key={ep.id || idx}
                          onClick={() => {
                            setPlayingEpisode({
                              id: ep.id || ep.episodeId,
                              number: ep.number,
                              title: ep.title || animeInfo.title
                            });
                          }}
                          style={{
                            background: 'rgba(140, 82, 255, 0.1)',
                            border: '2px solid rgba(140, 82, 255, 0.3)',
                            padding: '10px',
                            borderRadius: '8px',
                            textAlign: 'center',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease'
                          }}
                          className="episode-button hover-effect"
                          title={ep.title}
                        >
                          <div style={{ fontSize: '0.8rem', opacity: 0.8 }}>Ep.</div>
                          <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--ion-color-primary)' }}>{ep.number}</div>
                          {ep.title && (
                            <div style={{ fontSize: '0.65rem', opacity: 0.7, marginTop: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {ep.title}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div style={{ marginTop: '30px', padding: '20px', background: 'rgba(255,165,0,0.1)', borderRadius: '8px', border: '1px solid rgba(255,165,0,0.3)', textAlign: 'center' }}>
                    <p style={{ color: '#f39c12', fontWeight: 'bold', margin: '0 0 5px 0' }}>⚠️ Episodios no disponibles</p>
                    <p style={{ fontSize: '0.85rem', color: '#aaa', margin: 0 }}>Este anime aún no tiene episodios con streaming disponible</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* API LOG SECTION */}
        <div className="log-section">
          <h3>📡 API Log</h3>
          <div className="log-box">
            {apiLog.map((log, idx) => (
              <div key={idx} style={{ fontSize: '0.75rem', fontFamily: 'monospace', margin: '4px 0' }}>
                {log}
              </div>
            ))}
          </div>
        </div>
      </IonContent>

      {/* VIDEO PLAYER MODAL */}
      {playingEpisode && selectedAnime && (
        <VideoPlayer
          episodeId={playingEpisode.id}
          animeTitle={selectedAnime.title || selectedAnime.name}
          episodeNumber={playingEpisode.number}
          sourceProvider="animeflv"
          imageUrl={selectedAnime.image}
          onClose={() => setPlayingEpisode(null)}
        />
      )}
    </IonPage>
  );
};

export default AnimeExplorer;
