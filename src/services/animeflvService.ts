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
    // ALWAYS use the proxy to bypass CORS, Referer restrictions and ISP blocks
    // This is critical for APK production where carriers might block specific domains.
    const proxyUrl = `${PROXY_URL}${encodeURIComponent(url)}`;
    const resp = await fetch(proxyUrl);
    if (!resp.ok) {
        // Fallback for native if the proxy is down
        if (Capacitor.isNativePlatform()) {
            const directResp = await fetch(url);
            if (directResp.ok) return directResp.text();
        }
        throw new Error(`Proxy Error: ${resp.status}`);
    }
    return resp.text(); 
}

export const animeflvService = {
  
  async getTrendingAnime() {
    try {
      const html = await fetchHtml(`${BASE_URL}/`);
      const results: any[] = [];
      const regex = /<article class="Anime alt B">[\s\S]*?<a href="\/anime\/([^"]+)">[\s\S]*?<img src="([^"]+)"[\s\S]*?<h3 class="Title">([^<]+)<\/h3>/gi;
      let match;
      while ((match = regex.exec(html)) !== null && results.length < 15) {
        let imgUrl = match[2];
        if (imgUrl.startsWith('/')) imgUrl = `${BASE_URL}${imgUrl}`;
        const proxiedImg = `https://i0.wp.com/${imgUrl.replace(/^https?:\/\//, '')}`;
        results.push({ id: match[1], name: match[3], image: proxiedImg, title: match[3] });
      }
      return results;
    } catch (e) { console.error(e); return []; }
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
        // En AnimeFLV, el ID del anime se puede inferir quitando el -number del link del episodio
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
      let url = `${BASE_URL}/browse?q=${encodeURIComponent(query)}&page=${page}`;
      if (genres.length > 0 && genres[0] !== 'all') {
          url += '&' + genres.map(g => `genre[]=${g.toLowerCase()}`).join('&');
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
      const regex = /<article class="Anime alt B">[\s\S]*?<a href="\/anime\/([^"]+)">[\s\S]*?<img src="([^"]+)"[\s\S]*?<h3 class="Title">([^<]+)<\/h3>/gi;
      let match;
      while ((match = regex.exec(html)) !== null) {
          let imgUrl = match[2];
          if (imgUrl.startsWith('/')) imgUrl = `${BASE_URL}${imgUrl}`;
          // Use WordPress Photon proxy for images to avoid blocks
          const proxiedImg = `https://i0.wp.com/${imgUrl.replace(/^https?:\/\//, '')}`;
          results.push({ id: match[1], title: match[3], name: match[3], image: proxiedImg });
      }
      
      return results;
    } catch (error) {
       console.error('[AnimeFLV] Search error:', error);
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
      
      
      // AnimeFLV guarda los servidores en una variable JSON en el JS de la página
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
      console.error('[AnimeFLV] Sources error:', error);
      return null;
    }
  }
};
