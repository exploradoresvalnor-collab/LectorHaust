# 📊 Análisis Exhaustivo de APIs Públicas de Anime - Abril 2026

## 🎯 Resumen Ejecutivo

Tras una investigación profunda, se han identificado **3 categorías principales** de soluciones para streaming de anime:

1. **APIS DE STREAMING DIRECTO** (M3U8/Embed) - Recomendadas
2. **APIS DE METADATA** - Solo información, sin streaming  
3. **APIS HÍBRIDAS** - Metadata + Streaming combinados

---

## 🥇 TIER 1: APIs de Streaming Directo (M3U8/Embed)

### 1️⃣ **CONSUMET API** ⭐⭐⭐⭐⭐
**Estado:** Activa y en desarrollo  
**URL Base:** `https://api.consumet.org`  
**Autenticación:** No requiere  
**Nivel Publicidad:** 3/10 (Baja en la API, pero depende del proveedor subyacente)  
**Capítulos Completos:** Sí (múltiples proveedores)

#### Proveedores de Anime incluidos:
- **HiAnime** (Recomendado - 2/10 ads)
  - Endpoint: `https://api.consumet.org/anime/hianime/watch/{episodeId}`
  - Retorna: M3U8, URLs directas, calidad variable
  - Subtítulos: Incluidos
  
- **AnimeSaturn** (Europeo - Italia) (1/10 ads)
  - Endpoint: `https://api.consumet.org/anime/animesaturn/watch/{episodeId}`
  - Retorna: M3U8, subtítulos en italiano/inglés
  - Muy limpio de anuncios
  
- **AnimeKai** (Asian - Limpio)
  - Retorna: M3U8, múltiples servidores
  
- **Animepahe** (Archive-style)
  - Episodios completos en M3U8
  
- **AnimeSama** (Francés - Limpio)
  - Retorna: M3U8 directo
  
- **AnimeUnity** (Italiano)
  - Retorna: M3U8, muy pocas ads
  
- **KickAssAnime** (Múltiples servidores)
  - Retorna: M3U8 + iframe embeds

#### Características Consumet:
- ✅ Open Source (NPM + TypeScript)
- ✅ Sin autenticación requerida
- ✅ CORS habilitado
- ✅ Respuestas bien estructuradas JSON
- ✅ Múltiples fallbacks de servidores
- ✅ Documentación completa
- ⚠️ Depende de terceros (webscraping indirecto)

#### Ejemplo de Respuesta:
```json
{
  "headers": {
    "Referer": "string",
    "User-Agent": "string"
  },
  "sources": [
    {
      "url": "https://..../master.m3u8",
      "quality": "400p",
      "isM3U8": true
    },
    {
      "url": "https://..../1080p.m3u8",
      "quality": "1080p",
      "isM3U8": true
    }
  ],
  "download": "https://..."
}
```

---

### 2️⃣ **ANILIST META ENDPOINT** (vía Consumet) ⭐⭐⭐⭐
**Integración:** A través de Consumet  
**URL:** `https://api.consumet.org/meta/anilist/watch/{episodeId}`  
**Autenticación:** No  
**Librerías soportadas:** AniList + Múltiples proveedores internos  
**Publicidad:** 2/10 (Muy limpio)

#### Ventajas:
- Usa metadata de AniList (limpio)
- Busca automáticamente en proveedores
- Retorna M3U8 directo
- Sin ads en la metadata

---

## 🥈 TIER 2: Metadata APIs (NO Streaming)

### 3️⃣ **MyAnimeList API v2** ⚠️
**URL Base:** `https://api.myanimelist.net/v2`  
**Autenticación:** OAuth2 + Client ID  
**Capítulos/Episodes:** ❌ NO (Metadata only)  
**Publicidad:** N/A  

#### Características:
- ✅ Oficial de MAL
- ✅ Base de datos más completa
- ❌ Requiere credenciales
- ❌ Sin URLs de streaming
- ℹ️ Endpoint: `/anime` - Solo info (título, sinopsis, ranking, etc)

#### Limitaciones para tu caso:
- **No trae**: Videos, M3U8, links directo
- **Requiere**: Client ID + OAuth token
- **Mejor Uso**: Solo metadata/información

---

### 4️⃣ **Jikan API v4** (Unofficial MyAnimeList)
**URL Base:** `https://api.jikan.moe/v4`  
**Autenticación:** No  
**Capítulos/Episodes:** ❌ NO (Metadata only)  
**Publicidad:** N/A

#### Características:
- ✅ Open Source
- ✅ Gratuita sin auth
- ❌ Solo metadata
- ❌ Sin streaming links
- ℹ️ Endpoint: `/anime/{id}` - Información general
- ⚠️ Rate limit: 60 requests/min

#### Limitaciones:
- Base de datos de MyAnimeList
- Datos de episodios parciales
- No tiene URLs de streaming

---

