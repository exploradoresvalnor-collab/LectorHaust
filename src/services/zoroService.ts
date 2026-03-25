import { Capacitor } from '@capacitor/core';

export interface ZoroSource {
  url: string;
  isM3U8: boolean;
  quality?: string;
  serverName?: string;
}

export interface ZoroEpisode {
  id: string;
  number: number;
  title: string;
}

export interface ZoroAnimeInfo {
  id: string;
  title: string;
  image: string;
  description: string;
  status: string;
  totalEpisodes: number;
  episodes: ZoroEpisode[];
}

const BASE_URL = Capacitor.getPlatform() === 'web' 
    ? '/api-aniwatch/api/v2/hianime' 
    : 'https://apideaniwatch.vercel.app/api/v2/hianime';

const META_URL = 'https://mi-api-manga.vercel.app/meta/anilist';

/**
 * Optimiza las imágenes usando el proxy de WordPress para evitar que la app se pesade y mejorar la carga.
 */
function optimizeImage(url: string, width: number = 300) {
    if (!url) return 'https://placehold.co/300x450/1a1a1a/ffffff?text=No+Image';
    // Si ya es una URL de proxy o placeholder, no hacer nada
    if (url.includes('wp.com') || url.includes('placehold.co')) return url;
    
    // Limpiar la URL de protocolos para el proxy de WordPress
    const cleanUrl = url.replace(/^https?:\/\//, '');
    return `https://i0.wp.com/${cleanUrl}?w=${width}&quality=80`;
}

async function fetchZoro(endpoint: string, isMeta: boolean = false) {
    const base = isMeta ? META_URL : BASE_URL;
    const url = `${base}${endpoint}`;
    try {
        const response = await fetch(url);
        if (!response.ok) {
            return null;
        }
        return await response.json();
    } catch (error) {
        return null;
    }
}

export const zoroService = {
    /**
     * Busca animes en Zoro (HiAnime)
     */
    async search(query: string): Promise<any[]> {
        if (!query || query.length < 2) return [];
        // Usamos el search de HiAnime directamente
        const data = await fetchZoro(`/search?q=${encodeURIComponent(query)}`);
        
        const results = data?.data?.animes || data?.animes || data?.results || [];
        
        return results.map((anime: any) => ({
            id: anime.id,
            title: anime.name || anime.title,
            image: optimizeImage(anime.poster || anime.image),
            type: anime.type,
            releaseDate: anime.releaseDate
        }));
    },

    /**
     * Obtiene la información detallada de un anime
     */
    async getAnimeInfo(id: string): Promise<ZoroAnimeInfo | null> {
        if (!id) return null;
        const res = await fetchZoro(`/anime/${id}`);
        if (!res) return null;

        const data = res.data?.anime || res.data || res;
        const info = data.info || data;

        // Cargar episodios desde endpoint dedicado (Consumet v2 Style)
        let episodes = [];
        const epData = await fetchZoro(`/anime/${id}/episodes`);
        if (epData) {
            episodes = epData.data?.episodes || epData.episodes || [];
        }

        return {
            id: id,
            title: info.name || info.title,
            image: optimizeImage(info.poster || info.image, 500), // More res for details
            description: info.description || 'Sin descripción',
            status: info.stats?.status || data.status || 'Desconocido',
            totalEpisodes: episodes.length || info.stats?.episodes?.sub || 0,
            episodes: episodes.map((ep: any) => ({
                id: ep.id,
                number: ep.number,
                title: ep.title || `Episodio ${ep.number}`
            }))
        };
    },

    /**
     * Obtiene los episodios recientes (Home)
     */
    async getRecentEpisodes(): Promise<any[]> {
        const data = await fetchZoro('/home');
        const results = data?.data?.latestEpisodeAnimes || [];
        
        return results.map((ep: any) => ({
            id: ep.id,
            animeId: ep.id,
            animeName: ep.name || ep.title,
            animePoster: optimizeImage(ep.poster || ep.image),
            number: ep.episodes?.sub || 1,
            title: `Episodio ${ep.episodes?.sub || 1}`
        }));
    },

    /**
     * Obtiene los animes más populares (Top Airing)
     * Usamos el mismo BASE_URL para mantener consistencia de IDs (slugs tipo 'one-piece-100')
     */
    async getTopAiring(): Promise<any[]> {
        const data = await fetchZoro('/home');
        const results = data?.data?.trendingAnimes || data?.data?.spotlightAnimes || [];
        
        return results.map((anime: any) => ({
            id: anime.id,
            title: anime.name || anime.title,
            image: optimizeImage(anime.poster || anime.image),
            type: anime.type,
            rating: anime.jname || '' 
        }));
    },

    /**
     * Obtiene los servidores disponibles para un episodio
     */
    async getEpisodeServers(episodeId: string): Promise<any[]> {
        if (!episodeId) return [];
        // Formato para apideaniwatch: /episode/servers?animeEpisodeId=id
        const encodedId = encodeURIComponent(episodeId);
        const data = await fetchZoro(`/episode/servers?animeEpisodeId=${encodedId}`);
        
        // Devolvemos el array de servidores sub para compatibilidad con el reproductor actual
        return data?.data?.sub || data?.data || data || [];
    },

    /**
     * Obtiene las fuentes de video para un episodio
     */
    async getEpisodeSources(episodeId: string, server: string = 'hd-1'): Promise<{ sources: ZoroSource[] } | null> {
        if (!episodeId) return null;
        
        const encodedId = encodeURIComponent(episodeId);
        // Intentamos obtener fuentes (category sub por defecto)
        const data = await fetchZoro(`/episode/sources?animeEpisodeId=${encodedId}&server=${server}&category=sub`);
        
        const sources = data?.data?.sources || data?.sources || [];
        if (sources.length === 0) return null;

        return {
            sources: sources.map((s: any) => ({
                url: s.url,
                isM3U8: s.isM3u8 || s.url.includes('.m3u8'),
                quality: s.quality || 'auto',
                serverName: server
            }))
        };
    }
};
