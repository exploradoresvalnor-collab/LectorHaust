import { Capacitor } from '@capacitor/core';

const BASE_URL = 'https://hianime.to';
// Añadir el proxy principal personalizado del usuario (Cloudflare Worker) al inicio para evitar bloqueos
const PROXY_URLS = [
  'https://manga-proxy.mchaustman.workers.dev/?url='
];

async function fetchHtml(url: string) {
  let lastError: any;
  
  for (const proxy of PROXY_URLS) {
    try {
      const proxyUrl = `${proxy}${encodeURIComponent(url)}`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s max
      
      const resp = await fetch(proxyUrl, { signal: controller.signal });
      clearTimeout(timeoutId);
      
      if (resp.ok) {
        const text = await resp.text();
        // Validate: Must contain at least some HiAnime signatures
        if (text.includes('flw-item') || text.includes('film-name') || text.includes('ep-item') || text.includes('movie-id') || text.includes('episode')) {
          return text;
        }
        console.warn(`[HiAnime] Proxy ${proxy} returned Cloudflare block page or invalid content.`);
        throw new Error("Cloudflare Block / Invalid Content");
      }
    } catch (e) {
      console.warn(`[HiAnime] Proxy ${proxy} failed:`, e);
      lastError = e;
    }
  }

  // Final Attempt: Native Direct (If on Capacitor, avoids CORS but might hit ISP block)
  if (Capacitor.isNativePlatform()) {
    try {
      const resp = await fetch(url);
      if (resp.ok) return resp.text();
    } catch (e) {}
  }
  
  throw lastError || new Error(`Failed to fetch: ${url}`);
}

