import React, { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import { IonButton, IonSpinner, IonText, IonIcon } from '@ionic/react';
import { videocamOutline } from 'ionicons/icons';
import { aniwatchService } from '../services/aniwatchService';
import { gogoanimeService } from '../services/gogoanimeService';
import { animeflvService } from '../services/animeflvService';

interface VideoPlayerProps {
  episodeId: string;
  animeTitle: string;
  episodeNumber: number;
  sourceProvider?: 'aniwatch' | 'gogoanime' | 'animeflv';
  imageUrl?: string;
  onClose: () => void;
}

interface Server {
  serverId: number;
  serverName: string;
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({
  episodeId,
  animeTitle,
  episodeNumber,
  sourceProvider: initialSource,
  imageUrl,
  onClose
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  
  const [sourceProvider, setSourceProvider] = useState<'aniwatch' | 'gogoanime' | 'animeflv'>(initialSource || 'aniwatch');
  const [gogoId, setGogoId] = useState<string | null>(null);
  const [flvId, setFlvId] = useState<string | null>(null);
  const [servers, setServers] = useState<{sub: Server[], dub: Server[]}>({sub: [], dub: []});
  const [selectedServer, setSelectedServer] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<'sub' | 'dub'>('sub');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [subtitles, setSubtitles] = useState<any[]>([]);
  const [iframeUrl, setIframeUrl] = useState<string | null>(null);

  // 1. Cargar servidores / Identificar Anime en Gogo
  useEffect(() => {
    if (!episodeId || !animeTitle) return;

    let active = true; // Guard contra Race Conditions

    const fetchServersData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        if (sourceProvider === 'aniwatch') {
          console.log('📡 [VideoPlayer] Fetching AniWatch servers for:', episodeId);
          const data = await aniwatchService.getEpisodeServers(episodeId);

          if (!active) return;

          if (data) {
            const sub = data.sub || [];
            const dub = data.dub || [];

            setServers({ sub, dub });

            const preferredServers = ['hd-1', 'megacloud', 'vidstreaming'];
            let defaultCategory: 'sub' | 'dub' = sub.length > 0 ? 'sub' : 'dub';
            let serverList = defaultCategory === 'sub' ? sub : dub;
            
            const found = serverList.find((s: Server) => preferredServers.includes(s.serverName.toLowerCase()));
            const defaultServer = found ? found.serverName : (serverList[0]?.serverName || '');

            setSelectedCategory(defaultCategory);
            if (defaultServer) setSelectedServer(defaultServer);
          } else {
            throw new Error('No se encontraron servidores en AniWatch.');
          }
        } else if (sourceProvider === 'gogoanime') {
          // Lógica Gogoanime
          console.log('📡 [VideoPlayer] Searching Gogoanime for:', animeTitle);
          const results = await gogoanimeService.search(animeTitle);
          
          if (!active) return;

          if (results && results.length > 0) {
            const bestMatch = results[0]; // El primer resultado suele ser el correcto
            setGogoId(bestMatch.id);
            setServers({ sub: [{serverId: 1, serverName: 'vidcdn'}, {serverId: 2, serverName: 'embtaku'}], dub: [] });
            setSelectedServer('vidcdn');
            setSelectedCategory('sub');
          } else {
            throw new Error('No se encontró el anime en Gogoanime.');
          }
        } else if (sourceProvider === 'animeflv') {
          console.log('📡 [VideoPlayer] Searching AnimeFLV for:', animeTitle);
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
                throw new Error('No se extrajeron servidores de AnimeFLV.');
             }
          } else {
             throw new Error('No se encontró el anime en AnimeFLV.');
          }
        }
      } catch (err: any) {
        if (!active) return;
        console.error('❌ [VideoPlayer] Setup error:', err);
        setError(err.message || 'Error al configurar el proveedor');
      } finally {
        if (active) setLoading(false);
      }
    };

    fetchServersData();
    return () => { active = false; };
  }, [episodeId, sourceProvider, animeTitle]);

  // 2. Cargar Stream (con Robustez, Fallback y Guardia de Montado)
  useEffect(() => {
    console.log('🔍 [VideoPlayer Debug] Effect 2 Init. State:', { selectedServer, episodeId, sourceProvider, gogoId, episodeNumber });
    
    if (!selectedServer || !episodeId) {
      console.log('🔍 [VideoPlayer Debug] Returning early: Missing selectedServer or episodeId');
      return;
    }
    if (sourceProvider === 'gogoanime' && !gogoId) {
      console.log('🔍 [VideoPlayer Debug] Returning early: Gogoanime mode but no gogoId');
      return;
    }
    if (sourceProvider === 'animeflv' && !flvId) {
      console.log('🔍 [VideoPlayer Debug] Returning early: AnimeFLV mode but no flvId');
      return;
    }

    let active = true; // Estándar Gemini para prevenir fugas de memoria

    const loadStreamData = async () => {
      console.log('🔍 [VideoPlayer Debug] loadStreamData called');
      try {
        setLoading(true);
        setError(null);
        
        let data: any = null;
        if (sourceProvider === 'aniwatch') {
          data = await aniwatchService.getEpisodeSources(episodeId, selectedServer, selectedCategory);
          
          // Auto-Fallback si el servidor falla (ej. Vercel 500 en megacloud)
          const categoryServers = selectedCategory === 'sub' ? servers.sub : servers.dub;
          if ((!data || data.sources?.length === 0) && categoryServers.length > 1) {
            console.warn(`⚠️ [VideoPlayer] Auto-Fallback: ${selectedServer} falló. Intentando alternativas...`);
            for (const s of categoryServers) {
              if (s.serverName === selectedServer) continue;
              console.log(`🔄 [VideoPlayer] Fallback a servidor: ${s.serverName}`);
              data = await aniwatchService.getEpisodeSources(episodeId, s.serverName, selectedCategory);
              if (data && (data.sources?.length > 0 || data.length > 0)) {
                console.log(`✅ [VideoPlayer] Fallback exitoso con: ${s.serverName}`);
                setSelectedServer(s.serverName); // Actualizar UI
                break;
              }
            }
          }
        } else if (sourceProvider === 'gogoanime' && gogoId) {
          const gogoEpId = `${gogoId}-episode-${episodeNumber}`;
          console.log('🎥 [VideoPlayer] Trying Gogoanime episode:', gogoEpId);
          data = await gogoanimeService.getEpisodeSources(gogoEpId, selectedServer);
        } else if (sourceProvider === 'animeflv' && flvId) {
          const flvEpId = `${flvId}-${episodeNumber}`;
          console.log('🎥 [VideoPlayer] Trying AnimeFLV episode:', flvEpId);
          const rawData = await animeflvService.getEpisodeSources(flvEpId);
          if (rawData && rawData.sources) {
             const matchedSource = rawData.sources.find((s: any) => s.serverName === selectedServer) || rawData.sources[0];
             data = { sources: [matchedSource], subtitles: [] };
          }
        }

        if (!active) return; // Si se desmontó, no hacer nada

        if (data && (data.sources?.length > 0 || data.length > 0)) {
          const sources = Array.isArray(data) ? data : data.sources;
          const streamUrl = sources[0].url;
          setSubtitles(data.subtitles || []);
          
          if (sources[0].isIframe || streamUrl.includes('streaming.php') || streamUrl.includes('embed')) {
            setIframeUrl(streamUrl);
            console.log('✅ [VideoPlayer] Renderizando Iframe Embed...');
          } else {
            setIframeUrl(null);
            initPlayer(streamUrl);
            console.log('✅ [VideoPlayer] Stream loaded successfully.');
          }
        } else {
          throw new Error('Este servidor no devolvió fuentes de video.');
        }
      } catch (err: any) {
        if (!active) return;
        console.error('❌ [VideoPlayer] Stream error:', err);
        setError(err.message || 'Fallo al cargar el video.');
      } finally {
        if (active) setLoading(false);
      }
    };

    loadStreamData();
    return () => { active = false; };
  }, [selectedServer, selectedCategory, episodeId, sourceProvider, gogoId, episodeNumber]);

  const initPlayer = (url: string) => {
    if (!videoRef.current) return;
    if (hlsRef.current) hlsRef.current.destroy();

    if (Hls.isSupported()) {
      const hls = new Hls({
        maxBufferLength: 30, // Estándar Gemini
        enableWorker: true,
      });
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

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#000', zIndex: 3000, display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ padding: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#1a1a1a', borderBottom: '1px solid #333' }}>
        <div>
          <h4 style={{ margin: 0, color: '#fff' }}>{animeTitle}</h4>
          <p style={{ margin: 0, fontSize: '0.8rem', color: '#888' }}>Episodio {episodeNumber}</p>
        </div>
        <IonButton fill="clear" color="danger" onClick={onClose}>Cerrar</IonButton>
      </div>

      {/* Video Area */}
      <div style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#000' }}>
        {loading && <div style={{ position: 'absolute', zIndex: 10 }}><IonSpinner color="primary" /></div>}
        {error ? (
          <div style={{ textAlign: 'center', padding: '20px' }}>
            <IonText color="danger"><p>⚠️ {error}</p></IonText>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginTop: '10px' }}>
              <IonButton size="small" fill="outline" onClick={() => window.location.reload()}>Reintentar</IonButton>
              {sourceProvider === 'aniwatch' && (
                <IonButton size="small" color="warning" onClick={() => setSourceProvider('gogoanime')}>
                  Intentar con Gogoanime
                </IonButton>
              )}
              {sourceProvider === 'gogoanime' && (
                <IonButton size="small" color="warning" onClick={() => setSourceProvider('animeflv')}>
                  Intentar con AnimeFLV
                </IonButton>
              )}
              {sourceProvider === 'animeflv' && (
                <IonButton size="small" color="warning" onClick={() => setSourceProvider('aniwatch')}>
                  Intentar con AniWatch
                </IonButton>
              )}
            </div>
            <div style={{ marginTop: '20px' }}>
              <IonButton 
                size="small" 
                color="success" 
                onClick={() => {
                  setError(null);
                  setIframeUrl(null);
                  initPlayer('https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8');
                }}
              >
                Probar Reproductor (Test Stream M3U8)
              </IonButton>
            </div>
          </div>
        ) : iframeUrl ? (
          <iframe 
             title="Anime Video Player"
             src={iframeUrl} 
             style={{ width: '100%', height: '100%', border: 'none' }} 
             allowFullScreen 
             sandbox="allow-scripts allow-same-origin allow-presentation"
          />
        ) : (
          <video ref={videoRef} controls autoPlay style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
        )}
      </div>

      {/* Servers & Controls */}
      <div style={{ padding: '15px', background: '#1e1e2e', borderTop: '1px solid #333' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <p style={{ margin: 0, fontSize: '13px', color: '#94a3b8' }}>
            Fuente: <span style={{ color: '#fff', fontWeight: 'bold' }}>{sourceProvider.toUpperCase()}</span>
          </p>
          <div style={{ display: 'flex', gap: '8px' }}>
            <IonButton 
              size="small" 
              color="success"
              onClick={() => {
                setError(null);
                initPlayer('https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8');
              }}
            >
              Test M3U8
            </IonButton>
            <IonButton 
              size="small" 
              fill="clear" 
              onClick={() => {
                if (sourceProvider === 'aniwatch') setSourceProvider('gogoanime');
                else if (sourceProvider === 'gogoanime') setSourceProvider('animeflv');
                else setSourceProvider('aniwatch');
              }}
            >
              Cambiar Fuente (Actual: {sourceProvider.toUpperCase()})
            </IonButton>
          </div>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '15px' }}>
          {(selectedCategory === 'sub' ? servers.sub : servers.dub).map((s: Server) => (
            <IonButton 
              key={`${s.serverId}-${s.serverName}`}
              size="small"
              fill={selectedServer === s.serverName ? "solid" : "outline"}
              color={selectedServer === s.serverName ? "primary" : "medium"}
              onClick={() => setSelectedServer(s.serverName)}
              style={{ minWidth: '90px' }}
            >
              <IonIcon slot="start" icon={videocamOutline} />
              {s.serverName.toUpperCase()}
            </IonButton>
          ))}
        </div>

        {sourceProvider === 'aniwatch' && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: '10px' }}>
            <IonButton size="small" fill={selectedCategory === 'sub' ? "solid" : "outline"} color="secondary" onClick={() => setSelectedCategory('sub')} disabled={servers.sub.length === 0}>SUB</IonButton>
            <IonButton size="small" fill={selectedCategory === 'dub' ? "solid" : "outline"} color="secondary" onClick={() => setSelectedCategory('dub')} disabled={servers.dub.length === 0}>DUB</IonButton>
          </div>
        )}
      </div>
    </div>
  );
};

export default VideoPlayer;
