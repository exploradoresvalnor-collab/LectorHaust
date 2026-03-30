import { Capacitor } from '@capacitor/core';

export interface FLVSource {
  url: string;
  isM3U8: boolean;
  isIframe?: boolean;
  quality: string;
  serverName: string;
}

const BASE_URL = 'https://www4.animeflv.net';
// Proxy temporal para web dev (evita CORS)
const PROXY_URL = 'https://manga-proxy.mchaustman.workers.dev/?url=';

async function fetchHtml(url: string) {
    // Si es nativo (Android/iOS), NO hay problemas de CORS, vamos DIRECTO por velocidad y fiabilidad.
    if (Capacitor.isNativePlatform()) {
        try {
            const directResp = await fetch(url);
            if (directResp.ok) return directResp.text();
        } catch (e) {
            console.warn(`[AnimeFLV] Direct fetch failed on native, trying proxy...`);
        }
    }

    // ALWAYS use the proxy to bypass CORS on Web and as fallback on Native
    const proxyUrl = `${PROXY_URL}${encodeURIComponent(url)}`;
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 second timeout
    
    try {
      const resp = await fetch(proxyUrl, { signal: controller.signal });
      clearTimeout(timeoutId);
      
      if (!resp.ok) {
          throw new Error(`Proxy Error: ${resp.status}`);
      }
      return resp.text(); 
    } catch (e) {
      clearTimeout(timeoutId);
      throw e;
    }
}

