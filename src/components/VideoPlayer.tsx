import React, { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import { IonButton, IonSpinner, IonText, IonIcon, IonBadge } from '@ionic/react';
import { 
  videocamOutline, chevronBackOutline, chevronForwardOutline, 
  alertCircleOutline, playBackOutline, playForwardOutline, arrowBackOutline,
  starOutline, informationCircleOutline, playCircleOutline, expandOutline
} from 'ionicons/icons';
import { animeflvService } from '../services/animeflvService';
import { tioanimeService } from '../services/tioanimeService';
import CommentSection from './CommentSection';

interface VideoPlayerProps {
  episode: any;
  episodes: any[];
  animeTitle: string;
  animeId: string;
  sourceProvider?: 'hianime' | 'animeflv' | 'tioanime';
  onEpisodeChange: (ep: any) => void;
  onClose: () => void;
}

interface Server {
  serverId: number;
  serverName: string;
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({
  episode,
  episodes,
  animeTitle,
  animeId,
  sourceProvider: initialSource,
  onEpisodeChange,
  onClose
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [sourceProvider, setSourceProvider] = useState<'hianime' | 'animeflv' | 'tioanime'>(initialSource || 'animeflv');
  const [flvId, setFlvId] = useState<string | null>(null);
  const [tioId, setTioId] = useState<string | null>(null);
  const [servers, setServers] = useState<{sub: Server[], dub: Server[]}>({sub: [], dub: []});
  const [selectedServer, setSelectedServer] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<'sub' | 'dub'>('sub');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [subtitles, setSubtitles] = useState<any[]>([]);
  const [iframeUrl, setIframeUrl] = useState<string | null>(null);
  const [availableProviders, setAvailableProviders] = useState<{hianime: boolean, animeflv: boolean, tioanime: boolean}>({
    hianime: true, // Siempre asumimos HiAnime como base
    animeflv: false,
    tioanime: false
  });

  const episodeNumber = Number(episode.number);
  const episodeId = episode.id;

  // 0. Detección Inteligente de disponibilidad (Una vez al montar)
  useEffect(() => {
    const checkProviders = async () => {
      if (!animeTitle) return;
      
      const checks = [
        animeflvService.search(animeTitle).then(res => res && res.length > 0).catch(() => false),
        tioanimeService.search(animeTitle).then(res => res && res.length > 0).catch(() => false)
      ];
      
      const [hasFlv, hasTio] = await Promise.all(checks);
      
      setAvailableProviders(prev => ({
        ...prev,
        animeflv: !!hasFlv,
        tioanime: !!hasTio
      }));

      // Si el proveedor inicial no está disponible, cambiar al primero que sí lo esté
      if (sourceProvider === 'animeflv' && !hasFlv) setSourceProvider('hianime');
      if (sourceProvider === 'tioanime' && !hasTio) setSourceProvider(hasFlv ? 'animeflv' : 'hianime');
    };
    
    checkProviders();
  }, [animeTitle]);

  // 1. Cargar servidores / Identificar Anime en Gogo
  useEffect(() => {
    if (!episodeId || !animeTitle) return;

    let active = true;

    const fetchServersData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        if (sourceProvider === 'hianime') {
          // HiAnime doesn't need pre-fetching servers for the embed, but we set a dummy one for UI consistency
          // Note: HiAnime can have DUB too.
          setServers({ sub: [{ serverId: 1, serverName: 'Servidor 1' }], dub: [{ serverId: 2, serverName: 'Server Dub' }] });
          setSelectedServer('Servidor 1');
          // No cambiamos setSelectedCategory aquí para respetar lo seleccionado
        } else if (sourceProvider === 'animeflv') {
          const results = await animeflvService.search(animeTitle);
          if (!active) return;
          if (results && results.length > 0) {
             setFlvId(results[0].id);
             const flvEpId = `${results[0].id}-${episodeNumber}`;
             const rawData = await animeflvService.getEpisodeSources(flvEpId);
             if (!active) return;
             if (rawData && rawData.sources.length > 0) {
                const subServers = rawData.sources.map((s: any, i: number) => ({ serverId: i, serverName: s.serverName }));
                setServers({ sub: subServers, dub: [] });
                setSelectedServer(subServers[0].serverName);
                setSelectedCategory('sub');
             } else {
                throw new Error('No se encontraron servidores en AnimeFLV.');
             }
          } else {
             throw new Error('No se encontró el anime en AnimeFLV.');
          }
        } else if (sourceProvider === 'tioanime') {
          const results = await tioanimeService.search(animeTitle);
          if (!active) return;
          if (results && results.length > 0) {
            setTioId(results[0].id);
            const tioEpId = `${results[0].id}-${episodeNumber}`;
            const rawData = await tioanimeService.getEpisodeSources(tioEpId);
            if (!active) return;
            if (rawData && rawData.sources.length > 0) {
              const subServers = rawData.sources.map((s: any, i: number) => ({ serverId: i, serverName: s.serverName }));
              setServers({ sub: subServers, dub: [] });
              setSelectedServer(subServers[0].serverName);
              setSelectedCategory('sub');
            } else {
               throw new Error('No se encontraron servidores en TioAnime.');
            }
          } else {
            throw new Error('No se encontró el anime en TioAnime.');
          }
        }
      } catch (err: any) {
        if (!active) return;
        setError(err.message || 'Error al configurar el proveedor');
      } finally {
        if (active) setLoading(false);
      }
    };

    fetchServersData();
    return () => { active = false; };
  }, [episodeId, sourceProvider, animeTitle, episodeNumber]);

  // 2. Cargar Stream
  useEffect(() => {
    if (!selectedServer || !episodeId) return;

    let active = true;

    const loadStreamData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        let data: any = null;
        if (sourceProvider === 'hianime') {
          const epIdMatch = episodeId.split('?ep=')[1];
          if (epIdMatch) {
            const catPath = selectedCategory === 'dub' ? 'dub' : 'sub';
            data = { sources: [{ url: `https://megaplay.buzz/stream/s-2/${epIdMatch}/${catPath}`, isIframe: true }], subtitles: [] };
          }
        } else if (sourceProvider === 'animeflv' && flvId) {
          const flvEpId = `${flvId}-${episodeNumber}`;
          const rawData = await animeflvService.getEpisodeSources(flvEpId);
          if (rawData && rawData.sources) {
             const matchedSource = rawData.sources.find((s: any) => s.serverName === selectedServer) || rawData.sources[0];
             data = { sources: [matchedSource], subtitles: [] };
          }
        } else if (sourceProvider === 'tioanime' && tioId) {
          const tioEpId = `${tioId}-${episodeNumber}`;
          const rawData = await tioanimeService.getEpisodeSources(tioEpId);
          if (rawData && rawData.sources) {
             const matchedSource = rawData.sources.find((s: any) => s.serverName === selectedServer) || rawData.sources[0];
             data = { sources: [matchedSource], subtitles: [] };
          }
        }

        if (!active) return;

        if (!data || (data.sources?.length === 0 && !data.length)) {
          throw new Error('Este servidor no devolvió fuentes de video.');
        }

        if (data && (data.sources?.length > 0 || data.length > 0)) {
          const sources = Array.isArray(data) ? data : data.sources;
          const streamUrl = sources[0].url;
          setSubtitles(data.subtitles || []);
          
          if (sources[0].isIframe || streamUrl.includes('streaming.php') || streamUrl.includes('embed')) {
            setIframeUrl(streamUrl);
          } else {
            setIframeUrl(null);
            initPlayer(streamUrl);
          }
        }
      } catch (err: any) {
        if (!active) return;
        setError(err.message || 'Fallo al cargar el video.');
      } finally {
        if (active) setLoading(false);
      }
    };

    loadStreamData();
    return () => { active = false; };
  }, [selectedServer, selectedCategory, episodeId, sourceProvider, flvId, tioId, episodeNumber]);

  const initPlayer = (url: string) => {
    if (!videoRef.current) return;
    if (hlsRef.current) hlsRef.current.destroy();

    if (Hls.isSupported()) {
      const hls = new Hls({ maxBufferLength: 30, enableWorker: true });
      hls.loadSource(url);
      hls.attachMedia(videoRef.current);
      hlsRef.current = hls;
    } else if (videoRef.current.canPlayType('application/vnd.apple.mpegurl')) {
      videoRef.current.src = url;
    }
  };

  useEffect(() => {
    return () => { if (hlsRef.current) hlsRef.current.destroy(); };
  }, []);

  // Lógica de Navegación
  const hasMultipleEps = episodes && episodes.length > 1;
  const currentIdx = episodes.findIndex(e => Number(e.number) === episodeNumber);
  // Nota: Array puede estar en orden desc (HiAnime) o asc.
  const isDesc = episodes.length > 1 && Number(episodes[0].number) > Number(episodes[1].number);

  const nextEp = isDesc 
    ? episodes[currentIdx - 1] // En desc, el siguiente (número mayor) está antes
    : episodes[currentIdx + 1]; // En asc, el siguiente está después
  
  const prevEp = isDesc 
    ? episodes[currentIdx + 1] 
    : episodes[currentIdx - 1];

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement && !(document as any).webkitFullscreenElement) {
        if (containerRef.current?.requestFullscreen) {
          await containerRef.current.requestFullscreen();
        } else if ((containerRef.current as any)?.webkitRequestFullscreen) {
          await ((containerRef.current as any).webkitRequestFullscreen());
        }
        try { if (screen.orientation && (screen.orientation as any).lock) await (screen.orientation as any).lock('landscape'); } catch(e){}
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else if ((document as any).webkitExitFullscreen) {
          await ((document as any).webkitExitFullscreen());
        }
        try { if (screen.orientation && (screen.orientation as any).unlock) (screen.orientation as any).unlock(); } catch(e){}
      }
    } catch (err) {
      console.warn('Error toggling fullscreen:', err);
    }
  };

  // Mapeo inteligente de nombres de servidores
  const getIntelligentName = (provider: string) => {
    switch(provider) {
      case 'hianime': return 'SERVER-ENGLISH';
      case 'animeflv': return 'SERVIDOR-AZUL';
      case 'tioanime': return 'SERVIDOR-NARANJA';
      default: return provider.toUpperCase();
    }
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', color: '#fff' }}>
      
      {/* 1. Options / Server Tabs (TOP - Integrated better) */}
      <div style={{ 
        background: 'rgba(0,0,0,0.2)', 
        padding: '10px 15px', 
        display: 'flex', 
        gap: '8px', 
        overflowX: 'auto', 
        borderBottom: '1px solid rgba(255,255,255,0.05)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)'
      }}>
         {['hianime', 'animeflv', 'tioanime']
           .filter(p => (availableProviders as any)[p])
           .map(p => (
           <div 
             key={p} 
             onClick={() => setSourceProvider(p as any)} 
             className={`player-tab ${sourceProvider === p ? 'active' : ''}`}
             style={{ 
               padding: '10px 18px', fontSize: '0.7rem', fontWeight: 900, cursor: 'pointer',
               background: sourceProvider === p ? 'var(--ion-color-primary)' : 'rgba(255,255,255,0.05)',
               color: sourceProvider === p ? '#000' : '#888',
               borderRadius: '10px', 
               transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', 
               flexShrink: 0,
               border: '1px solid ' + (sourceProvider === p ? 'transparent' : 'rgba(255,255,255,0.1)')
             }}
           >
             {getIntelligentName(p)}
           </div>
         ))}
      </div>

      {/* 2. Cinematic Video area */}
      <div 
        ref={containerRef}
        style={{ 
          width: '100%', maxWidth: '1000px', aspectRatio: '16 / 9', margin: '0 auto',
          background: '#000', position: 'relative'
      }}>
        {loading && <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10, background: 'rgba(0,0,0,0.6)' }}><IonSpinner name="crescent" color="primary" /></div>}
        
        {error ? (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '20px' }}>
            <IonText color="danger"><h4 style={{margin: '0 0 15px', fontWeight: 800}}>⚠️ {error}</h4></IonText>
            <div style={{ display: 'flex', gap: '10px' }}>
              <IonButton size="small" fill="solid" color="primary" onClick={() => window.location.reload()} style={{'--border-radius': '8px'}}>Reintentar</IonButton>
              <IonButton size="small" fill="outline" color="light" onClick={() => setSourceProvider('animeflv')} style={{'--border-radius': '8px'}}>Cambiar Servidor</IonButton>
            </div>
          </div>
        ) : iframeUrl ? (
          <div style={{ position: 'relative', width: '100%', height: '100%' }}>
            <iframe 
              title="Video Player" 
              src={iframeUrl} 
              className="iframe-player"
              style={{ width: '100%', height: '100%', border: 'none' }} 
              allowFullScreen 
              allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
              {...{ webkitallowfullscreen: "true", mozallowfullscreen: "true" }}
            />
            {/* Escudo para bloquear el logo/redirección de AnimeFLV */}
            <div 
              style={{
                position: 'absolute',
                top: '10px',
                right: '10px',
                width: '180px', /* Lo suficientemente ancho para tapar el logo completo */
                height: '70px',
                background: 'rgba(0,0,0,0.01)', /* Casi invisible pero intercepta clicks */
                zIndex: 50,
                pointerEvents: 'auto', /* Absorbe los clicks para que no pasen al iframe */
                cursor: 'default'
              }}
              title="Protección activa vs redirecciones"
            />
          </div>
        ) : (
          <video ref={videoRef} controls autoPlay style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
        )}
      </div>

      {/* 3. Controls & Actions (BELOW THE VIDEO) */}
      <div className="video-details-container">
        
        {/* Subtle Branding Watermark */}
        <div style={{ 
          position: 'absolute', right: '-20px', bottom: '-15px', opacity: 0.04, 
          fontSize: '4.5rem', fontWeight: 900, pointerEvents: 'none', color: '#fff',
          transform: 'rotate(-5deg)', userSelect: 'none'
        }}>Lector Haus</div>

        {/* Title & Close Logic (PREMIUM STYLE BELOW VIDEO) */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '25px', paddingBottom: '20px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
           <div>
              <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 900, letterSpacing: '-0.5px', color: '#fff' }}>
                {animeTitle}
              </h2>
              <div style={{ fontSize: '0.8rem', color: 'var(--ion-color-primary)', fontWeight: 800, marginTop: '5px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                 EPISODIO {episodeNumber} <span style={{ color: 'rgba(255,255,255,0.3)', margin: '0 8px' }}>|</span> <span style={{ color: '#888' }}>{getIntelligentName(sourceProvider)}</span>
              </div>
           </div>
           <div style={{ display: 'flex', gap: '8px' }}>
              <IonButton fill="clear" onClick={toggleFullscreen} style={{'--color': '#fff', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', fontWeight: 800, height: '40px', width: '45px'}} title="Pantalla Completa">
                 <IonIcon icon={expandOutline} />
              </IonButton>
              <IonButton fill="clear" onClick={onClose} style={{'--color': '#fff', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', fontWeight: 800, height: '40px'}}>
                 <IonIcon icon={chevronBackOutline} slot="start" /> VOLVER
              </IonButton>
           </div>
        </div>

        <div className="video-action-buttons">
           <div style={{ display: 'flex', gap: '12px' }}>
              <IonButton size="small" fill="solid" color="dark" disabled={!prevEp} onClick={() => onEpisodeChange(prevEp)} style={{'--border-radius': '12px', height: '45px', width: '50px', fontWeight: 800}}>
                 <IonIcon icon={chevronBackOutline} />
              </IonButton>
              <IonButton size="small" fill="solid" color="primary" disabled={!nextEp} onClick={() => onEpisodeChange(nextEp)} style={{'--border-radius': '12px', height: '45px', paddingInline: '20px', fontWeight: 900, fontSize: '0.8rem', '--box-shadow': '0 8px 20px rgba(var(--ion-color-primary-rgb), 0.3)'}}>
                 SIGUIENTE EPISODIO <IonIcon slot="end" icon={chevronForwardOutline} />
              </IonButton>
           </div>
           
           <div style={{ display: 'flex', gap: '10px' }}>
              <IonButton size="small" fill="clear" color="medium" style={{'--border-radius': '10px', fontWeight: 700, fontSize: '0.75rem', height: '45px'}}>
                 REPORTAR ERROR
              </IonButton>
              <IonButton size="small" fill="solid" color="secondary" style={{'--border-radius': '12px', height: '45px', paddingInline: '20px', fontWeight: 800, fontSize: '0.75rem'}}>
                 DESCARGAR <IonIcon slot="end" icon={alertCircleOutline} style={{ opacity: 0.5 }} />
              </IonButton>
           </div>
        </div>

        {/* 4. Sub / Dub Selector */}
        <div style={{ marginTop: '20px', display: 'flex', gap: '8px', alignItems: 'center' }}>
           <span style={{ fontSize: '0.65rem', fontWeight: 800, color: '#444' }}>AUDIO:</span>
           <div 
             onClick={() => setSelectedCategory('sub')} 
             className={`filter-chip ${selectedCategory === 'sub' ? 'active' : ''}`} 
             style={{ fontSize: '0.65rem', padding: '5px 12px' }}
           >
             SUB ESP
           </div>
           { (sourceProvider === 'hianime' || servers.dub.length > 0) && (
             <div 
               onClick={() => setSelectedCategory('dub')} 
               className={`filter-chip ${selectedCategory === 'dub' ? 'active' : ''}`} 
               style={{ fontSize: '0.65rem', padding: '5px 12px' }}
             >
               DOBLAJE
             </div>
           )}
        </div>

        {/* 5. Mirrors / Alternatives within same provider */}
        <div style={{ marginTop: '12px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
          {(selectedCategory === 'sub' ? servers.sub : servers.dub).map((s: Server, index: number) => (
             <div 
               key={`${s.serverId}-${s.serverName}`}
               onClick={() => setSelectedServer(s.serverName)}
               style={{ 
                 padding: '6px 12px', borderRadius: '8px', background: selectedServer === s.serverName ? 'var(--ion-color-primary)' : 'rgba(255,255,255,0.03)',
                 fontSize: '0.65rem', fontWeight: 800, cursor: 'pointer', transition: 'all 0.2s',
                 color: selectedServer === s.serverName ? '#000' : '#666',
                 border: selectedServer === s.serverName ? 'none' : '1px solid rgba(255,255,255,0.05)'
               }}
             >
                {s.serverName.toUpperCase()}
             </div>
          ))}
        </div>

        {/* 6. Comentarios del Episodio */}
        <div style={{ marginTop: '30px', paddingBottom: '60px' }}>
            <CommentSection 
                mangaId={animeId}
                chapterId={episodeId}
                title={`Muro del Episodio ${episodeNumber}`}
            />
        </div>

      </div>
    </div>
  );
};

export default VideoPlayer;
