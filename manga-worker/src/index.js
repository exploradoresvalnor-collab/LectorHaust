export default {
 async fetch(request, env, ctx) {
  const url = new URL(request.url);
  const targetUrl = url.searchParams.get('url');
  const embedUrl = url.searchParams.get('embed');
  const imageUrl = url.searchParams.get('image');
  
  const actualUrl = targetUrl || embedUrl || imageUrl;
  
  if (!actualUrl) {
   return new Response('Missing target, embed, or image url', { status: 400 });
  }

  // Determine Referer and User-Agent based on target URL
  let referer = 'https://mangapill.com/';
  if (actualUrl.includes('manganato.com') || actualUrl.includes('chapmanganato.to') || actualUrl.includes('natocdn')) {
   referer = 'https://manganato.com/';
  } else if (actualUrl.includes('comick')) {
   referer = 'https://comick.io/';
  } else if (actualUrl.includes('animeflv') || actualUrl.includes('lacartoons')) {
   referer = new URL(actualUrl).origin + '/';
  }

  // === IMAGE CDN LOGIC (Cache First) ===
  const cache = caches.default;
  let cacheKey;
  if (imageUrl) {
     cacheKey = new Request(url.toString(), request);
     let cachedResponse = await cache.match(cacheKey);
     if (cachedResponse) {
         // Return HIT securely
         return new Response(cachedResponse.body, cachedResponse);
     }
  }

  const newHeaders = new Headers();
  newHeaders.set('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
  newHeaders.set('Referer', referer);

  try {
   const response = await fetch(actualUrl, {
    method: request.method,
    headers: newHeaders,
    redirect: 'follow'
   });

   // === IMAGE CDN LOGIC (Cache Store & Dispatch) ===
   if (imageUrl) {
      const modifiedResponse = new Response(response.body, response);
      // Neutralize security restrictions so Lector Haus can read it freely
      modifiedResponse.headers.set('Access-Control-Allow-Origin', '*');
      modifiedResponse.headers.set('Access-Control-Allow-Headers', '*');
      // Freeze the image at the Edge and in the user's mobile proxy for 1 year
      modifiedResponse.headers.set('Cache-Control', 'public, max-age=31536000, immutable');
      // Optional: keep original content-type
      const contentType = response.headers.get('content-type');
      if (contentType) modifiedResponse.headers.set('Content-Type', contentType);

      // Save to Cloudflare Edge Cache without blocking the response
      ctx.waitUntil(cache.put(cacheKey, modifiedResponse.clone()));
      
      return modifiedResponse;
   }

   if (embedUrl) {
      // Option B: Deep Proxy HTML Manipulation Extractor
      let html = await response.text();
      
      // 1. Inject missing relative resolution base
      const baseUrl = new URL(embedUrl).origin;
      html = html.replace(/<head>/i, `<head><base href="${baseUrl}/">`);
      
      // 2. Extirpate Sandbox/Cross-origin DRM checks
      html = html.replace(/window\.parent/g, "window")
                 .replace(/parent\.location/g, "window.location")
                 .replace(/top\.location/g, "window.location")
                 .replace(/window\.top/g, "window")
                 .replace(/!== window/g, "=== window")
                 .replace(/!= window/g, "== window");

      // 3. Extirpate aggressive Pop-unders
      html = html.replace(/window\.open\s*\(/g, "console.log('Intercepted window.open', ");
      
      const modifiedResponse = new Response(html, response);
      modifiedResponse.headers.set('Content-Type', 'text/html; charset=UTF-8');
      modifiedResponse.headers.set('Access-Control-Allow-Origin', '*');
      return modifiedResponse;
   }

   // Standard transparent string/json proxy
   const modifiedResponse = new Response(response.body, response);
   modifiedResponse.headers.set('Access-Control-Allow-Origin', '*');
   modifiedResponse.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
   modifiedResponse.headers.set('Access-Control-Allow-Headers', '*');
   
   return modifiedResponse;
  } catch (e) {
   return new Response('Error fetching target: ' + e.message, { status: 500 });
  }
 }
};
