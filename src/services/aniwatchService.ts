/**
 * AniWatch API Service (HiAnime)
 * Dedicated anime service using apideaniwatch.vercel.app via Vite proxy
 */

import { Capacitor } from '@capacitor/core';
import { animeflvService } from './animeflvService';

// Si estamos en un móvil nativo, usamos la API real directo (Capacitor no sufre de CORS).
// Si estamos en Web, usamos el Proxy de Vite para evadir CORS.
const BASE_URL = Capacitor.isNativePlatform() 
    ? 'https://apideaniwatch.vercel.app' 
    : '/api-aniwatch';

/**
 * Helper robusto para Fetch API
 * Evita que fallos 500 del scraper pasen desapercibidos
 */
async function fetchAniwatch(endpoint: string, options?: RequestInit) {
    const url = endpoint.startsWith('http') ? endpoint : `${BASE_URL}${endpoint}`;
    
    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                ...options?.headers
            },
            ...options
        });

        if (!response.ok) {
            // Silenciar logs de error 500 para evitar ruido en consola
            return null;
        }

        const data = await response.json();
        
        if (data.success === false) {
             return null;
        }

        return data;
    } catch (error) {
        return null;
    }
}

import { mangadexService } from './mangadexService';

// ... (previous lines)

/**
 * Función auxiliar para estandarizar los datos de la API
 * Traduce campos de la API al formato de la app
 * Incluye metadata: géneros, tipo, episodios, idiomas
 */
const formatAnimeCard = (anime: any) => {
  const rawPoster = anime.poster || anime.image || '';
  // Optimizamos la portada con el proxy de Cloudinary/Photon si existe
  const optimizedImage = rawPoster.startsWith('http') 
    ? mangadexService.getOptimizedUrl(rawPoster) 
    : rawPoster;

  return {
    id: anime.id,
    title: anime.name || anime.jname || anime.title || 'Sin título',
    image: optimizedImage,
    category: anime.type || anime.category || 'Anime',
    type: anime.type || anime.category || 'TV',
    genres: anime.genres || anime.genre || [],
    episodes: anime.episodes || { sub: 0, dub: 0 },
    hasSub: anime.episodes?.sub > 0 || anime.episodes?.episodes?.sub > 0 || false,
    hasDub: anime.episodes?.dub > 0 || anime.episodes?.episodes?.dub > 0 || false,
    rating: anime.rating || anime.malscore || '',
    description: anime.description || '',
    jname: anime.jname || anime.name || ''
  };
};

/**
 * Response structures (InferredTypes)
 */
export interface AnimeSearchResult {
  id: string;
  title?: string;
  name?: string;
  image?: string;
  url?: string;
  category?: string;
}

export interface AnimeEpisode {
  id: string;
  number: string | number;
  title?: string;
  duration?: number;
  isFiller?: boolean;
  animeId?: string;
  animeName?: string;
  animePoster?: string;
}

export interface AnimeInfo {
  id: string;
  title?: string;
  name?: string;
  image?: string;
  description?: string;
  episodes?: AnimeEpisode[];
  status?: string;
  totalEpisodes?: number;
  rating?: number | string;
  url?: string;
}

export interface StreamSource {
  url: string;
  quality?: string;
  isM3u8?: boolean;
}

export interface HomeData {
  genres: string[];
  spotlightAnimes: AnimeSearchResult[];
  trendingAnimes: AnimeSearchResult[];
  latestEpisodeAnimes: AnimeSearchResult[];
  topPopularAnimes: AnimeSearchResult[];
  top10Today: AnimeSearchResult[];
  top10Week: AnimeSearchResult[];
  top10Month: AnimeSearchResult[];
  topAiringAnimes: AnimeSearchResult[];
  topUpcomingAnimes: AnimeSearchResult[];
  mostFavoriteAnimes: AnimeSearchResult[];
  latestCompletedAnimes: AnimeSearchResult[];
}

