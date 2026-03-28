export default {
 async fetch(request, env, ctx) {
  const url = new URL(request.url);
  const targetUrl = url.searchParams.get('url');
  const embedUrl = url.searchParams.get('embed');
  const actualUrl = targetUrl || embedUrl;
  
  if (!actualUrl) {
   return new Response('Missing target or embed url', { status: 400 });
  }

  // Determine Referer and User-Agent based on target URL
  let referer = 'https://mangapill.com/';
  if (actualUrl.includes('manganato.com') || actualUrl.includes('chapmanganato.to')) {
   referer = 'https://manganato.com/';
  } else if (actualUrl.includes('comick')) {
   referer = 'https://comick.io/';
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