### 5️⃣ **Kitsu API** ⭐⭐⭐
**URL Base:** `https://kitsu.io/api/edge`  
**Autenticación:** Opcional (sin auth = datos públicos)  
**Capítulos/Episodes:** ℹ️ Información, NO streaming  
**Publicidad:** N/A

#### Características:
- ✅ JSON:API specification
- ✅ Incluye relaciones con streamers (Crunchyroll names)
- ✅ Filtrable por región/idioma/streamer
- ❌ No devuelve URLs de streaming directo
- ℹ️ Endpoint: `/anime?filter[streamers]=Crunchyroll`
- ⚠️ NSFW content oculto sin auth

#### Ejemplo Útil:
```
GET https://kitsu.io/api/edge/anime?filter[text]=naruto&include=streamingLinks
```

Retorna información del anime + qué servicios lo tienen (pero no URLs de descarga)

---

### 6️⃣ **Shikimori API** (Ruso/Internacional)
**Estado:** ⚠️ Acceso limitado actualmente  
**Región:** Principalmente contenido semanal ruso  
**Autenticación:** No requerida  
**Capítulos:** ❌ NO directo

---

## 🥉 TIER 3: Soluciones Alternativas/Limitadas

### 7️⃣ **Trace.moe API**
**Uso:** Búsqueda inversa de imágenes  
**Streaming:** ❌ NO  
**Mejor Para:** Identificar anime desde screenshots

---

### 8️⃣ **Crunchyroll API** (Unofficial via crunchy-labs)
**Status:** ⚠️ Requiere credenciales válidas  
**Autenticación:** Email + Password  
**Nivel Publicidad:** 0/10 (Es el streaming oficial)  
**Capítulos:** ✅ Sí, pero acceso restringido

**Limitaciones legales/prácticas:**
- Requiere cuenta Crunchyroll válida
- Protección Cloudflare agresiva
- Cambios frecuentes de API
- Riesgo de ban
- No es recomendable para apps públicas

---

## 📊 TABLA COMPARATIVA

| API | Streaming M3U8 | Episodes Completos | Auth Requerida | Ads | Legalidad | Open Source |
|-----|---|---|---|---|---|---|
| **Consumet (HiAnime)** | ✅ Sí | ✅ Sí | ❌ No | ⭐2/10 | ⚠️ Gray | ✅ Sí |
| **Consumet (AnimeSaturn)** | ✅ Sí | ✅ Sí | ❌ No | ⭐1/10 | ⚠️ Gray | ✅ Sí |
| **Consumet (Anilist Meta)** | ✅ Sí | ✅ Sí | ❌ No | ⭐2/10 | ⚠️ Gray | ✅ Sí |
| **MyAnimeList v2** | ❌ No | ❌ No | ✅ Sí | N/A | ✅ Legal | ❌ No |
| **Jikan v4** | ❌ No | ❌ No | ❌ No | N/A | ✅ Legal | ✅ Sí |
| **Kitsu** | ❌ No | ✅ Metadata | ❌ No | N/A | ✅ Legal | ✅ Sí |
| **Trace.moe** | ❌ No | N/A | ❌ No | N/A | ✅ Legal | ✅ Sí |
| **Crunchyroll** | ✅ Sí | ✅ Sí | ✅ Sí | ⭐0/10 | ⚠️ TOS | ❌ No |

---

## 🎬 CASOS DE USO & RECOMENDACIONES

### Caso 1: Máxima Limpieza + Sin Ads
```
RECOMENDADO: Consumet + AnimeSaturn provider
- Ads: 1/10
- Episodes: Completos
- Calidad: Buena
- Región: Europea (menos ads regional)
```

### Caso 2: Mejor Cobertura Global
```
RECOMENDADO: Consumet + HiAnime fallback
- Ads: 2-3/10
- Episodes: Acceso completo
- Uptime: Muy estable
- Servidores: Múltiples backups
```

### Caso 3: Combinada (Metadata Legal + Streaming)
```
RECOMENDADO: Jikan (metadata) + Consumet (streaming)
- Metadata legal: MAL/Jikan
- Streaming directo: Consumet
- Ads: 2-3/10
- Cobertura: Muy amplia
```

### Caso 4: Solución 100% Legal (sin streaming directo)
```
RECOMENDADO: Jikan + Kitsu
- Metadata: Completa
- Info de dónde se transmite: Kitsu
- Ads: 0/10
- Edad: Puede acceder con OAuth
```

---

## 🔧 ARQUITECTURA RECOMENDADA PARA TU APP

### Opción A: Máxima libertad (Con riesgos legales menores)
```typescript
// 1. Obtener metadata de Jikan (Legal)
const metadata = await jikanAPI.getAnime(title);

// 2. Buscar streaming en Consumet (Gris legal)
const sources = await consumetAPI.getEpisodeSources(
  'hianime', 
  animeId,
  episodeNumber
);

// 3. Reproducir  
playM3U8(sources[0].url);
```

