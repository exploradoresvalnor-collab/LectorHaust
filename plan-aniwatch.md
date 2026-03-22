# Plan de Integración: API de AniWatch via Fetch API

Este documento detalla el plan estratégico para integrar de forma robusta la API de AniWatch (`https://apideaniwatch.vercel.app/`) solucionando los bloqueos experimentados (probablemente debidos a CORS, fallos del proxy de Vite o manejo incorrecto de las promesas de Fetch).

## 1. Diagnóstico del Bloqueo Anterior

Los problemas más comunes al intentar usar `fetch` directamente contra una API alojada en Vercel desde una aplicación Capacitor/React son:

1.  **Problemas de CORS (Cross-Origin Resource Sharing)**: Si la API en Vercel no envía los Headers `Access-Control-Allow-Origin: *`, el navegador web bloqueará la solicitud.
2.  **Proxy de Vite vs. Capacitor Nativo**: Actualmente `aniwatchService` apunta a `/api-aniwatch`. Esto funciona en el navegador en desarrollo gracias a `vite.config.ts`, **pero falla estrepitosamente en el móvil nativo (Android/iOS)** porque en el móvil no existe un "servidor Vite" que redirija `/api-aniwatch`.
3.  **Manejo Incompleto de Errores Fetch**: `fetch` **no lanza excepciones (catch)** en errores HTTP como 404 o 500. Solo lanza excepción si falla la red. Hay que evaluar manualmente `response.ok`.

## 2. Plan de Solución Arquitectónica

### Paso 2.1: Estrategia de URL Dinámica (Web vs Nativo)
Debemos modificar cómo se asigna el `BASE_URL` en el servicio para que use la URL real en producción/móvil, y el proxy solo en desarrollo web:

```typescript
import { Capacitor } from '@capacitor/core';

// Si estamos en un móvil nativo, usamos la API real directo (Capacitor no sufre de CORS).
// Si estamos en Web, usamos el Proxy de Vite para evadir CORS.
const BASE_URL = Capacitor.isNativePlatform() 
    ? 'https://apideaniwatch.vercel.app' 
    : '/api-aniwatch';
```

### Paso 2.2: Implementación Robusta de Fetch API
Basado en la [documentación de Mozilla](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API), debemos crear un "wrapper" o función ayudante para hacer todas las peticiones a AniWatch. Esto asegura que los errores 500 (muy comunes en APIs scraper de Vercel) se manejen con gracia.

```typescript
/**
 * Helper robusto para Fetch API
 */
async function fetchAniwatch(endpoint: string) {
    const url = `${BASE_URL}${endpoint}`;
    
    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                // Cabeceras recomendadas para simular navegador si es necesario
                'Accept': 'application/json'
            }
        });

        // Fetch NO hace throw en 400s o 500s. Debemos forzarlo.
        if (!response.ok) {
            throw new Error(`AniWatch API falló con código HTTP: ${response.status} en ${endpoint}`);
        }

        const data = await response.json();
        
        // Validación extra de la estructura común de la API
        if (data.success === false) {
             throw new Error(`La API respondió pero con error: ${data.message}`);
        }

        return data;

    } catch (error) {
        console.error(`[Fetch Aniwatch] Network/Parse Error:`, error);
        return null; // Retornar fallback seguro
    }
}
```

### Paso 2.3: Actualización de `aniwatchService.ts`
Debemos reescribir las funciones actuales utilizando el nuevo *helper* `fetchAniwatch`.
Por ejemplo:

```typescript
  async searchAnime(query: string, page: number = 1) {
    // Usamos el helper. La URL base ya es dinámica.
    const data = await fetchAniwatch(`/api/v2/hianime/search?q=${encodeURIComponent(query)}&page=${page}`);
    
    if (!data) return []; // Fallback en caso de error
    
    const results = data.data?.animes || data.animes || [];
    return results.map(formatAnimeCard);
  }
```

## 3. Hoja de Ruta de Acción Inmediata

1.  **Revisión en `vite.config.ts`**: Asegurarnos de que el proxy `/api-aniwatch` apunte a `https://apideaniwatch.vercel.app/` y tenga `changeOrigin: true` y `rewrite: (path) => path.replace(/^\/api-aniwatch/, '')` (o lo que dictamine la API).
2.  **Refactorizar `aniwatchService.ts`**: 
    - Aplicar la constante dinámica `BASE_URL`.
    - Crear el helper global de `fetch`.
    - Reemplazar todas las peticiones `fetch` "sueltas" en el archivo.
3.  **Probar Flujo de Video**: Una vez que la info funcione, atacar el método `getEpisodeSources`, ya que la extracción de m3u8 es crítica y suele romper cuando Vercel no puede scrapear HiAnime.

