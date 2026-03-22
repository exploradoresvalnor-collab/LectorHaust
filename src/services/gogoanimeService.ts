import { Capacitor } from '@capacitor/core';

export interface GogoSource {
  url: string;
  isM3U8: boolean;
  isIframe?: boolean;
  quality: string;
}

const BASE_URL = 'https://anitaku.pe';
// Utiliza el proxy ya existente para desarrollo web, evadiendo CORS.
const PROXY_URL = 'https://manga-proxy.mchaustman.workers.dev/?url=';

async function fetchHtml(url: string) {
    // Si corre en Capacitor NATIVO (Android/iOS), fetch evade CORS naturalmente.
    if (Capacitor.isNativePlatform()) {
        const resp = await fetch(url);
        if (!resp.ok) throw new Error(`Gogoanime Error: ${resp.status}`);
        return resp.text();
    }
    
    // Si corre en Web (Vite), usamos el proxy de Cloudflare Workers para evadir CORS.
    const proxyUrl = `${PROXY_URL}${encodeURIComponent(url)}`;
    const resp = await fetch(proxyUrl);
    if (!resp.ok) throw new Error(`Proxy Error: ${resp.status}`);
    return resp.text(); 
}

export const gogoanimeService = {
  /**
   * Busca un anime en Gogoanime (Implementación futura si se requiere explorador)
   */
  async search(query: string): Promise<any[]> {
    try {
      console.log(`📡 [GogoanimeNative] Buscando: ${query}`);
      const html = await fetchHtml(`${BASE_URL}/search.html?keyword=${encodeURIComponent(query)}`);
      
      const results: any[] = [];
      const regex = /<p class="name"><a href="\/category\/([^"]+)" title="([^"]+)">/gi;
      let match;
      while ((match = regex.exec(html)) !== null) {
          results.push({
              id: match[1],
              title: match[2]
          });
      }
      
      if (results.length === 0) {
          // Si Gogoanime no tiene el título exacto, limpiar y re-intentar con primeras 2 palabras
          const shortQuery = query.split(' ').slice(0, 2).join(' ');
          if (shortQuery !== query) {
              console.log(`[GogoanimeNative] Reintentando búsqueda con: ${shortQuery}`);
              return this.search(shortQuery);
          }
          const fallbackSlug = query.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
          return [{ id: fallbackSlug, title: query }];
      }
      
      console.log(`✅ [GogoanimeNative] Encontrados ${results.length} resultados.`);
      return results;
    } catch (error) {
       console.error('[GogoanimeNative] Search error:', error);
       const fallbackSlug = query.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
       return [{ id: fallbackSlug, title: query }];
    }
  },

  /**
   * Obtiene la info del anime (Implementación futura)
   */
  async getInfo(id: string) {
     console.warn('[GogoanimeNative] GetInfo no implementada aún en scraper nativo.');
     return null;
  },

  /**
   * Obtiene las fuentes de video: ¡Extrae el Iframe directamente del HTML!
   * A prueba de bloqueos de Cloudflare.
   */
  async getEpisodeSources(episodeId: string, server: string = 'vidcdn'): Promise<{ sources: GogoSource[] } | null> {
    try {
      console.log(`📡 [GogoanimeNative] Scrapeando directamente: ${BASE_URL}/${episodeId}`);
      const html = await fetchHtml(`${BASE_URL}/${episodeId}`);
      
      // Gogoanime incrusta los videos en un iframe, los links están en atributos 'data-video'
      // Extraemos el enlace primario (Vidcdn / Embtaku)
      const match = html.match(/data-video="([^"]+)"/i);
      
      if (!match) {
          throw new Error('No se encontró el iframe de video en el HTML extraído.');
      }
      
      let iframeUrl = match[1];
      if (iframeUrl.startsWith('//')) {
          iframeUrl = 'https:' + iframeUrl;
      }

      console.log(`✅ [GogoanimeNative] ¡Iframe capturado con éxito!: ${iframeUrl}`);

      return {
        sources: [
          {
            url: iframeUrl,
            isM3U8: false,
            isIframe: true, // Flag especial para que el reproductor sepa que usar <iframe>
            quality: 'auto'
          }
        ]
      };
    } catch (error) {
      console.error('[GogoanimeNative] Sources error:', error);
      return null;
    }
  }
};