export const hianimeService = {
  async search(query: string, page: number = 1, year: string = 'all', genre: string = 'all', sort: string = 'recently_updated', type: string = 'all') {
    try {
      // Mapping from name to HiAnime internal IDs
      const genreMap: { [key: string]: number } = {
        'Acción': 1, 'Action': 1,
        'Aventuras': 2, 'Adventure': 2,
        'Carreras': 3, 'Cars': 3,
        'Comedia': 4, 'Comedy': 4,
        'Demencia': 5, 'Dementia': 5,
        'Demonios': 6, 'Demons': 6,
        'Drama': 7,
        'Ecchi': 8,
        'Fantasía': 9, 'Fantasy': 9,
        'Juegos': 10, 'Game': 10,
        'Harem': 11,
        'Histórico': 12, 'Historical': 12,
        'Terror': 13, 'Horror': 13,
        'Isekai': 14,
        'Josei': 15,
        'Infantil': 16, 'Kids': 16,
        'Magia': 17, 'Magic': 17,
        'Artes Marciales': 18, 'Martial Arts': 18,
        'Mecha': 19,
        'Militar': 20, 'Military': 20,
        'Música': 21, 'Music': 21,
        'Misterio': 22, 'Mystery': 22,
        'Parodia': 23, 'Parody': 23,
        'Policial': 24, 'Police': 24,
        'Psicológico': 25, 'Psychological': 25,
        'Romance': 26,
        'Samurai': 27,
        'Escolares': 28, 'School': 28,
        'Ciencia Ficción': 29, 'Sci-Fi': 29,
        'Seinen': 30,
        'Shoujo': 31,
        'Shoujo Ai': 32,
        'Shounen': 33,
        'Shounen Ai': 34,
        'Slice of Life': 35,
        'Espacio': 36, 'Space': 36,
        'Deportes': 37, 'Sports': 37,
        'Superpoderes': 38, 'Super Power': 38,
        'Sobrenatural': 39, 'Supernatural': 39,
        'Suspenso': 40, 'Thriller': 40,
        'Vampiros': 41, 'Vampire': 41,
        'Yaoi': 42,
        'Yuri': 43
      };

      const typeMap: { [key: string]: number } = {
        'Movie': 1,
        'TV': 2,
        'OVA': 3,
        'ONA': 4,
        'Special': 5,
        'Music': 6
      };

      // Use filter page for advanced directory support
      let url = `${BASE_URL}/filter?keyword=${encodeURIComponent(query)}&page=${page}&sort=${sort}`;
      if (year !== 'all') url += `&year=${year}`;
      
      if (type !== 'all' && typeMap[type]) {
          url += `&type=${typeMap[type]}`;
      }

      if (genre !== 'all' && genreMap[genre]) {
          url += `&genres=${genreMap[genre]}`;
      }
      
      const html = await fetchHtml(url);
      const results: any[] = [];
      
      // Improved regex to capture more info from filter items
      const regex = /<div class="flw-item">[\s\S]*?<img[\s\S]*?src="([^"]+)"[\s\S]*?<h3 class="film-name">[\s\S]*?<a href="\/([^"]+)"[\s\S]*?>([^<]+)<\/a>/gi;
      let match;
      while ((match = regex.exec(html)) !== null) {
        results.push({
          id: match[2],
          title: match[3],
          name: match[3],
          image: match[1],
          source: 'hianime'
        });
      }

      let maxPage = 1;
      const pagesRegex = /href="[^"]*page=(\d+)[^"]*"/g;
      const dataPageRegex = /data-page="(\d+)"/g;
      
      let pageMatch;
      while ((pageMatch = pagesRegex.exec(html)) !== null) {
          const p = parseInt(pageMatch[1], 10);
          if (p > maxPage) maxPage = p;
      }
      while ((pageMatch = dataPageRegex.exec(html)) !== null) {
          const p = parseInt(pageMatch[1], 10);
          if (p > maxPage) maxPage = p;
      }
      
      // HiAnime returns roughly 36 items per page.
      (results as any).totalCount = maxPage > 1 ? maxPage * 36 : results.length;

      return results;
    } catch (e) {
      console.error('[HiAnime] Search error:', e);
      return [];
    }
  },

  async getAnimeInfo(id: string) {
    try {
      const html = await fetchHtml(`${BASE_URL}/${id}`);
      
      const titleMatch = html.match(/<h2 class="film-name">([^<]+)<\/h2>/);
      const imgMatch = html.match(/<img class="film-poster-img" src="([^"]+)"/);
      const descMatch = html.match(/<div class="text">([\s\S]*?)<\/div>/);
      
      // Get internal ID for episodes
      const animeId = id.split('-').pop(); // e.g. "one-piece-100" -> "100"
      
      const episodes: any[] = [];
      try {
          const ajaxUrl = `${BASE_URL}/ajax/v2/episode/list/${animeId}`;
          const ajaxHtml = await fetchHtml(ajaxUrl);
          
          let epListHtml = ajaxHtml;
          if (ajaxHtml.trim().startsWith('{')) {
              try {
                const data = JSON.parse(ajaxHtml);
                epListHtml = data.html || '';
              } catch { epListHtml = ajaxHtml; }
          }
          
          const epRegex = /href="\/watch\/([^"]+)"[\s\S]*?title="Episode (\d+)"/gi;
          let epMatch;
          while ((epMatch = epRegex.exec(epListHtml)) !== null) {
              episodes.push({
                  id: epMatch[1],
                  number: epMatch[2],
                  title: `Episode ${epMatch[2]}`,
                  url: `${BASE_URL}/watch/${epMatch[1]}`
              });
          }
      } catch (e) {
          console.warn('[HiAnime] Failed to fetch episodes:', e);
      }
      
      return {
        id,
        title: titleMatch ? titleMatch[1] : 'English Content',
        image: imgMatch ? imgMatch[1] : '',
        description: descMatch ? descMatch[1].replace(/<[^>]*>?/gm, '').trim() : '',
        source: 'hianime', // Internal ID
        sourceLabel: 'SERVER-ENGLISH', // User facing
        episodes: episodes
      };
    } catch (e) {
      console.error('[HiAnime] Info error:', e);
      return null;
    }
  }
};
