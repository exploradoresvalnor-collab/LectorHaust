import { Capacitor } from '@capacitor/core';

export interface JKSource {
  url: string;
  isIframe?: boolean;
  serverName: string;
}

const BASE_URL = 'https://jkanime.net';
const PROXY_URL = 'https://manga-proxy.mchaustman.workers.dev/?url=';

async function fetchHtml(url: string) {
    const proxyUrl = `${PROXY_URL}${encodeURIComponent(url)}`;
    const resp = await fetch(proxyUrl);
    if (!resp.ok) {
        if (Capacitor.isNativePlatform()) {
            const directResp = await fetch(url);
            if (directResp.ok) return directResp.text();
        }
        throw new Error(`Proxy Error: ${resp.status}`);
    }
    return resp.text(); 
}

export const jkanimeService = {
  
  async search(query: string = '') {
    try {
      // S-C uses a /buscar/term/ structure for full results
      const url = `${BASE_URL}/buscar/${encodeURIComponent(query)}/1/`;
      const html = await fetchHtml(url);
      
      const results: any[] = [];
      // Pattern based on S-C search results
      const regex = /<div class="anime__item">[\s\S]*?<a href="https:\/\/jkanime\.net\/([^/]+)\/">[\s\S]*?<div class="anime__item__pic set-bg" data-setbg="([^"]+)">[\s\S]*?<h5><a[^>]*>([^<]+)<\/a><\/h5>/gi;
      
      let match;
      while ((match = regex.exec(html)) !== null) {
        let imgUrl = match[2];
        results.push({
          id: match[1],
          title: match[3].trim(),
          name: match[3].trim(),
          image: imgUrl,
          source: 'jkanime'
        });
      }
      return results;
    } catch (e) {
      console.error('[S-C] Search error:', e);
      return [];
    }
  },

  async getTrendingAnime() {
    try {
      // Scrape recent anime from S-C directory or homepage
      const url = `${BASE_URL}/directorio/`;
      const html = await fetchHtml(url);
      
      const results: any[] = [];
      const regex = /<div class="anime__item">[\s\S]*?<a href="https:\/\/jkanime\.net\/([^/]+)\/">[\s\S]*?<div class="anime__item__pic set-bg" data-setbg="([^"]+)">[\s\S]*?<h5><a[^>]*>([^<]+)<\/a><\/h5>/gi;
      
      let match;
      // limited to 15 for carousel performance
      while ((match = regex.exec(html)) !== null && results.length < 15) {
        results.push({
          id: match[1],
          title: match[3].trim(),
          name: match[3].trim(),
          image: match[2],
          source: 'jkanime'
        });
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
      
      // Extract Metadata
      let title = id;
      const titleMatch = html.match(/<div class="anime__details__title">[\s\S]*?<h3>([^<]+)<\/h3>/);
      if (titleMatch) title = titleMatch[1].trim();

      let image = '';
      const imgMatch = html.match(/<div class="anime__details__pic set-bg" data-setbg="([^"]+)"/);
      if (imgMatch) image = imgMatch[1];

      let description = 'Sin descripción';
      const descMatch = html.match(/<p>([\s\S]*?)<\/p>/);
      if (descMatch) description = descMatch[1].replace(/<[^>]+>/g, '').trim();

      // Extract Anime ID and current page for episodes
      // S-C often uses a script like: var id_anime = "123";
      const idMatch = html.match(/var id_anime = "(\d+)";/);
      const animeId = idMatch ? idMatch[1] : null;

      let episodes: any[] = [];
      if (animeId) {
          // Fetch first 100 episodes via their AJAX endpoint
          const ajaxUrl = `${BASE_URL}/ajax/pagination_episodes/${animeId}/1/`;
          const ajaxHtml = await fetchHtml(ajaxUrl);
          
          // Match episodes: <a href="https://jkanime.net/slug/num/"> ... <span>num</span>
          const epRegex = /<a href="https:\/\/jkanime\.net\/[^/]+\/(\d+)\/">[\s\S]*?<span>(\d+)<\/span>/gi;
          let epMatch;
          while ((epMatch = epRegex.exec(ajaxHtml)) !== null) {
              episodes.push({
                  id: `${id}-${epMatch[1]}`,
                  number: epMatch[1],
                  title: `Episodio ${epMatch[1]}`
              });
          }
      }

      return {
        id,
        title,
        name: title,
        image,
        description,
        totalEpisodes: episodes.length,
        status: html.includes('Finalizado') ? 'Finished' : 'Airing',
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
