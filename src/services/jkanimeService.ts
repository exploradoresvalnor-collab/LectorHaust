import { Capacitor } from '@capacitor/core';

export interface JKSource {
  url: string;
  isIframe?: boolean;
  serverName: string;
}

const BASE_URL = 'https://jkanime.net';
const PROXY_URL = 'https://manga-proxy.mchaustman.workers.dev/?url=';

async function fetchHtml(url: string, options: RequestInit = {}) {
    // Si es nativo (Android/iOS), NO hay problemas de CORS, vamos DIRECTO por velocidad y fiabilidad.
    if (Capacitor.isNativePlatform()) {
        try {
            const directResp = await fetch(url, options);
            if (directResp.ok) return directResp.text();
        } catch (e) {
            console.warn(`[JKAnime] Direct fetch failed on native, trying proxy...`);
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

export const jkanimeService = {
  
  async search(query: string = '', page: number = 1, genre: string = 'all', type: string = 'all', year: string = 'all', sort: string = 'default', language: string = 'sub-es', status: string = 'all') {
    try {
      const results: any[] = [];
      let totalCount = 0;

      // If there is an explicit text query, JKAnime forces us to use the /buscar/ URL with HTML page processing
      if (query && query !== 'latino') {
          const url = `${BASE_URL}/buscar/${encodeURIComponent(query)}/${page}/`;
          const html = await fetchHtml(url);
          
          const regex = /<div class="[^"]*anime__item">[\s\S]*?<a\s+href="https:\/\/jkanime\.net\/([^/]+)\/">[\s\S]*?<div class="[^"]*anime__item__pic[^"]*" data-setbg="([^"]+)"[^>]*>[\s\S]*?<h5><a[^>]*>([^<]+)<\/a><\/h5>/gi;
          let match;
          while ((match = regex.exec(html)) !== null) {
            results.push({
              id: match[1],
              title: match[3].trim(),
              name: match[3].trim(),
              image: match[2],
              source: 'jkanime',
              status: 'Serie',
              type: 'Anime'
            });
          }
          // Note: HTML search doesn't return exact total bounds easily, so we just return results
      } else {
          // DIRECTORY FILTERS (JSON INJECTION) - BLAZING FAST
          let dirUrl = `${BASE_URL}/directorio?p=${page}`;
          
          if (genre !== 'all') {
              const genreMap: Record<string, string> = {
                  'Acción': 'accion', 'Aventura': 'aventura', 'Comedia': 'comedia', 'Demonios': 'demonios', 'Misterio': 'misterio', 'Drama': 'drama', 'Ecchi': 'ecchi', 'Fantasía': 'fantasia', 'Militar': 'militar', 'Romance': 'romance', 'Magia': 'magia', 'Deportes': 'deportes', 'Suspenso': 'thriller', 'Sobrenatural': 'sobrenatural', 'Ciencia Ficción': 'sci-fi'
              };
              if (genreMap[genre]) dirUrl += `&genero=${genreMap[genre]}`;
          }
          
          if (year !== 'all') dirUrl += `&fecha=${year}`;
          if (type !== 'all') {
             const typeMap: Record<string, string> = { 'tv': 'animes', 'movie': 'peliculas', 'special': 'especiales', 'ova': 'ovas', 'ona': 'onas' };
             if (typeMap[type]) dirUrl += `&tipo=${typeMap[type]}`;
          }
          
          if (sort === 'rating') dirUrl += `&filtro=popularidad&orden=`;
          else if (sort === 'title') dirUrl += `&filtro=nombre&orden=asc`;
          else dirUrl += `&filtro=&orden=`; // latest by default
          
          if (language === 'latino' || query === 'latino') dirUrl += `&categoria=latino`;
          if (status !== 'all') dirUrl += `&estado=${status}`; // emision, finalizados, estrenos

          const html = await fetchHtml(dirUrl);
          const jsonMatch = html.match(/var\s+animes\s*=\s*(\{.*?\});/);
          
          if (jsonMatch && jsonMatch[1]) {
            const parsed = JSON.parse(jsonMatch[1]);
            totalCount = parsed.total || 0;
            if (parsed.data && Array.isArray(parsed.data)) {
              for (const item of parsed.data) {
                results.push({
                  id: item.slug,
                  title: item.title,
                  name: item.title,
                  image: item.image,
                  source: 'jkanime',
                  status: item.estado,
                  type: item.tipo
                });
              }
            }
          }
      }

      // Attach totalCount metric directly to array (just like animeflv) so AnimeDirectoryPage can consume it
      (results as any).totalCount = totalCount > 0 ? totalCount : results.length;
      return results;
    } catch (e) {
      console.error('[S-C] Advanced Directory Search error:', e);
      return [];
    }
  },

  async getTrendingAnime() {
    try {
      const url = `${BASE_URL}/directorio/`;
      const html = await fetchHtml(url);
      
      const results: any[] = [];
      const jsonMatch = html.match(/var\s+animes\s*=\s*(\{.*?\});/);
      
      if (jsonMatch && jsonMatch[1]) {
        const dataStr = jsonMatch[1];
        const parsed = JSON.parse(dataStr);
        if (parsed && parsed.data && Array.isArray(parsed.data)) {
          for (const item of parsed.data.slice(0, 15)) {
            results.push({
              id: item.slug,
              title: item.title,
              name: item.title,
              image: item.image,
              source: 'jkanime',
              status: item.estado,
              type: item.tipo
            });
          }
        }
      }
      return results;
    } catch (e) {
      console.error('[S-C] Trending fallback error:', e);
      return [];
    }
  },

  async getAnimeInfo(id: string) {
    try {
      const html = await fetchHtml(`${BASE_URL}/${id}/`);
      
      // Extract Metadata (Updated for JKAnime's new HTML structure 2026)
      let title = id;
      // New: Title is inside <div class="anime_info"> <h3>Title</h3>
      const titleMatch = html.match(/<div class="[^"]*anime_info[^"]*"[\s\S]*?<h3[^>]*>([^<]+)<\/h3>/);
      if (titleMatch) title = titleMatch[1].trim();

      let image = '';
      // New: Image is a standard <img> inside <div class="anime_pic">
      const imgMatch = html.match(/<div class="[^"]*anime_pic[^"]*"[\s\S]*?<img[^>]+src="([^"]+)"/);
      if (imgMatch) image = imgMatch[1];
      // Fallback: Try data-setbg pattern (legacy)
      if (!image) {
        const imgMatch2 = html.match(/data-setbg="([^"]+)"/);
        if (imgMatch2) image = imgMatch2[1];
      }

      let description = 'Sin descripción';
      // Try to find the synopsis/description paragraph
      const descMatch = html.match(/<p class="[^"]*">([^<]{20,})<\/p>/);
      if (descMatch) {
        description = descMatch[1].replace(/<[^>]+>/g, '').trim();
      } else {
        // Fallback: first long paragraph
        const descMatch2 = html.match(/<p>([^<]{30,})<\/p>/);
        if (descMatch2) description = descMatch2[1].replace(/<[^>]+>/g, '').trim();
      }

      // Extract episode count (Multiple strategies)
      let lastCap = 0;
      
      // 1. New: Extract from "Episodios: N" in info list
      const epCountMatch = html.match(/Episodios:\s*<\/span>\s*(\d+)/i) || html.match(/Episodios:<\/span>\s*(\d+)/i);
      if (epCountMatch) lastCap = parseInt(epCountMatch[1]);

      // 2. Fallback: Check for var last_cap (legacy)
      if (lastCap === 0) {
        const lastCapVarMatch = html.match(/var\s+last_cap\s*=\s*["']?(\d+)["']?/);
        if (lastCapVarMatch) lastCap = parseInt(lastCapVarMatch[1]);
      }
      
      // 3. Fallback: Look for episode count in AJAX pagination scripts
      if (lastCap === 0) {
        const paginationMatch = html.match(/paginar\((\d+)\)/);
        if (paginationMatch) lastCap = parseInt(paginationMatch[1]);
      }

      // 4. Fallback: Search for "Último episodio" text
      if (lastCap === 0) {
          const lastCapTextMatch = html.match(/Último episodio[\s\S]*?(\d+)(?:\/| |"|<)/i);
          if (lastCapTextMatch) lastCap = parseInt(lastCapTextMatch[1]);
      }

      // 5. Fallback: Count episode links/items in the page
      if (lastCap === 0) {
          const epLinks = html.match(new RegExp(`${id}/(\\d+)/`, 'g'));
          if (epLinks && epLinks.length > 0) {
              const nums = epLinks.map(l => parseInt(l.match(/(\d+)\/$/)?.[1] || '0'));
              lastCap = Math.max(...nums);
          }
      }

      let episodes: any[] = [];
      if (lastCap > 0) {
          for (let i = 1; i <= lastCap; i++) {
              episodes.push({
                  id: `${id}-${i}`,
                  number: i.toString(),
                  title: `Episodio ${i}`
              });
          }
      }

      return {
        id,
        title,
        name: title,
        image,
        description,
        totalEpisodes: lastCap,
        status: html.includes('Concluido') || html.includes('Finalizado') ? 'Finished' : 'Airing',
        episodes: episodes.sort((a, b) => parseInt(b.number) - parseInt(a.number))
      };
      
    } catch (e) {
      console.error('[S-C] Info error:', e);
      return null;
    }
  },

  async getEpisodeSources(episodeUrl: string): Promise<{ sources: JKSource[] } | null> {
    try {
      // episodeUrl should be like "slug/number"
      const html = await fetchHtml(`${BASE_URL}/${episodeUrl}/`);
      
      const sources: JKSource[] = [];
      
      // JKAnime embeds servers in the HTML, often inside a script or a list of links
      // They use a player called "jkplayer"
      const playerMatch = html.match(/video\[(\d+)\] = '<iframe[^>]*src="([^"]+)"/g);
      
      if (playerMatch) {
          playerMatch.forEach(m => {
              const srcMatch = m.match(/src="([^"]+)"/);
              if (srcMatch) {
                  let url = srcMatch[1];
                  if (url.startsWith('//')) url = 'https:' + url;
                  
                  // Identify server name from URL
                  let serverName = 'Global';
                  if (url.includes('mega.nz')) serverName = 'Mega';
                  else if (url.includes('ok.ru')) serverName = 'Okru';
                  else if (url.includes('desu')) serverName = 'JKDesu';
                  
                  sources.push({
                      url: url,
                      isIframe: true,
                      serverName: serverName
                  });
              }
          });
      }

      return { sources };
    } catch (e) {
      console.error('[S-C] Sources error:', e);
      return null;
    }
  }
};
