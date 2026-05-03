/**
 * Proxy Service - Manages proxy fallbacks and URL optimization
 */
import { Capacitor } from '@capacitor/core';

const PRIMARY_WORKER = 'https://manga-proxy.mchaustman.workers.dev/';
const SECONDARY_PROXY = 'https://api.allorigins.win/raw?url=';
const TERTIARY_PROXY = 'https://corsproxy.io/?';

const isNative = typeof Capacitor !== 'undefined' && Capacitor.isNativePlatform();

export const proxyService = {
  /**
   * Wrap a URL with a proxy if needed
   */
  proxyUrl(url: string, type: 'image' | 'html' | 'json' = 'html'): string {
    if (!url) return '';
    if (isNative && !url.includes('mangapill.com')) {
      // Native platforms usually don't need proxies for images unless blocked by ISP
      // but MangaPill always needs it due to referer/headers.
      return url;
    }

    const encoded = encodeURIComponent(url);
    if (type === 'image') {
      return `${PRIMARY_WORKER}?image=${encoded}`;
    }
    return `${PRIMARY_WORKER}?url=${encoded}`;
  },

  /**
   * Fetch through proxy with fallback
   */
  async fetchProxied(url: string, type: 'html' | 'json' = 'html', options: RequestInit = {}): Promise<string | any> {
    const primary = this.proxyUrl(url, type);
    
    try {
      const resp = await fetch(primary, options);
      if (resp.ok) {
        return type === 'json' ? resp.json() : resp.text();
      }
      throw new Error(`Primary proxy failed: ${resp.status}`);
    } catch (err) {
      console.warn(`[Proxy] Primary failed for ${url}, trying Secondary...`);
      const secondary = `${SECONDARY_PROXY}${encodeURIComponent(url)}`;
      try {
        const resp = await fetch(secondary, options);
        if (resp.ok) {
          return type === 'json' ? resp.json() : resp.text();
        }
      } catch (secErr) {
        console.warn(`[Proxy] Secondary failed for ${url}, trying Tertiary...`);
        const tertiary = `${TERTIARY_PROXY}${encodeURIComponent(url)}`;
        const resp = await fetch(tertiary, options);
        if (resp.ok) {
          return type === 'json' ? resp.json() : resp.text();
        }
        throw new Error('All proxies failed');
      }
    }
  }
};
