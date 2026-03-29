/**
 * interceptor to wrap external image URLs into the Lector Haus Cloudflare Image CDN tunnel.
 * This guarantees HTTP/2 multiplexing, aggressive edge caching (1-year), and bypasses CORS/Hotlink protection.
 */

const WORKER_PROXY_URL = 'https://manga-proxy.mchaustman.workers.dev';

export function proxifyImage(url: string | undefined | null): string {
  if (!url) return '';
  // Avoid double proxifying
  if (url.startsWith(WORKER_PROXY_URL)) return url;
  
  // Return the tunneled URL
  return `${WORKER_PROXY_URL}/?image=${encodeURIComponent(url)}`;
}