## 4. Documentación de Endpoints (HiAnime / Vercel API)
Esta es la referencia confirmada de los endpoints expuestos por la API que se usarán exhaustivamente en el modo Anime de la app:
- `GET /api/v2/hianime/home` (Anime Home Page)
- `GET /api/v2/hianime/a-z` (Anime A-Z List)
- `GET /api/v2/hianime/qtip` (Anime Qtip Info)
- `GET /api/v2/hianime/anime/:id` (Anime About Info)
- `GET /api/v2/hianime/search?q=:query` (Search Results)
- `GET /api/v2/hianime/search/suggestion` (Search Suggestions)
- `GET /api/v2/hianime/producer/:name` (Producer Animes)
- `GET /api/v2/hianime/genre/:name` (Genre Animes)
- `GET /api/v2/hianime/category/:name` (Category Animes)
- `GET /api/v2/hianime/scheduled` (Estimated Schedules)
- `GET /api/v2/hianime/anime/:id/episodes` (Anime Episodes)
- `GET /api/v2/hianime/anime/:id/next-episode-schedule` (Anime Next Episode Schedule)
- `GET /api/v2/hianime/episode/servers?animeEpisodeId=:id` (Anime Episode Servers)
- `GET /api/v2/hianime/episode/sources?animeEpisodeId=:id` (Anime Episode Streaming Links)

## 5. El "Punto de Ingreso" (UI Entry Point)
Actualmente la aplicación (`App.tsx`) está 100% orientada a leer Mangas. El archivo `AnimeExplorer.tsx` existe, pero **no está registrado en el Router** ni hay un botón para acceder a él.

Para solucionar esto de forma limpia sin destruir el flujo actual:
1. **Registrar la Ruta**: Agregar `<Route exact path="/anime" component={AnimeExplorer} />` dentro del `<IonRouterOutlet>` en `src/App.tsx`.
2. **Modificar el Tab o el Header**:
   - *Opción A (Recomendada)*: En la barra de navegación inferior (`IonTabBar`), agregar un 5to botón ("Anime") que dirija a `/anime`.
   - *Opción B*: En la cabecera de la pestaña de Explorar (`SearchPage.tsx`), agregar un "Segment" (Switch de pestañas Superior) que permita alternar entre `[ Mangas | Animes ]`. Cuando se pulsa Animes, carga el contenido de `AnimeExplorer`.

## 6. Referencia Completa de Esquemas (HiAnime API)
<details>
<summary>Ver todos los Schemas de Respuesta (Click para expandir)</summary>

### GET Anime Home Page (`/api/v2/hianime/home`)
```json
{
  "success": true,
  "data": {
    "genres": ["Action", "Cars", "Adventure"],
    "latestEpisodeAnimes": [{ "id": "...", "name": "...", "poster": "...", "type": "...", "episodes": { "sub": 1, "dub": 1 } }],
    "spotlightAnimes": [],
    "top10Animes": { "today": [], "month": [], "week": [] },
    "topAiringAnimes": [],
    "topUpcomingAnimes": [],
    "trendingAnimes": [],
    "mostPopularAnimes": [],
    "mostFavoriteAnimes": [],
    "latestCompletedAnimes": []
  }
}
```

### GET Search Results (`/api/v2/hianime/search?q={query}&page={page}`)
```json
{
  "success": true,
  "data": {
    "animes": [
      {
        "id": "string",
        "name": "string",
        "poster": "string",
        "duration": "string",
        "type": "string",
        "rating": "string",
        "episodes": { "sub": 1, "dub": 1 }
      }
    ],
    "mostPopularAnimes": [],
    "currentPage": 1,
    "totalPages": 1,
    "hasNextPage": false
  }
}
```

### GET Anime Episodes (`/api/v2/hianime/anime/{animeId}/episodes`)
```json
{
  "success": true,
  "data": {
    "totalEpisodes": 24,
    "episodes": [
      {
        "number": 1,
        "title": "Turning Point",
        "episodeId": "steinsgate-3?ep=213",
        "isFiller": false
      }
    ]
  }
}
```

### GET Anime Episode Streaming Links (`/api/v2/hianime/episode/sources`)
```json
{
  "success": true,
  "data": {
    "headers": { "Referer": "string" },
    "sources": [
      { "url": "string", "isM3U8": true, "quality": "string" }
    ],
    "subtitles": [
      { "lang": "English", "url": "string" }
    ]
  }
}
```
</details>

---
*Este plan está concluido y la integración de AniWatch está en fase de pruebas (Playtesting).*