export const animeflvService = {
  
  async getTrendingAnime() {
    try {
      // Usamos el directorio ordenado por popularidad para obtener las tendencias reales con imágenes
      const url = `${BASE_URL}/browse?order=popularity`;
      const html = await fetchHtml(url);
      
      const results: any[] = [];
      const regex = /<article[^>]*class="[^"]*Anime[^"]*"[^>]*>[\s\S]*?<a href="\/anime\/([^"]+)">[\s\S]*?<img src="([^"]+)"[\s\S]*?<h3[^>]*>([^<]+)<\/h3>/gi;
      
      let match;
      while ((match = regex.exec(html)) !== null && results.length < 15) {
          let imgUrl = match[2];
          // Pro quality improvement: Use /cover/ instead of /thumb/
          if (imgUrl.includes('/thumb/')) {
              imgUrl = imgUrl.replace('/thumb/', '/cover/');
          }
          if (imgUrl.startsWith('/')) imgUrl = `${BASE_URL}${imgUrl}`;
          // Proxy de imagen para evitar bloqueos
          const proxiedImg = `https://i0.wp.com/${imgUrl.replace(/^https?:\/\//, '')}`;
          results.push({ 
            id: match[1], 
            title: match[3], 
            name: match[3], 
            image: proxiedImg,
            source: 'animeflv'
          });
      }
      return results;
    } catch (err) {
      console.error("[S-P] Error fetching trending:", err);
      return [];
    }
  },

  async getRecentEpisodes() {
    try {
      const html = await fetchHtml(`${BASE_URL}/`);
      const results: any[] = [];
      const regex = /<a href="\/ver\/([^"]+)"[\s\S]*?<img src="([^"]+)"[\s\S]*?<span class="Capi">Episodio ([^<]+)<\/span>[\s\S]*?<strong class="Title">([^<]+)<\/strong>/gi;
      let match;
      while ((match = regex.exec(html)) !== null && results.length < 15) {
        let imgUrl = match[2];
        if (imgUrl.includes('/thumbs/')) {
            imgUrl = imgUrl.replace('/thumbs/', '/covers/');
        }
        if (imgUrl.startsWith('/')) imgUrl = `${BASE_URL}${imgUrl}`;
        const proxiedImg = `https://i0.wp.com/${imgUrl.replace(/^https?:\/\//, '')}`;
        // En S-P, el ID del anime se puede inferir quitando el -number del link del episodio
        const epId = match[1];
        const epNum = match[3];
        let animeId = epId.substring(0, epId.lastIndexOf('-'));
        results.push({
          id: epId,
          number: epNum,
          animeId: animeId,
          animeName: match[4],
          title: `Episodio ${epNum}`,
          animePoster: proxiedImg
        });
      }
      return results;
    } catch (e) { console.error(e); return []; }
  },

  async search(query: string = '', genres: string[] = [], page: number = 1, type: string = '', year: string = '', order: string = 'default'): Promise<any[]> {
    try {
      const flvGenreMap: { [key: string]: string } = {
        'Acción': 'accion', 'Action': 'accion',
        'Artes Marciales': 'artes-marciales',
        'Aventuras': 'aventura', 'Adventure': 'aventura',
        'Carreras': 'carreras', 'Cars': 'carreras',
        'Ciencia Ficción': 'ciencia-ficcion', 'Sci-Fi': 'ciencia-ficcion',
        'Comedia': 'comedia', 'Comedy': 'comedia',
        'Demencia': 'demencia', 'Dementia': 'demencia',
        'Demonios': 'demonios', 'Demons': 'demonios',
        'Deportes': 'deportes', 'Sports': 'deportes',
        'Drama': 'drama',
        'Ecchi': 'ecchi',
        'Escolares': 'escolares', 'School': 'escolares',
        'Espacio': 'espacio', 'Space': 'espacio',
        'Fantasía': 'fantasia', 'Fantasy': 'fantasia',
        'Harem': 'harem',
        'Histórico': 'historico', 'Historical': 'historico',
        'Infantil': 'infantil', 'Kids': 'infantil',
        'Isekai': 'isekai',
        'Josei': 'josei',
        'Juegos': 'juegos', 'Game': 'juegos',
        'Magia': 'magia', 'Magic': 'magia',
        'Mecha': 'mecha',
        'Militar': 'militar', 'Military': 'militar',
        'Misterio': 'misterio', 'Mystery': 'misterio',
        'Música': 'musica', 'Music': 'musica',
        'Parodia': 'parodia', 'Parody': 'parodia',
        'Policial': 'policia', 'Police': 'policia',
        'Psicológico': 'psicologico', 'Psychological': 'psicologico',
        'Romance': 'romance',
        'Samurai': 'samurai',
        'Seinen': 'seinen',
        'Shoujo': 'shoujo',
        'Shoujo Ai': 'shoujo',
        'Shounen': 'shounen',
        'Shounen Ai': 'shounen',
        'Slice of Life': 'recuentos-de-la-vida',
        'Sobrenatural': 'sobrenatural', 'Supernatural': 'sobrenatural',
        'Superpoderes': 'superpoderes', 'Super Power': 'superpoderes',
        'Suspenso': 'suspenso', 'Thriller': 'suspenso',
        'Terror': 'terror', 'Horror': 'terror',
        'Vampiros': 'vampiros', 'Vampire': 'vampiros',
        'Yaoi': 'yaoi',
        'Yuri': 'yuri'
      };

      let url = `${BASE_URL}/browse?q=${encodeURIComponent(query)}&page=${page}`;
      if (genres.length > 0 && genres[0] !== 'all') {
          url += '&' + genres.map(g => {
              const mapped = flvGenreMap[g] || g.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '-');
              return `genre[]=${mapped}`;
          }).join('&');
      }
      if (type && type !== 'all') {
          url += `&type[]=${type.toLowerCase()}`;
      }
      if (year && year !== 'all') {
          url += `&year[]=${year}`;
      }
      if (order && order !== 'default') {
          url += `&order=${order}`;
      }
      const html = await fetchHtml(url);
      
      const results: any[] = [];
      const regex = /<article[^>]*class="[^"]*Anime[^"]*"[^>]*>[\s\S]*?<a href="\/anime\/([^"]+)">[\s\S]*?<img src="([^"]+)"[\s\S]*?<h3[^>]*>([^<]+)<\/h3>/gi;
      let match;
      while ((match = regex.exec(html)) !== null) {
          let imgUrl = match[2];
          if (imgUrl.startsWith('/')) imgUrl = `${BASE_URL}${imgUrl}`;
          // Use WordPress Photon proxy for images to avoid blocks
          const proxiedImg = `https://i0.wp.com/${imgUrl.replace(/^https?:\/\//, '')}`;
          results.push({ id: match[1], title: match[3], name: match[3], image: proxiedImg });
      }

      // Extraer paginación para calcular volumen total
      let maxPage = 1;
      const pagesRegex = /href="[^"]*page=(\d+)[^"]*"/g;
      let pageMatch;
      while ((pageMatch = pagesRegex.exec(html)) !== null) {
          const p = parseInt(pageMatch[1], 10);
          if (p > maxPage) maxPage = p;
      }
      
      // S-P suele retornar 24 items por página (o la cantidad en la última)
      (results as any).totalCount = maxPage > 1 ? maxPage * 24 : results.length;
      
      return results;
    } catch (error) {
       console.error('[S-P] Search error:', error);
       return [];
    }
  },

  async getAnimeInfo(id: string) {
    try {
      const html = await fetchHtml(`${BASE_URL}/anime/${id}`);
      
      // Extraemos Título, Portada y Sinopsis
      let title = id;
      const titleMatch = html.match(/<h1 class="Title">([^<]+)<\/h1>/);
      if (titleMatch) title = titleMatch[1];

      let image = '';
      const imgMatch = html.match(/<div class="AnimeCover">[\s\S]*?<img src="([^"]+)"/);
      if (imgMatch) {
         image = imgMatch[1];
         // Pro quality improvement: Use /cover/ instead of /thumb/
         if (image.includes('/thumb/')) {
            image = image.replace('/thumb/', '/cover/');
         }
         if (image.startsWith('/')) image = `${BASE_URL}${image}`;
         image = `https://i0.wp.com/${image.replace(/^https?:\/\//, '')}`;
      }

      let description = 'Sin descripción';
      const descMatch = html.match(/<div class="Description">\s*<p>([^<]+)<\/p>/);
      if (descMatch) description = descMatch[1];

      // Extraer Episodios parseando la variable de JavaScript
      let episodes: any[] = [];
      const epMatch = html.match(/var episodes = (\[.*?\]);/);
      if (epMatch) {
         const epData = JSON.parse(epMatch[1]);
         // epData es un array de tuplas: [ [numero, id_interno], ... ]
         episodes = epData.map((ep: any[]) => ({
             id: `${id}-${ep[0]}`,     // El ID real del endpoint /ver/anime-id-numero
             number: ep[0],
             title: `Episodio ${ep[0]}`
         }));
      }

      return {
        id,
        title,
        name: title,
        image,
        description,
        totalEpisodes: episodes.length,
        status: 'Finished/Airing', // hardcoded as it requires more parsing
        episodes
      };
      
    } catch (e) {
      console.error(e);
      return null;
    }
  },

  async getEpisodeSources(episodeId: string): Promise<{ sources: FLVSource[] } | null> {
    try {
      const html = await fetchHtml(`${BASE_URL}/ver/${episodeId}`);
      
      
      // S-P guarda los servidores en una variable JSON en el JS de la página
      const match = html.match(/var videos = (\{[^;]+\});/);
      
      if (!match) {
          throw new Error('No se encontraron servidores de video (var videos no hallado).');
      }
      
      const videosJson = JSON.parse(match[1]);
      const subs = videosJson.SUB || videosJson.LAT || [];
      
      if (subs.length === 0) {
          throw new Error('El objeto videos no tiene servidores SUB/LAT.');
      }

      
      // Mapeamos todos los servidores para que el reproductor los ponga como opciones
      const sources: FLVSource[] = subs.map((s: any) => {
          let url = s.code;
          // Normalizar links si no tienen https
          if (url.startsWith('//')) {
              url = 'https:' + url;
          } else if (!url.startsWith('http')) {
              // Algunos embeds bizarros podrían no tener http (ej. okru)
              if (s.server === 'okru') {
                 url = `https://ok.ru/videoembed/${url}`;
              }
          }

          return {
              url: url,
              isM3U8: false,
              isIframe: true,
              quality: 'auto',
              serverName: s.server.toLowerCase()
          };
      });

      return { sources };
    } catch (error) {
      console.error('[S-P] Sources error:', error);
      return null;
    }
  }
};
