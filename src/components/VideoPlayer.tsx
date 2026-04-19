import React, { useEffect, useRef, useState, useCallback } from 'react';
import Hls from 'hls.js';
import { IonButton, IonSpinner, IonText, IonIcon } from '@ionic/react';
import { 
  chevronBackOutline, chevronForwardOutline, 
  alertCircleOutline, expandOutline
} from 'ionicons/icons';
import { animeflvService } from '../services/animeflvService';
import { tioanimeService } from '../services/tioanimeService';
import CommentSection from './CommentSection';
import { Capacitor } from '@capacitor/core';
import { ScreenOrientation } from '@capacitor/screen-orientation';

interface VideoPlayerProps {
  episode: any;
  episodes: any[];
  animeTitle: string;
  animeId: string;
  sourceProvider?: 'animeflv' | 'tioanime';
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
  
  const [sourceProvider, setSourceProvider] = useState<'animeflv' | 'tioanime'>(initialSource || 'animeflv');
  const [flvId, setFlvId] = useState<string | null>(null);
  const [tioId, setTioId] = useState<string | null>(null);
  const [servers, setServers] = useState<{sub: Server[], dub: Server[]}>({sub: [], dub: []});
  const [selectedServer, setSelectedServer] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<'sub' | 'dub'>('sub');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [iframeUrl, setIframeUrl] = useState<string | null>(null);
  const [availableProviders, setAvailableProviders] = useState<{animeflv: boolean, tioanime: boolean}>({
    animeflv: true, 
    tioanime: false
  });

  const episodeNumber = Number(episode.number);
  const episodeId = episode.id;

  // 🛡️ Validar que la URL no sea maliciosa o tenga publicidad
  const isCleanUrl = (url: string): boolean => {
    const maliciousDomains = [
      'ads.', 'advertising.', 'adserver.', 'doubleclick.',
      'porn', 'xxx', 'adult', 'leaked', '18+',
      'clickbait', 'redirect', 'malware'
    ];
    
    const lowerUrl = url.toLowerCase();
    return !maliciousDomains.some(domain => lowerUrl.includes(domain));
  };

  // Helpers for cleaner logic
  const initPlayer = useCallback((url: string) => {
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
  }, []);

  // 0. Detección Inteligente de disponibilidad
  useEffect(() => {
    const checkProviders = async () => {
      if (!animeTitle) return;
      
      const checks = [
        animeflvService.search(animeTitle).then(res => res && res.length > 0).catch(() => false),
        tioanimeService.search(animeTitle).then(res => res && res.length > 0).catch(() => false)
      ];
      
      const [hasFlv, hasTio] = await Promise.all(checks);
      
      setAvailableProviders({
        animeflv: !!hasFlv,
        tioanime: !!hasTio
      });

      if (sourceProvider === 'animeflv' && !hasFlv && hasTio) setSourceProvider('tioanime');
      if (sourceProvider === 'tioanime' && !hasTio && hasFlv) setSourceProvider('animeflv');
    };
    
    checkProviders();
  }, [animeTitle]);

