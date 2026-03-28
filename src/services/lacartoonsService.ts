import { Capacitor } from '@capacitor/core';

const BASE_URL = 'https://lacartoons.com';
const PROXY_URL = 'https://manga-proxy.mchaustman.workers.dev/?url='; // Fallback for browser testing

async function fetchHtml(url: string) {
  if (!Capacitor.isNativePlatform()) {
     // Web fallback: go straight to proxy to avoid scary CORS console errors
     try {
       const proxyUrl = `${PROXY_URL}${encodeURIComponent(url)}`;
       const resp = await fetch(proxyUrl);
       if (resp.ok) return await resp.text();
     } catch (err) {
       console.error('[LACartoons] Proxy fetch failed:', err);
     }
     throw new Error(`Failed to fetch: ${url}`);
  }

  // Native mobile environment
  try {
    const resp = await fetch(url);
    if (!resp.ok) throw new Error('Native fetch failed');
    return await resp.text();
  } catch (e) {
    console.warn('[LACartoons] Native fetch failed:', e);
    throw e;
  }
}

export const lacartoonsService = {
  async search(query: string = '', page: number = 1, category: string = 'all') {
    try {
      // LACartoons pagination and search. 
      // If a category is selected (e.g. 1 for Nickelodeon), it ignores query
      let queryParam = query ? `?Titulo=${encodeURIComponent(query)}` : ``;
      
      if (category !== 'all') {
         queryParam = `?Categoria_id=${category}`;
      }

      const hasQs = queryParam.includes('?');
      if (page > 1) {
         queryParam += hasQs ? `&pagina=${page}` : `?pagina=${page}`;
      }
      
      const url = `${BASE_URL}/${queryParam}`;
      
      const html = await fetchHtml(url);
      const doc = new DOMParser().parseFromString(html, 'text/html');
      
      const results: any[] = [];
      const items = Array.from(doc.querySelectorAll('a[href*="/serie/"]'));
      
      const seenIds = new Set();

      items.forEach(item => {
        const href = item.getAttribute('href') || '';
        // Extract ID from https://lacartoons.com/serie/algo
        const idMatch = href.match(/\/serie\/([^\/]+)/);
        if (!idMatch) return;
        
        const id = idMatch[1];
        if (seenIds.has(id) || id === 'capitulo') return; // Skip dupes and sub-episode links
        
        const imgEl = item.querySelector('img');
        const titleEl = item.querySelector('h3, h2, .title, h4') || imgEl;
        
        let title = '';
        if (titleEl === imgEl) {
            title = imgEl?.getAttribute('alt') || 'Desconocido';
        } else {
            title = titleEl?.textContent?.trim() || 'Desconocido';
        }

        let image = imgEl?.getAttribute('src') || '';
        if (image.startsWith('/')) image = `${BASE_URL}${image}`;

        if (id && title && image) {
            seenIds.add(id);
            results.push({
                id,
                title,
                name: title,
                image,
                source: 'lacartoons'
            });
        }
      });
      
      // Since LACartoons doesn't always expose total pages clearly in standard search,
      // we'll estimate or just provide what we found.
      (results as any).totalCount = results.length;
      
      return results;
    } catch (e) {
      console.error('[LACartoons] Search error:', e);
      return [];
    }
  },

  async getAnimeInfo(id: string) {
    try {
      const url = `${BASE_URL}/serie/${id}`;
      const html = await fetchHtml(url);
      const doc = new DOMParser().parseFromString(html, 'text/html');
      
      // Look for main title
      const titleEl = doc.querySelector('h1, h2, .serie-title, h2.subtitulo-serie-seccion');
      let title = titleEl ? titleEl.textContent?.trim().split('\n')[0] : id;
      
      // Look for poster
      const imgEl = doc.querySelector('.poster img, img.poster, .serie-cover img, .imagen-serie img, .all-serie img');
      let image = imgEl?.getAttribute('src') || '';
      if (image.startsWith('/')) image = `${BASE_URL}${image}`;
      
      // Look for description
      const descEls = Array.from(doc.querySelectorAll('.description, .sinopsis, p, .informacion-serie-seccion p span'));
      let description = '';
      descEls.forEach(el => {
         const txt = el.textContent?.trim() || '';
         if (txt.length > description.length && !txt.includes('Episodios') && !txt.includes('Idioma')) {
            description = txt;
         }
      });

      // Get episodes, group by season
      const episodes: any[] = [];
      
      // Many cartoon sites group episodes by season headers or ul/li lists.
      // We will look for all episode links. LACartoons links follow: /serie/capitulo/X?t=Y
      const epLinks = Array.from(doc.querySelectorAll('a[href*="/serie/capitulo/"]'));
      
      epLinks.forEach(link => {
          const href = link.getAttribute('href') || '';
          
          // Try to extract season
          let seasonMatch = href.match(/t=(\d+)/i);
          let season = seasonMatch ? seasonMatch[1] : '1';
          
          // Try to extract episode ID / number
          let epIdMatch = href.match(/\/capitulo\/([^\?]+)/);
          if (!epIdMatch) return;
          
          let epId = epIdMatch[1];
          let numberStr = link.textContent?.trim() || epId;
          // Extract just the number if possible (e.g. "Capitulo 15" -> "15")
          let numMatch = numberStr.match(/\d+/);
          let number = numMatch ? numMatch[0] : epId;

          // Push to episodes array with season metadata attached
          episodes.push({
             id: `${epId}?t=${season}`, // Keep full identifying suffix
             number,
             title: `T${season} - Ep ${number}`,
             season: season,
             url: href
          });
      });

      // Sort episodes logically
      episodes.sort((a, b) => {
          if (parseInt(a.season) !== parseInt(b.season)) {
              return parseInt(a.season) - parseInt(b.season);
          }
          return parseInt(a.number) - parseInt(b.number);
      });

      return {
        id,
        title,
        image,
        description,
        source: 'lacartoons',
        sourceLabel: 'CARICATURAS (LATINO)',
        episodes
      };
    } catch (e) {
      console.error('[LACartoons] Info error:', e);
      return null;
    }
  },

  async getEpisodeSources(episodeId: string) {
    try {
        // episodeId might be "bob-esponja-1?t=1"
        const url = `${BASE_URL}/serie/capitulo/${episodeId}`;
        const html = await fetchHtml(url);
        const doc = new DOMParser().parseFromString(html, 'text/html');

        const sources: { server: string; url: string }[] = [];
        
        // Find iframe
        const iframe = doc.querySelector('iframe');
        if (iframe) {
            let src = iframe.getAttribute('src') || '';
            if (src) {
                if (src.startsWith('//')) src = `https:${src}`;
                sources.push({
                    server: 'LACartoons Server',
                    url: src
                });
            }
        }
        
        // Try looking for video tags or nested iframes inside hidden divs (common in anti-bot)
        if (sources.length === 0) {
           const allFrames = Array.from(doc.querySelectorAll('iframe, video source'));
           allFrames.forEach((el, index) => {
               let src = el.getAttribute('src') || '';
               if (src) {
                  if (src.startsWith('//')) src = `https:${src}`;
                  sources.push({
                      server: `Video ${index + 1}`,
                      url: src
                  });
               }
           });
        }

        return sources;
    } catch (e) {
        console.error('[LACartoons] Source error:', e);
        return [];
    }
  }
};
