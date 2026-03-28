import { Capacitor } from '@capacitor/core';

const BASE_URL = 'https://hianime.to';
const PROXY_URLS = [
  'https://api.allorigins.win/raw?url=',
  'https://corsproxy.io/?',
  'https://api.codetabs.com/v1/proxy?quest='
];

async function fetchHtml(url: string) {
  let lastError: any;
  
  for (const proxy of PROXY_URLS) {
    try {
      const proxyUrl = `${proxy}${encodeURIComponent(url)}`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12000);
      
      const resp = await fetch(proxyUrl, { signal: controller.signal });
      clearTimeout(timeoutId);
      
      if (resp.ok) {
        const text = await resp.text();
        // Validate: Must contain at least some HiAnime/Gogo signatures
        if (text.includes('flw-item') || text.includes('film-name') || text.includes('ep-item') || text.includes('movie-id') || text.includes('episode')) {
          return text;
        }
        console.warn(`[HiAnime] Proxy ${proxy} returned invalid content, trying next...`);
      }
    } catch (e) {
      console.warn(`[HiAnime] Proxy ${proxy} failed:`, e);
      lastError = e;
    }
  }

  // Final Attempt: Native Direct (If on Capacitor)
  if (Capacitor.isNativePlatform()) {
    try {
      const resp = await fetch(url);
      if (resp.ok) return resp.text();
    } catch (e) {}
  }
  
  throw lastError || new Error(`Failed to fetch: ${url}`);
}

export const hianimeService = {
  async search(query: string, page: number = 1, year: string = 'all', genre: string = 'all', sort: string = 'recently_updated') {
    try {
      // Use filter page for advanced directory support
      let url = `${BASE_URL}/filter?keyword=${encodeURIComponent(query)}&page=${page}&sort=${sort}`;
      if (year !== 'all') url += `&year=${year}`;
      // Note: genre in HiAnime filter is by ID usually, but keyword works as fallback for many
      
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
