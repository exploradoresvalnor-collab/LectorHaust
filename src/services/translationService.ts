/**
 * Translation Service (AI-Powered)
 * Uses a lightweight, fast, and free translation API to convert non-Spanish descriptions to Spanish.
 * Includes a local cache to avoid redundant network requests.
 */

const CACHE_PREFIX = 'tr_cache_';
const GOOGLE_TRANSLATE_API = 'https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=es&dt=t&q=';

let isRateLimited = false;
let rateLimitExpiration = 0;

export const translationService = {
  /**
   * Translates a text to Spanish if it's not already in Spanish.
   * @param text The text to translate.
   * @returns The translated text.
   */
  async translateToSpanish(text: string): Promise<{ text: string; isTranslated: boolean }> {
    if (!text || text === 'Sin descripción' || text === 'No hay descripción disponible.') {
      return { text, isTranslated: false };
    }

    // 1. Check Cache
    const cacheKey = btoa(unescape(encodeURIComponent(text.substring(0, 100)))); // Short hash-like key
    const cached = localStorage.getItem(CACHE_PREFIX + cacheKey);
    if (cached) {
      return { text: cached, isTranslated: true };
    }

    // 2. Performance: If text is too short, don't translate
    if (text.length < 15) return { text, isTranslated: false };

    // 2.1 Check Rate Limit Cooldown
    if (isRateLimited && Date.now() < rateLimitExpiration) {
      return { text, isTranslated: false };
    } else if (isRateLimited) {
      isRateLimited = false; // Reset after expiration
    }

    try {
      // 3. Call Public Google Translate API (gtx client)
      const url = `${GOOGLE_TRANSLATE_API}${encodeURIComponent(text)}`;
      const PROXY_URL = 'https://manga-proxy.mchaustman.workers.dev/?url=';
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500); // Reduce to 3.5s for snappy UI
      
      const response = await fetch(`${PROXY_URL}${encodeURIComponent(url)}`, {
          signal: controller.signal
      });
      clearTimeout(timeoutId);
      
      if (response.status === 429) {
         console.warn('[Translation] Rate limited by proxy. Cooling down for 3 minutes.');
         isRateLimited = true;
         rateLimitExpiration = Date.now() + 3 * 60 * 1000; // 3 min is enough
         return { text, isTranslated: false };
      }
      
      if (!response.ok) throw new Error('Translation failed');
      
      const data = await response.json();
      
      // Parse Google Translate response format: [[["Translated Text", "Original Text", ...]]]
      let translatedText = '';
      if (data && data[0]) {
        translatedText = data[0].map((part: any) => part[0]).join('');
      }

      if (translatedText && translatedText !== text) {
        // 4. Save to Cache
        localStorage.setItem(CACHE_PREFIX + cacheKey, translatedText);
        return { text: translatedText, isTranslated: true };
      }

      return { text, isTranslated: false };
    } catch (err) {
      console.warn('[Translation] API Error:', err);
      return { text, isTranslated: false };
    }
  }
};
