# 🔍 AniWatch API - Llamadas y Estructura de Datos

## Base URL
```
https://apideaniwatch.vercel.app
```

---

## 1️⃣ BÚSQUEDA DE ANIME

### Endpoint
```
GET /api/v2/hianime/search
```

### Parámetros
- `q` (query): Nombre del anime a buscar
- `page` (opcional): Número de página (default: 1)

### Ejemplo Request
```
https://apideaniwatch.vercel.app/api/v2/hianime/search?q=Naruto&page=1
```

### Response Structure
```json
{
  "success": true,
  "data": {
    "animes": [
      {
        "id": "string",        // ID único del anime
        "title": "string",     // Título en inglés
        "name": "string",      // Nombre alternativo
        "image": "url",        // URL de la poster
        "url": "url",          // Link al anime
        "category": "string"   // Tipo (TV, Movie, OVA, etc)
      }
    ]
  }
}
```

---

## 2️⃣ INFORMACIÓN DEL ANIME

### Endpoint
```
GET /api/v2/hianime/anime/{animeId}
```

### Parámetro
- `animeId`: ID resultado de búsqueda

### Ejemplo Request
```
https://apideaniwatch.vercel.app/api/v2/hianime/anime/steinsgate
```

### Response Structure
```json
{
  "success": true,
  "data": {
    "anime": {
      "id": "string",
      "title": "string",
      "image": "url",
      "description": "string",
      "url": "url",
      "status": "Ongoing/Completed",
      "rating": "number"
    },
    "episodes": [
      {
        "id": "string",              // ID para reproducción
        "number": "1",               // Número de episodio
        "title": "string",           // Título del episodio
        "duration": 24,              // Duración en minutos
        "isFiller": false            // Es relleno?
      }
    ]
  }
}
```

---

## 3️⃣ FUENTES DE STREAMING

### Endpoint
```
GET /api/v2/hianime/episode/sources
```

### Parámetros
- `animeEpisodeId`: ID del episodio (del response anterior)
- `server` (opcional): Servidor preferido (ej: hd-1, default)
- `category` (opcional): sub o dub (subtitulado o doblado)

### Ejemplo Request
```
https://apideaniwatch.vercel.app/api/v2/hianime/episode/sources?animeEpisodeId=steinsgate-25&server=hd-1&category=sub
```

### Response Structure
```json
{
  "success": true,
  "data": {
    "sources": [
      {
        "url": "https://...",    // URL de video (M3U8 o MP4)
        "quality": "1080p",      // Calidad
        "isM3u8": true           // Es HLS streaming?
      }
    ],
    "subtitles": [
      {
        "lang": "English",
        "url": "https://..."     // VTT subtitle file
      }
    ]
  }
}
```

---

## 4️⃣ ANIMES EN TENDENCIA

### Endpoint
```
GET /api/v2/hianime/home
```

### Response Structure
```json
{
  "success": true,
  "data": {
    "spotlightAnimes": [
      {
        "id": "string",
        "title": "string",
        "image": "url"
      }
    ],
    "topAiringAnimes": [...],
    "topUpcomingAnimes": [...]
  }
}
```

---

## 📋 ESTRUCTURA DE DATOS EN aniwatchService.ts

### Tipos TypeScript
```typescript
interface AnimeSearchResult {
  id: string;
  title?: string;
  name?: string;
  image?: string;
  url?: string;
  category?: string;
}

interface AnimeEpisode {
  id: string;
  number: string | number;
  title?: string;
  duration?: number;
  isFiller?: boolean;
}

interface AnimeInfo {
  id: string;
  title?: string;
  image?: string;
  description?: string;
  episodes?: AnimeEpisode[];
  status?: string;
  totalEpisodes?: number;
  rating?: number | string;
}

interface StreamSource {
  url: string;
  quality?: string;
  isM3u8?: boolean;
}
```

---

## 🛠️ FUNCIONES EN aniwatchService

```typescript
// Búsqueda
searchAnime(query: string, page?: number): Promise<AnimeSearchResult[]>

// Info detallada
getAnimeInfo(animeId: string): Promise<AnimeInfo | null>

// Episodios
getEpisodes(animeId: string): Promise<AnimeEpisode[]>

// Fuentes de streaming
getEpisodeSources(
  episodeId: string,
  server?: string,
  category?: string
): Promise<{ sources: StreamSource[], subtitles: any[] } | null>

// Tendencias
getTrendingAnime(): Promise<AnimeSearchResult[]>

// Búsqueda avanzada
advancedSearch(params: {...}): Promise<AnimeSearchResult[]>
```

---

## 📝 NOTAS IMPORTANTES

1. **Rate Limiting**: La API puede tener límites de velocidad. Implementar cache cuando sea posible.
2. **CORS**: Direct calls trabajan desde el navegador (no hay problemas de CORS).
3. **M3U8 vs MP4**: Algunos videos usan HLS (M3U8), otros son MP4 directo.
4. **Subtítulos**: VTT format, compatible con HTML5 `<track>`.
5. **IDs**: Los IDs de episodios varían según servidor (ej: "steinsgate-25").

---

## 🧪 TESTING EN AnimeExplorer.tsx

La página `/anime/explore` permite:
- ✅ Buscar animes en tiempo real
- ✅ Ver respuesta JSON bruta de la API
- ✅ Seleccionar anime para ver detalles
- ✅ Ver lista de episodios
- ✅ Console log de todas las llamadas
- ✅ Registro de eventos (API Log)