export const aniwatchService = {
  /**
   * Busca animes por nombre
   */
  async searchAnime(query: string, page: number = 1): Promise<AnimeSearchResult[]> {
    if (!query || query.length < 2) return [];
    
    const data = await fetchAniwatch(`/api/v2/hianime/search?q=${encodeURIComponent(query)}&page=${page}`);
    if (!data) return [];
    
    const results = data.data?.animes || data.animes || data || [];
    return results.map(formatAnimeCard);
  },

  /**
   * Obtiene la info del anime y su lista de episodios
   */
  async getAnimeInfo(animeId: string, fetchSpanish: boolean = false): Promise<AnimeInfo | null> {
    if (!animeId) return null;
    
    const res = await fetchAniwatch(`/api/v2/hianime/anime/${animeId}`);
    if (!res) return null;
    
    const animeData = res.data?.anime; 
    const info = animeData?.info || animeData;
    const moreInfo = animeData?.moreInfo || {};

    if (!info) {
      console.warn('[AniWatch] No anime info found in response. Available keys:', Object.keys(res));
      return null;
    }

      let episodes = [];
      const epData = await fetchAniwatch(`/api/v2/hianime/anime/${animeId}/episodes`);
      if (epData) {
        const rawEps = epData.data?.episodes || [];
        episodes = rawEps.map((ep: any) => ({
          id: ep.episodeId || ep.id,
          number: ep.number,
          title: ep.title,
          isFiller: ep.isFiller
        }));
      }

      const infoObj: AnimeInfo = {
        id: animeId,
        title: info.name || info.title || 'Sin título',
        image: info.poster || info.image || '',
        description: info.description || info.synopsis || 'Sin descripción.',
        episodes: episodes, 
        status: moreInfo.status || info.status || 'Desconocido',
        totalEpisodes: episodes.length || info.stats?.episodes?.sub || 0,
        rating: moreInfo.malscore || info.score || 'N/A'
      };

      if (fetchSpanish && infoObj.title) {
        try {
          const spDesc = await this.getSpanishInfo(infoObj.title);
          if (spDesc) infoObj.description = spDesc;
        } catch (e) {
          console.warn('[AniWatch] Spanish fetch failed', e);
        }
      }

      return infoObj;
  },

  /**
   * Busca descripción en español usando AnimeFLV
   */
  async getSpanishInfo(title: string): Promise<string | null> {
    try {
      if (!title) return null;
      // Normalizamos el título para la búsqueda
      const cleanTitle = title.replace(/\(TV\)/g, '').split(':')[0].trim();
      const flvResults = await animeflvService.search(cleanTitle);
      
      if (flvResults.length > 0) {
        // Obtenemos el primero (probablemente el match más cercano)
        const flvInfo = await animeflvService.getAnimeInfo(flvResults[0].id);
        if (flvInfo && flvInfo.description && flvInfo.description !== 'Sin descripción') {
          return flvInfo.description;
        }
      }
      return null;
    } catch (e) {
      return null;
    }
  },

  /**
   * Obtiene los episodios del anime
   */
  async getEpisodes(animeId: string): Promise<AnimeEpisode[]> {
    try {
      const info = await this.getAnimeInfo(animeId);
      return info?.episodes || [];
    } catch (error) {
      console.error('[AniWatch] Episodes error:', error);
      return [];
    }
  },

  /**
   * Obtiene los servidores para un episodio
   * @param episodeId Formato esperado: "anime-id?ep=12345"
   */
  async getEpisodeServers(episodeId: string) {
    try {
      if (!episodeId) return null;
      
      // La clave es encodeURIComponent sobre el episodeId completo (Estándar Anito)
      const encodedId = encodeURIComponent(episodeId);
      const url = `${BASE_URL}/api/v2/hianime/episode/servers?animeEpisodeId=${encodedId}`;
      
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.status === 200 && data.data) {
        return data.data;
      }
      return null;
    } catch (error) {
      return null;
    }
  },

  /**
   * Obtiene las fuentes de video (Versión Corregida con Split e Inteligencia de Fallback)
   */
  async getEpisodeSources(
    episodeId: string, 
    server: string = 'hd-1', 
    category: string = 'sub'
  ): Promise<{ sources: StreamSource[], subtitles: any[] } | null> {
    if (!episodeId) return null;
    
    const encodedId = encodeURIComponent(episodeId);
    let data = await fetchAniwatch(`/api/v2/hianime/episode/sources?animeEpisodeId=${encodedId}&server=${server}&category=${category}`);
    
    // Fallback Proactivo a Servidor Local si falla
    if (!data) {
      const localUrl = `/api-local/anime/hianime/watch/${encodedId}?server=${server}&category=${category}`;
      // Usar fetch estándar para backend local (ya que usaría base distinto si fuera wrapper)
      try {
          const res = await fetch(localUrl);
          if (res.ok) data = await res.json();
      } catch (e) {
          console.error('[AniWatch] Local fallback failed:', e);
      }
    }
    
    if (!data) return null;
    
    const sources = data.data?.sources || data.sources || [];
    const subtitles = data.data?.subtitles || data.subtitles || [];
    
    if (sources.length > 0) return { sources, subtitles };
    return null;
  },

  /**
   * Obtiene animes en tendencia
   */
  async getTrendingAnime(page: number = 1): Promise<AnimeSearchResult[]> {
    const data = await fetchAniwatch(`/api/v2/hianime/home`);
    if (!data) return [];
    
    const results = data.data?.spotlightAnimes || data.spotlightAnimes || [];
    return results.map(formatAnimeCard);
  },

  /**
   * Obtiene animes con filtros avanzados
   */
  async advancedSearch(params: {
    query?: string;
    page?: number;
    airedDate?: string;
    genres?: string[];
    type?: 'TV' | 'Movie' | 'OVA' | 'ONA' | 'Special';
  }): Promise<AnimeSearchResult[]> {
    try {
      let url = `${BASE_URL}/api/v2/hianime/search?`;
      
      if (params.query) {
        url += `q=${encodeURIComponent(params.query)}&`;
      }
      if (params.page) {
        url += `page=${params.page}&`;
      }
      
      const response = await fetch(url);
      
      if (!response.ok) return [];
      
      const data = await response.json();
      const results = data.data?.animes || data.animes || data || [];
      
      return results.map(formatAnimeCard);
    } catch (error) {
      console.error('[AniWatch] Advanced search error:', error);
      return [];
    }
  },

  /**
   * Obtiene episodios recientemente agregados
   */
  async getRecentEpisodes(page: number = 1): Promise<AnimeEpisode[]> {
    try {
      const response = await fetch(
        `${BASE_URL}/api/v2/hianime/recent-episodes?page=${page}`
      );
      
      if (!response.ok) {
        console.warn(`[AniWatch] Recent episodes returned ${response.status}`);
        return [];
      }
      
      const data = await response.json();
      const episodes = data.data?.episodes || data.episodes || [];
      
      // Formateamos cada episodio con información del anime
      return episodes.map((ep: any) => ({
        id: ep.id || ep.episodeId,
        number: ep.number || ep.episodeNumber,
        title: ep.title || ep.episodeTitle || `Episodio ${ep.number}`,
        duration: ep.duration,
        isFiller: ep.isFiller || false,
        animeId: ep.anime?.id || ep.animeId,
        animeName: ep.anime?.name || ep.anime?.title || 'Anime',
        animePoster: ep.anime?.poster || ep.anime?.image || ''
      }));
    } catch (error) {
      console.error('[AniWatch] Recent episodes error:', error);
      return [];
    }
  },

  /**
   * Obtiene TODOS los datos del home (géneros, trending, top 10, etc.)
   * Una sola llamada devuelve múltiples categorías
   */
  async getHomeData(): Promise<HomeData> {
    try {
      const response = await fetch(`${BASE_URL}/api/v2/hianime/home`);
      if (!response.ok) {
        console.warn(`[AniWatch] Home returned ${response.status}`);
        return {
          genres: [],
          spotlightAnimes: [],
          trendingAnimes: [],
          latestEpisodeAnimes: [],
          topPopularAnimes: [],
          top10Today: [],
          top10Week: [],
          top10Month: [],
          topAiringAnimes: [],
          topUpcomingAnimes: [],
          mostFavoriteAnimes: [],
          latestCompletedAnimes: []
        };
      }

      const data = await response.json();
      const home = data.data || {};

      return {
        genres: home.genres || [],
        spotlightAnimes: (home.spotlightAnimes || []).map(formatAnimeCard),
        trendingAnimes: (home.trendingAnimes || []).map(formatAnimeCard),
        latestEpisodeAnimes: (home.latestEpisodeAnimes || []).map(formatAnimeCard),
        topPopularAnimes: (home.mostPopularAnimes || []).map(formatAnimeCard),
        top10Today: (home.top10Animes?.today || []).map(formatAnimeCard),
        top10Week: (home.top10Animes?.week || []).map(formatAnimeCard),
        top10Month: (home.top10Animes?.month || []).map(formatAnimeCard),
        topAiringAnimes: (home.topAiringAnimes || []).map(formatAnimeCard),
        topUpcomingAnimes: (home.topUpcomingAnimes || []).map(formatAnimeCard),
        mostFavoriteAnimes: (home.mostFavoriteAnimes || []).map(formatAnimeCard),
        latestCompletedAnimes: (home.latestCompletedAnimes || []).map(formatAnimeCard)
      };
    } catch (error) {
      console.error('[AniWatch] Home data error:', error);
      return {
        genres: [],
        spotlightAnimes: [],
        trendingAnimes: [],
        latestEpisodeAnimes: [],
        topPopularAnimes: [],
        top10Today: [],
        top10Week: [],
        top10Month: [],
        topAiringAnimes: [],
        topUpcomingAnimes: [],
        mostFavoriteAnimes: [],
        latestCompletedAnimes: []
      };
    }
  },

  /**
   * Obtiene animes por género
   */
  async getAnimesByGenre(genre: string, page: number = 1): Promise<AnimeSearchResult[]> {
    try {
      const response = await fetch(`${BASE_URL}/api/v2/hianime/genre/${encodeURIComponent(genre)}?page=${page}`);
      if (!response.ok) return [];

      const data = await response.json();
      const results = data.data?.animes || data.animes || [];

      return results.map(formatAnimeCard);
    } catch (error) {
      console.error('[AniWatch] Genre search error:', error);
      return [];
    }
  },

  /**
   * Obtiene animes de una categoría específica
   */
  async getAnimesByCategory(category: string, page: number = 1): Promise<AnimeSearchResult[]> {
    try {
      const response = await fetch(`${BASE_URL}/api/v2/hianime/category/${encodeURIComponent(category)}?page=${page}`);
      if (!response.ok) return [];

      const data = await response.json();
      const results = data.data?.animes || data.animes || [];

      return results.map(formatAnimeCard);
    } catch (error) {
      console.error('[AniWatch] Category search error:', error);
      return [];
    }
  },

  /**
   * Obtiene estrenos programados próximos
   */
  async getSchedules(): Promise<any[]> {
    try {
      const response = await fetch(`${BASE_URL}/api/v2/hianime/scheduled`);
      if (!response.ok) return [];

      const data = await response.json();
      return data.data?.schedules || [];
    } catch (error) {
      console.error('[AniWatch] Schedules error:', error);
      return [];
    }
  },

  /**
   * Obtiene lista A-Z de animes
   */
  async getAnimeAtoZ(letter: string = 'A', page: number = 1): Promise<AnimeSearchResult[]> {
    try {
      const response = await fetch(`${BASE_URL}/api/v2/hianime/a-z?startWith=${letter}&page=${page}`);
      if (!response.ok) return [];

      const data = await response.json();
      const results = data.data?.animes || data.animes || [];

      return results.map(formatAnimeCard);
    } catch (error) {
      console.error('[AniWatch] A-Z search error:', error);
      return [];
    }
  },

  /**
   * Obtiene información rápida (QTIP) del anime
   * Más ligera que getAnimeInfo(), sin episodios
   */
  async getQtipInfo(animeId: string): Promise<any | null> {
    try {
      if (!animeId) return null;

      const response = await fetch(`${BASE_URL}/api/v2/hianime/qtip/${animeId}`);
      if (!response.ok) return null;

      const data = await response.json();
      return data.data?.anime || null;
    } catch (error) {
      console.error('[AniWatch] Qtip info error:', error);
      return null;
    }
  },

  /**
   * Obtiene sugerencias de búsqueda mientras escribes
   */
  async getSearchSuggestions(query: string): Promise<any[]> {
    try {
      if (!query || query.length < 1) return [];

      const response = await fetch(
        `${BASE_URL}/api/v2/hianime/search/suggestion?q=${encodeURIComponent(query)}`
      );
      if (!response.ok) return [];

      const data = await response.json();
      return data.data?.suggestions || [];
    } catch (error) {
      console.error('[AniWatch] Search suggestions error:', error);
      return [];
    }
  },

  /**
   * Obtiene animes de un productor/studio específico
   */
  async getAnimesByProducer(producerName: string, page: number = 1): Promise<AnimeSearchResult[]> {
    try {
      if (!producerName) return [];

      const response = await fetch(
        `${BASE_URL}/api/v2/hianime/producer/${encodeURIComponent(producerName)}?page=${page}`
      );
      if (!response.ok) return [];

      const data = await response.json();
      const results = data.data?.animes || data.animes || [];

      return results.map(formatAnimeCard);
    } catch (error) {
      console.error('[AniWatch] Producer search error:', error);
      return [];
    }
  },

  /**
   * Obtiene el próximo episodio programado para un anime
   */
  async getNextEpisodeSchedule(animeId: string): Promise<{
    airingISO: string | null;
    airingTimestamp: number | null;
    secondsUntilAiring: number | null;
  } | null> {
    try {
      if (!animeId) return null;

      const response = await fetch(
        `${BASE_URL}/api/v2/hianime/anime/${animeId}/next-episode-schedule`
      );
      if (!response.ok) return null;

      const data = await response.json();
      
      if (data.success && data.data) {
        return {
          airingISO: data.data.airingISOTimestamp || null,
          airingTimestamp: data.data.airingTimestamp || null,
          secondsUntilAiring: data.data.secondsUntilAiring || null
        };
      }

      return null;
    } catch (error) {
      console.error('[AniWatch] Next episode schedule error:', error);
      return null;
    }
  }
};