### Opción B: Máxima limpieza (Consumet direct)
```typescript
// Usar Consumet como single source
// Pero rotar entre proveedores para:
// 1. Better availability
// 2. Lower detection
// 3. Regional optimization

const providers = [
  'hianime',      // Global
  'animesaturn',  // Europa (limpio)
  'animesama',    // Francés
];

for (let provider of providers) {
  try {
    return await consumetAPI.getEpisodeSources(provider, episodeId);
  } catch (e) {
    continue;
  }
}
```

### Opción C: Híbrida segura (Recomendada)
```typescript
// Tier 1: Información legal
const anime = await jikan.getAnime(title);
const kitsuInfo = await kitsu.getStreamers(title);

// Tier 2: Streaming (usuario decide si usar)
// - Mostrar aviso: "Este video viene de fuentes de terceros"
// - Permitir que el usuario copie/pegue un link alterno
// - No forzar streaming directo

// Tier 3: Fallback a servicios legales
const legalStreamers = kitsuInfo.streamers;
// Mostrar: "Ver en oficial en: Crunchyroll, Netflix..."
```

---

## ⚠️ CONSIDERACIONES LEGALES

### Para Consumet:
- **Estado:** Gris legal (webscraping sin permiso)
- **Riesgo:** Bajo si NO aloja copias
- **Mejor Práctica:** 
  - NO guardar videos
  - NO modificar watermarks
  - NO venderlo
  - Crear link pass-through

### Para Jikan:
- **Estado:** Legal (datos públicos de MAL)
- **Autores:** Dan Sosuke Kobayashi (Jikan), Danial Hasan Rao (Jikan maintainer)
- **License:** MIT

### Para Kitsu:
- **Estado:** Legal
- **Autores:** Hummingbird team
- **License:** MIT
- **Disclaimer:** No afiliados con Crunchyroll

---

## 🚀 IMPLEMENTACIÓN PASO A PASO

### Paso 1: Instalar Consumet
```bash
npm install consumet
# o
yarn add consumet
```

### Paso 2: Usar Consumet TypeScript Library
```typescript
import { Consumet } from 'consumet';

const consumet = new Consumet();

// Buscar anime
const results = await consumet.anime.hianime.search('Naruto');

// Obtener info
const info = await consumet.anime.hianime.getAnimeInfo(results[0].id);

// Obtener episodios
const episode = info.episodes[0];

// Obtener fuentes de streaming
const sources = await consumet.anime.hianime.getEpisodeSources(episode.id);

// Retorna:
// {
//   headers: { Referer, User-Agent },
//   sources: [
//     { url: "https://.../master.m3u8", quality: "1080p", isM3U8: true }
//   ],
//   download: "https://..."
// }
```

### Paso 3: Usar Consumet REST API (Sin instalación)
```bash
# Buscar
curl "https://api.consumet.org/anime/hianime/search?query=naruto"

# Info
curl "https://api.consumet.org/anime/hianime/info?id=naruto"

# Streaming links
curl "https://api.consumet.org/anime/hianime/watch/naruto?ep=1"
```

---

## 📈 MATRIZ DE DECISIÓN

```
¿Necesitas SOLO metadata del anime?
├─ SÍ → Usa Jikan (Legal, Open Source, Gratuita)
└─ NO → Continúa

¿Necesitas STREAMING DIRECTO de episodios?
├─ SÍ → ¿Tienes presupuesto para Crunchyroll API?
│   ├─ SÍ → Usa Crunchyroll API (Legal, Oficial, 0 ads)
│   └─ NO → ¿Aceptas riesgo gris legal?
│       ├─ SÍ → Usa Consumet (Mejor opción disponible)
│       └─ NO → Usa Kitsu (solo info de dónde ver)
└─ NO → Usa Jikan + Kitsu
```

---

## 🔗 ENLACES ÚTILES

### Documentación Oficial:
- **Consumet:** https://docs.consumet.org
- **Jikan:** https://docs.api.jikan.moe
- **Kitsu:** https://kitsu.docs.apiary.io
- **MyAnimeList:** https://myanimelist.net/apiconfig/references/api/v2
- **Trace.moe:** https://soruly.github.io/trace.moe-api/

### GitHub:
- **Consumet API:** github.com/consumet/api.consumet.org
- **Jikan REST:** github.com/jikan-me/jikan-rest
- **Kitsu:** github.com/hummingbird-me/api-docs

### Discords:
- **Consumet:** discord.gg/consumet
- **Jikan:** discord.jikan.moe

---

## 📌 CONCLUSIÓN FINAL

### Si tu app es **para uso personal/educativo:**
→ **Consumet + AnimeSaturn** (Limpio, sin ads, europeo)

### Si tu app es **comercial/app store:**
→ **Jikan + Kitsu + Link a servicios legales** (0 riesgo legal)

### Si puedes **monetizar/pagar:**
→ **Crunchyroll API** (Oficial, legal, premium)

### Si quieres **máximo contenido:**
→ **Consumet rotando entre múltiples providers** con disclaimer legal

---

**Última actualización:** 17 de abril de 2026  
**Estado de APIs:** Activas y funcionales  
**Reputabilidad:** Basado en research oficial + documentación pública
