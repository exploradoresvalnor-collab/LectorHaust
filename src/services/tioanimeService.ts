import { Capacitor } from '@capacitor/core';

export interface TioSource {
  url: string;
  isIframe?: boolean;
  serverName: string;
}

const BASE_URL = 'https://tioanime.com';
const PROXY_URL = 'https://manga-proxy.mchaustman.workers.dev/?url=';

/**
 * Helper to fetch HTML content with timeout and proxy support (consistent with animeflvService)
 */
async function fetchHtml(url: string) {
    // Si es nativo (Android/iOS), NO hay problemas de CORS, vamos DIRECTO por velocidad y fiabilidad.
    if (Capacitor.isNativePlatform()) {
        try {
            const directResp = await fetch(url);
            if (directResp.ok) return await directResp.text();
        } catch (e) {
            console.warn(`[TioAnime] Direct fetch failed on native, trying proxy...`);
        }
    }

    const proxyUrl = `${PROXY_URL}${encodeURIComponent(url)}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 second timeout
    
    try {
        const resp = await fetch(proxyUrl, { signal: controller.signal });
        clearTimeout(timeoutId);
        
        if (!resp.ok) {
            throw new Error(`Proxy Error: ${resp.status}`);
        }
        return await resp.text(); 
    } catch (e) {
        clearTimeout(timeoutId);
        throw e;
    }
}

export const tioanimeService = {
  
  async getLatestEpisodes() {
    try {
      const html = await fetchHtml(`${BASE_URL}/`);
      const results: any[] = [];
      
      // Updated regex based on actual S-T structure
      /**
       * Regex to match Latest Episode Cards
       * Groups: 1: Slug, 2: Image URL, 3: Full Title (Alt), 4: H3 Title
       */
      const regex = /<article class="episode">[\s\S]*?<a href="\/ver\/([^"]+)">[\s\S]*?<img src="([^"]+)" alt="([^"]+)">[\s\S]*?<h3 class="title">([^<]+)<\/h3>/gi;
      
      let match;
      while ((match = regex.exec(html)) !== null && results.length < 20) {
        let imgUrl = match[2];
        if (imgUrl.startsWith('/')) imgUrl = `${BASE_URL}${imgUrl}`;
        
        const epId = match[1]; // e.g. "mayonaka-heart-tune-12"
        const fullTitle = match[4].trim(); // e.g. "Mayonaka Heart Tune 12"
        
        // Use Photon proxy for faster image delivery
        const proxiedImg = `https://i0.wp.com/${imgUrl.replaceAll(/^https?:\/\//g, '')}`;
        
        // Extract episode number from end of title
        const numMatch = fullTitle.match(/\d+$/);
        const epNum = numMatch ? numMatch[0] : '1';
        const animeName = fullTitle.replace(/\s\d+$/, '').trim();
        const animeId = epId.substring(0, epId.lastIndexOf('-'));

        results.push({
          id: epId,
          number: epNum,
          animeId: animeId,
          animeName: animeName,
          title: `Episodio ${epNum}`,
          animePoster: proxiedImg
        });
      }
      return results;
    } catch (e) {
      console.error('[S-T] Latest episodes error:', e);
      return [];
    }
  },

  async getLatestAnimes() {
    try {
      const html = await fetchHtml(`${BASE_URL}/`);
      const results: any[] = [];
      
      // Look for "Últimos Animes" section
      // Pattern: <article class="anime"> ... <a href="/anime/slug"> ... <img src="/uploads/portadas/slug.jpg" ... <h3 class="title">Anime Name</h3>
      const regex = /<article class="anime">[\s\S]*?<a href="\/anime\/([^"]+)">[\s\S]*?<img src="([^"]+)"[\s\S]*?<h3 class="title">([^<]+)<\/h3>/gi;
      
      let match;
      while ((match = regex.exec(html)) !== null && results.length < 20) {
        let imgUrl = match[2];
        if (imgUrl.startsWith('/')) imgUrl = `${BASE_URL}${imgUrl}`;
        const proxiedImg = `https://i0.wp.com/${imgUrl.replace(/^https?:\/\//, '')}`;
        
        results.push({
          id: match[1],
          title: match[3],
          name: match[3],
          image: proxiedImg,
          sources: ['TI'],
          hasDub: true
        });
      }
      return results;
    } catch (e) {
      console.error('[S-T] Latest animes error:', e);
      return [];
    }
  },

  async search(query: string = '') {
    try {
      const url = `${BASE_URL}/directorio?q=${encodeURIComponent(query)}`;
      const html = await fetchHtml(url);
      
      const results: any[] = [];
      // Pattern: <article class="anime"> ... <a href="/anime/slug"> ... <img src="/uploads/portadas/slug.jpg" ... <h3 class="title">Anime Name</h3>
      const regex = /<article class="anime">[\s\S]*?<a href="\/anime\/([^"]+)">[\s\S]*?<img src="([^"]+)"[\s\S]*?<h3 class="title">([^<]+)<\/h3>/gi;
      
      let match;
      while ((match = regex.exec(html)) !== null) {
        let imgUrl = match[2];
        if (imgUrl.startsWith('/')) imgUrl = `${BASE_URL}${imgUrl}`;
        // Proxied image for high performance
        const proxiedImg = `https://i0.wp.com/${imgUrl.replace(/^https?:\/\//, '')}`;
        
        results.push({
          id: match[1],
          title: match[3],
          name: match[3],
          image: proxiedImg,
          sources: ['TI'],
          hasDub: true
        });
      }
      return results;
    } catch (e) {
      console.error('[S-T] Search error:', e);
      return [];
    }
  },

  async getAnimeInfo(id: string) {
    try {
      const html = await fetchHtml(`${BASE_URL}/anime/${id}`);
      
      // Extract Metadata
      let title = id;
      const titleMatch = html.match(/<h1 class="title">([^<]+)<\/h1>/);
      if (titleMatch) title = titleMatch[1];

      let image = '';
      const imgMatch = html.match(/<div class="thumb-anime">[\s\S]*?<img src="([^"]+)"/);
      if (imgMatch) {
         image = imgMatch[1];
         if (image.startsWith('/')) image = `${BASE_URL}${image}`;
         // Proxy for details view as well
         image = `https://i0.wp.com/${image.replace(/^https?:\/\//, '')}`;
      }

      let description = 'Sin descripción';
      const descMatch = html.match(/<p class="sinopsis">([\s\S]*?)<\/p>/);
      if (descMatch) description = descMatch[1].replace(/<[^>]+>/g, '').trim();

      // Extract Episodes from var episodes
      let episodes: any[] = [];
      const epMatch = html.match(/var episodes = (\[.*?\]);/);
      if (epMatch) {
         const epData = JSON.parse(epMatch[1]);
         // epData format: [num, "id", ...]
         episodes = epData.map((num: number) => ({
             id: `${id}-${num}`,
             number: num,
             title: `Episodio ${num}`
         }));
      }

      return {
        id,
        title,
        name: title,
        image,
        description,
        totalEpisodes: episodes.length,
        status: html.includes('Finalizado') ? 'Finished' : 'Airing',
        episodes: episodes.sort((a, b) => b.number - a.number) // Sort descending by default
      };
      
    } catch (e) {
      console.error('[S-T] Info error:', e);
      return null;
    }
  },

  async getEpisodeSources(episodeId: string): Promise<{ sources: TioSource[] } | null> {
    try {
      const html = await fetchHtml(`${BASE_URL}/ver/${episodeId}`);
      
      // Extract videos from var videos = [...]
      const match = html.match(/var videos = (\[.*?\]);/);
      if (!match) throw new Error('No videos found');
      
      const videosData = JSON.parse(match[1]);
      // Format: [ ["Server", "Code", "Type", ...], ... ]
      
      const sources: TioSource[] = videosData.map((v: any[]) => {
          let url = v[1];
          const server = v[0].toLowerCase();
          
          // Some clean URLs need to be prefixed
          if (url.startsWith('//')) url = 'https:' + url;
          else if (!url.startsWith('http')) {
              if (server === 'okru') url = `https://ok.ru/videoembed/${url}`;
          }

          return {
              url: url,
              isIframe: true,
              serverName: server
          };
      });

      return { sources };
    } catch (e) {
      console.error('[S-T] Sources error:', e);
      return null;
    }
  }
};