  // 1. Cargar servidores
  useEffect(() => {
    if (!episodeId || !animeTitle) return;

    let active = true;

    const fetchAnimeFLVServers = async () => {
      const results = await animeflvService.search(animeTitle);
      if (!results || results.length === 0) throw new Error('No se encontró el anime en S-Principal.');
      
      setFlvId(results[0].id);
      const flvEpId = `${results[0].id}-${episodeNumber}`;
      const rawData = await animeflvService.getEpisodeSources(flvEpId);
      
      if (!rawData?.sources || rawData.sources.length === 0) throw new Error('No se encontraron servidores en S-Principal.');
      
      const subServers = rawData.sources.map((s: any, i: number) => ({ serverId: i, serverName: s.serverName }));
      setServers({ sub: subServers, dub: [] });
      setSelectedServer(subServers[0].serverName);
      setSelectedCategory('sub');
    };

    const fetchTioAnimeServers = async () => {
      const results = await tioanimeService.search(animeTitle);
      if (!results || results.length === 0) throw new Error('No se encontró el anime en S-Express.');
      
      setTioId(results[0].id);
      const tioEpId = `${results[0].id}-${episodeNumber}`;
      const rawData = await tioanimeService.getEpisodeSources(tioEpId);
      
      if (!rawData?.sources || rawData.sources.length === 0) throw new Error('No se encontraron servidores en S-Express.');
      
      const subServers = rawData.sources.map((s: any, i: number) => ({ serverId: i, serverName: s.serverName }));
      setServers({ sub: subServers, dub: [] });
      setSelectedServer(subServers[0].serverName);
      setSelectedCategory('sub');
    };

    const fetchServersData = async () => {
      try {
        setLoading(true);
        setError(null);
        if (sourceProvider === 'animeflv') await fetchAnimeFLVServers();
        else if (sourceProvider === 'tioanime') await fetchTioAnimeServers();
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

    const getStreamFromAnimeFLV = async () => {
      const flvEpId = `${flvId}-${episodeNumber}`;
      const rawData = await animeflvService.getEpisodeSources(flvEpId);
      if (rawData?.sources) {
         const matchedSource = rawData.sources.find((s: any) => s.serverName === selectedServer) || rawData.sources[0];
         return { sources: [matchedSource], subtitles: [] };
      }
      return null;
    };

    const getStreamFromTioAnime = async () => {
      const tioEpId = `${tioId}-${episodeNumber}`;
      const rawData = await tioanimeService.getEpisodeSources(tioEpId);
      if (rawData?.sources) {
         const matchedSource = rawData.sources.find((s: any) => s.serverName === selectedServer) || rawData.sources[0];
         return { sources: [matchedSource], subtitles: [] };
      }
      return null;
    };

    const loadStreamData = async () => {
      try {
        setLoading(true);
        setError(null);
        let data: any = null;
        if (sourceProvider === 'animeflv' && flvId) data = await getStreamFromAnimeFLV();
        else if (sourceProvider === 'tioanime' && tioId) data = await getStreamFromTioAnime();

        if (!active) return;
        if (!data?.sources?.length) throw new Error('Este servidor no devolvió fuentes de video.');

        const streamUrl = data.sources[0].url;
        
        // 🛡️ Verificar que la URL sea limpia
        if (!isCleanUrl(streamUrl)) {
          console.warn('[🛡️ URL-FILTER] URL bloqueada por ser potencialmente maliciosa:', streamUrl);
          // Intentar con siguiente servidor disponible
          const nextServer = data.sources[1];
          if (nextServer && isCleanUrl(nextServer.url)) {
            // Usar siguiente servidor limpio
            if (nextServer.isIframe || nextServer.url.includes('streaming.php') || nextServer.url.includes('embed')) {
              setIframeUrl(nextServer.url);
            } else {
              setIframeUrl(null);
              initPlayer(nextServer.url);
            }
          } else {
            throw new Error('Todos los servidores disponibles contienen publicidad invasiva o no son seguros.');
          }
        } else if (data.sources[0].isIframe || streamUrl.includes('streaming.php') || streamUrl.includes('embed')) {
          setIframeUrl(streamUrl);
        } else {
          setIframeUrl(null);
          initPlayer(streamUrl);
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
  }, [selectedServer, selectedCategory, episodeId, sourceProvider, flvId, tioId, episodeNumber, initPlayer]);

  useEffect(() => {
    return () => { if (hlsRef.current) hlsRef.current.destroy(); };
  }, []);

  // 🛡️ ANTI-ADS: Monitor global para eliminar publicidad invasiva
  useEffect(() => {
    const adBlockInterval = setInterval(() => {
      // Buscar modales/pop-ups maliciosos en el DOM
      const maliciousSelectors = [
        'div[style*="position: fixed"][style*="z-index"]',
        '[class*="modal"], [class*="popup"]',
        '[class*="ad"], [class*="advertisement"]',
        'div[onmousedown*="ad"]'
      ];

      maliciousSelectors.forEach(selector => {
        try {
          const elements = document.querySelectorAll(selector);
          elements.forEach((el: any) => {
            const text = el.textContent?.toLowerCase() || el.innerText?.toLowerCase() || '';
            const style = el.getAttribute('style') || '';
            
            // Detectar contenido malicioso
            if (text.includes('leaked') || 
                text.includes('pornographic') || 
                text.includes('xxx') ||
                text.includes('adult') ||
                (text.includes('ad') && el.offsetHeight > 100) ||
                (text.includes('click here') && style.includes('fixed'))) {
              console.log('[🛡️ AD-BLOCKER] Removed malicious element:', el.className, text.substring(0, 30));
              el.style.display = 'none';
              el.remove();
              
              // Si es un modal que bloquea interacción, remover también overlay
              if (style.includes('z-index: 999') || style.includes('z-index: 9999')) {
                const parent = el.parentElement;
                if (parent) parent.remove();
              }
            }
          });
        } catch (e) {
          // Algunos selectores pueden fallar, continuar
        }
      });
    }, 500); // Verificar cada 500ms

    return () => clearInterval(adBlockInterval);
  }, []);

  // Lógica de Navegación
  const currentIdx = episodes.findIndex(e => Number(e.number) === episodeNumber);
  const isDesc = episodes.length > 1 && Number(episodes[0].number) > Number(episodes[1].number);
  const nextEp = isDesc ? episodes[currentIdx - 1] : episodes[currentIdx + 1];
  const prevEp = isDesc ? episodes[currentIdx + 1] : episodes[currentIdx - 1];

  // Fullscreen logic
  const setFullscreen = async (container: HTMLDivElement) => {
    if (container.requestFullscreen) {
      await container.requestFullscreen();
    } else if ((container as any).webkitRequestFullscreen) {
      await (container as any).webkitRequestFullscreen();
    }
    if (Capacitor.isNativePlatform()) {
      try { await ScreenOrientation.lock({ orientation: 'landscape' }); } catch(err){ console.error('Orienation lock failed', err); }
    }
  };

  const exitFullscreen = async () => {
    if (document.exitFullscreen) {
      await document.exitFullscreen();
    }
    if (Capacitor.isNativePlatform()) {
      try { await ScreenOrientation.unlock(); } catch(err){ console.error('Orientation unlock failed', err); }
    }
  };

  const toggleFullscreen = async () => {
    try {
      const isCurrentlyFullscreen = !!(document.fullscreenElement || (document as any).webkitFullscreenElement);
      if (!isCurrentlyFullscreen && containerRef.current) await setFullscreen(containerRef.current);
      else await exitFullscreen();
    } catch (err) {
      console.warn('Error toggling fullscreen:', err);
    }
  };

  const getIntelligentName = (provider: string) => {
    const names: any = { 'animeflv': 'S-Principal', 'tioanime': 'S-Express' };
    return names[provider] || provider.toUpperCase();
  };

  const renderVideoPlayerArea = () => {
    if (error) {
      return (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '20px' }}>
          <IonText color="danger"><h4 style={{margin: '0 0 15px', fontWeight: 800}}>⚠️ {error}</h4></IonText>
          <div style={{ display: 'flex', gap: '10px' }}>
            <IonButton size="small" fill="solid" color="primary" onClick={() => globalThis.location.reload()} style={{'--border-radius': '8px'}}>Reintentar</IonButton>
            <IonButton size="small" fill="outline" color="light" onClick={() => setSourceProvider('animeflv')} style={{'--border-radius': '8px'}}>Cambiar Servidor</IonButton>
          </div>
        </div>
      );
    }

    if (iframeUrl) {
      return (
        <div style={{ position: 'relative', width: '100%', height: '100%' }}>
          <iframe 
            title="Video Player" 
            src={iframeUrl} 
            className="iframe-player"
            style={{ width: '100%', height: '100%', border: 'none' }} 
            allowFullScreen 
            allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
          />
        </div>
      );
    }

    return (
      <video ref={videoRef} controls autoPlay style={{ width: '100%', height: '100%', objectFit: 'contain' }}>
        <track kind="captions" />
      </video>
    );
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', color: '#fff' }}>
      <div style={{ background: 'rgba(0,0,0,0.2)', padding: '10px 15px', display: 'flex', gap: '8px', overflowX: 'auto', borderBottom: '1px solid rgba(255,255,255,0.05)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)' }}>
         {['animeflv', 'tioanime'].filter(p => (availableProviders as any)[p]).map(p => (
           <button key={p} type="button" onClick={() => setSourceProvider(p as any)} className={`player-tab ${sourceProvider === p ? 'active' : ''}`} style={{ padding: '10px 18px', fontSize: '0.7rem', fontWeight: 900, cursor: 'pointer', background: sourceProvider === p ? 'var(--ion-color-primary)' : 'rgba(255,255,255,0.05)', color: sourceProvider === p ? '#000' : '#888', borderRadius: '10px', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', flexShrink: 0, border: '1px solid ' + (sourceProvider === p ? 'transparent' : 'rgba(255,255,255,0.1)'), outline: 'none' }}>
             {getIntelligentName(p)}
           </button>
         ))}
      </div>

      <div ref={containerRef} style={{ width: '100%', maxWidth: '1000px', aspectRatio: '16 / 9', margin: '0 auto', background: '#000', position: 'relative' }}>
        {loading && <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10, background: 'rgba(0,0,0,0.6)' }}><IonSpinner name="crescent" color="primary" /></div>}
        {renderVideoPlayerArea()}
      </div>

      <div className="video-details-container">
        <div style={{ position: 'absolute', right: '-20px', bottom: '-15px', opacity: 0.04, fontSize: '4.5rem', fontWeight: 900, pointerEvents: 'none', color: '#fff', transform: 'rotate(-5deg)', userSelect: 'none' }}>Lector Haus</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '25px', paddingBottom: '20px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
           <div>
              <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 900, letterSpacing: '-0.5px', color: '#fff' }}>{animeTitle}</h2>
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
              <IonButton size="small" fill="solid" color="dark" disabled={!prevEp} onClick={() => onEpisodeChange(prevEp)} style={{'--border-radius': '12px', height: '45px', width: '50px', fontWeight: 800}}><IonIcon icon={chevronBackOutline} /></IonButton>
              <IonButton size="small" fill="solid" color="primary" disabled={!nextEp} onClick={() => onEpisodeChange(nextEp)} style={{'--border-radius': '12px', height: '45px', paddingInline: '20px', fontWeight: 900, fontSize: '0.8rem', '--box-shadow': '0 8px 20px rgba(var(--ion-color-primary-rgb), 0.3)'}}>SIGUIENTE EPISODIO <IonIcon slot="end" icon={chevronForwardOutline} /></IonButton>
           </div>
           <div style={{ display: 'flex', gap: '10px' }}>
              <IonButton size="small" fill="clear" color="medium" style={{'--border-radius': '10px', fontWeight: 700, fontSize: '0.75rem', height: '45px'}}>REPORTAR ERROR</IonButton>
              <IonButton size="small" fill="solid" color="secondary" style={{'--border-radius': '12px', height: '45px', paddingInline: '20px', fontWeight: 800, fontSize: '0.75rem'}}>DESCARGAR <IonIcon slot="end" icon={alertCircleOutline} style={{ opacity: 0.5 }} /></IonButton>
           </div>
        </div>

        <div style={{ marginTop: '20px', display: 'flex', gap: '8px', alignItems: 'center' }}>
           <span style={{ fontSize: '0.65rem', fontWeight: 800, color: '#444' }}>AUDIO:</span>
           <button type="button" onClick={() => setSelectedCategory('sub')} className={`filter-chip ${selectedCategory === 'sub' ? 'active' : ''}`} style={{ fontSize: '0.65rem', padding: '5px 12px', cursor: 'pointer', outline: 'none', border: 'none', borderRadius: '15px', color: 'inherit', background: 'transparent' }}>SUB ESP</button>
           { servers.dub.length > 0 && (
             <button type="button" onClick={() => setSelectedCategory('dub')} className={`filter-chip ${selectedCategory === 'dub' ? 'active' : ''}`} style={{ fontSize: '0.65rem', padding: '5px 12px', cursor: 'pointer', outline: 'none', border: 'none', borderRadius: '15px', color: 'inherit', background: 'transparent' }}>DOBLAJE</button>
           )}
        </div>

        <div style={{ marginTop: '12px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
          {(selectedCategory === 'sub' ? servers.sub : servers.dub).map((s: Server) => (
             <button key={`${s.serverId}-${s.serverName}`} type="button" onClick={() => setSelectedServer(s.serverName)} style={{ padding: '6px 12px', borderRadius: '8px', background: selectedServer === s.serverName ? 'var(--ion-color-primary)' : 'rgba(255,255,255,0.03)', fontSize: '0.65rem', fontWeight: 800, cursor: 'pointer', transition: 'all 0.2s', color: selectedServer === s.serverName ? '#000' : '#666', border: selectedServer === s.serverName ? 'none' : '1px solid rgba(255,255,255,0.05)', outline: 'none' }}>
                {s.serverName.toUpperCase()}
             </button>
          ))}
        </div>

        <div style={{ marginTop: '30px', paddingBottom: '60px' }}>
            <CommentSection mangaId={animeId} chapterId={episodeId} title={`Muro del Episodio ${episodeNumber}`} />
        </div>
      </div>
    </div>
  );
};

export default VideoPlayer;
