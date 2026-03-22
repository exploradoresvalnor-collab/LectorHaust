# Documentación: APIs de Anime y Scrapers Nativos

Esta guía documenta los accesos, endpoints y estrategias de scraping implementadas para la sección "Anime Explorer" y "Video Player" dentro de la aplicación, garantizando que el conocimiento arquitectónico quede registrado incluso si la vista al usuario se oculta temporalmente.

## 1. AnimeFLV (Escrapeador Híbrido)
**Ubicación:** `src/services/animeflvService.ts`
**Propósito:** Proveer el feed principal de Anime en español para Latinoamérica. Debido a que AnimeFLV no posee una API pública y está protegido por proxies, extraemos la información parseando el DOM (HTML).

### Flujo de Acceso:
1. **Directorio Principal:** `https://www4.animeflv.net/browse`
2. **Extracción HTML:** Utilizamos expresiones regulares (`regex`) o manipulación de strings simple en lugar de un `DOMParser` pesado, buscando específicamente la clase `<ul class="ListAnimes">`.
3. **Smart Slug:** La búsqueda de anime genera slugs inteligentes (ej: `boku-no-hero-academia-7th-season`) reemplazando espacios por guiones para atacar la URL del anime en lugar de la barra de búsqueda en ciertos fallbacks.
4. **Extracción de Video:** AnimeFLV inyecta los iframes codificados dentro de una variable global de script `var videos = { ... }`. El scraper parsea este JSON embebido en el `<script>` de la página HTML del episodio y devuelve el URL directo del stream.

## 2. Gogoanime / Anitaku (Escrapeador en Inglés)
**Ubicación:** `src/services/gogoanimeService.ts`
**Propósito:** Fuente de respaldo secundario (y para usuarios angloparlantes). Actualmente Gogoanime redirige a dominios espejo como `anitaku.pe`.

### Flujo de Acceso:
1. **Motor de Búsqueda:** `https://anitaku.pe/search.html?keyword=...`
2. **Video Embed:** El scraper visita la página del episodio, ubica el div `.anime_muti_link` y prioriza el servidor "Vidstreaming".
3. Al igual que el servicio FLV, devuelve un `iframe url` que se inyecta en el `VideoPlayer.tsx`.

## 3. Aniwatch / Consumet (API en desuso/Standby)
**Ubicación:** `src/services/aniwatchService.ts`
**Propósito:** Originalmente planeado para extraer archivos de stream crudos (`.m3u8` / `HLS`) para pasarlos a un reproductor local sin anuncios usando el backend open-source "Consumet".

### Problema Técnico:
- Los servidores gratuitos públicos y de Vercel para Consumet arrojan errores HTTP 500 y 403 debido a bloqueos de Cloudflare. 
- **Solución Estructural Anotada:** Para que esto funcione, el cliente debe desplegar su propia instancia de Consumet API en un VPS privado (ej: Render, Railway, DigitalOcean) y apuntar la constante `API_BASE_URL` en el servicio hacia ese dominio privado. Actualmente, el flujo descansa sobre el plan "IFRAME Bypassing" descrito en los puntos 1 y 2.

## 4. VideoPlayer (Motor Híbrido de Renderizado)
**Ubicación:** `src/components/VideoPlayer.tsx`

La aplicación cuenta con un reproductor bifásico:
- **Modo HLS:** Si la API devuelve un link `.m3u8` limpio, utiliza la librería `hls.js` dentro de una etiqueta `<video>` nativa HTML5 para reproducir sin publicidad.
- **Modo IFRAME (Fallback actual):** Cuando la extracción falla, la app "incrusta" el reproductor original del sitio (ej: el reproductor de Fembed/Streamwish proporcionado por AnimeFLV) dentro de un `<iframe>`.
- **Evasión de Publicidad (Pop-ups):** El bloque iframe implementa directivas restrictivas (`sandbox="allow-scripts allow-same-origin allow-presentation"`) que efectivamente castran la capacidad del reproductor de abrir anuncios invasivos ("Pop-unders") o redirigir la pestaña maestra de Android/iOS.
