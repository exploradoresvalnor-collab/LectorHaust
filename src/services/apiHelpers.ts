/**
 * Shared HTTP helpers for secondary APIs (AniList, Jikan, Kitsu, Consumet).
 * MangaDex uses its own apiFetch with rate-limiting and retries — DO NOT replace it.
 */
import { Capacitor } from '@capacitor/core';

/**
 * GET request with JSON parsing, error handling, and configurable timeout.
 */
export async function fetchJSON<T = any>(url: string, options?: RequestInit & { timeoutMs?: number }): Promise<T> {
  const { timeoutMs = 12000, ...fetchOptions } = options || {};
  
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      ...fetchOptions,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${url}`);
    }

    return response.json();
  } catch (err: any) {
    if (err.name === 'AbortError') {
      throw new Error(`Timeout (${timeoutMs}ms): ${url}`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * POST a GraphQL query (for AniList).
 * Reduced timeout: AniList is non-essential, fail fast if rate-limited or slow
 */
export async function postGraphQL<T = any>(
  url: string,
  query: string,
  variables: Record<string, any> = {},
  timeoutMs = 5000 // Reduced from 15s to 5s (AniList is background/non-essential)
): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  
  const isNative = typeof Capacitor !== 'undefined' && Capacitor.isNativePlatform();

    try {
      const finalUrl = isNative
        ? url
        : (import.meta.env.DEV && url.includes('anilist.co')) 
          ? '/api-anilist'  // Vite proxy
          : url;

      console.log(`[postGraphQL] Requesting: ${finalUrl} (${isNative ? 'native' : 'proxy'})`);

      const response = await fetch(finalUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        signal: controller.signal,
        body: JSON.stringify({ query, variables }),
      });

      console.log(`[postGraphQL] Response: ${response.status}`);

      if (!response.ok) {
        // --- EMERGENCY FALLBACK TO WORKER (Local Dev Fix) ---
        // Only try fallback if proxy explicitly failed (not on native or prod)
        if (!isNative && import.meta.env.DEV && (response.status === 404 || response.status === 503)) {
           console.warn(`[AniList] Local Proxy returned ${response.status}. Attempting Tunnel Fallback...`);
           const WORKER_PROXY_BASE = 'https://manga-proxy.mchaustman.workers.dev/?url=';
           const fallbackUrl = `${WORKER_PROXY_BASE}${encodeURIComponent(url)}`;
           
           try {
             const fallbackResp = await fetch(fallbackUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query, variables }),
                signal: AbortSignal.timeout(8000) // 8s timeout for fallback
             });
             
             if (fallbackResp.ok) {
               console.log('[AniList] ✅ Worker Fallback succeeded');
               return await fallbackResp.json();
             } else {
               console.warn(`[AniList] Worker Fallback returned ${fallbackResp.status}`);
             }
           } catch (fallbackErr) {
             console.warn('[AniList] Worker Fallback failed:', fallbackErr instanceof Error ? fallbackErr.message : fallbackErr);
           }
        }
        throw new Error(`GraphQL HTTP ${response.status}: ${url}`);
      }

      const data = await response.json();
      console.log(`[postGraphQL] ✅ Success`);
      return data;
    } catch (err: any) {
      // Re-intentar con tunel si el error fue de conexión directa
      if (!isNative && import.meta.env.DEV && err.name !== 'AbortError' && !err.message?.includes('429')) {
         try {
            console.warn('[AniList] Connection error locally. Attempting Tunnel Fallback...');
            const WORKER_PROXY_BASE = 'https://manga-proxy.mchaustman.workers.dev/?url=';
            const fallbackUrl = `${WORKER_PROXY_BASE}${encodeURIComponent(url)}`;
            const fallbackResp = await fetch(fallbackUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query, variables }),
                signal: AbortSignal.timeout(8000)
            });
            if (fallbackResp.ok) {
              console.log('[AniList] ✅ Worker Fallback succeeded');
              return await fallbackResp.json();
            }
         } catch (fallbackErr) {
            /* ignore fallback error, throw original */
            console.warn('[AniList] Worker Fallback also failed');
         }
      }

      if (err.name === 'AbortError') {
        console.error(`[postGraphQL] ⏱️ Timeout (${timeoutMs}ms): ${url}`);
        throw new Error(`GraphQL Timeout (${timeoutMs}ms): ${url}`);
      }
      console.error(`[postGraphQL] ❌ Error:`, err.message);
      throw err;
    } finally {
      clearTimeout(timer);
    }
}
