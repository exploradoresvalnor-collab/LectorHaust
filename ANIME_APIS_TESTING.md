# 🧪 Testing & Code Examples - Anime APIs

## Test Consumet API (Sin instalación de dependencias)

### 1. Test Búsqueda

```bash
# En terminal / Postman
curl "https://api.consumet.org/anime/hianime/search?query=naruto"
```

**Respuesta esperada:**
```json
{
  "results": [
    {
      "id": "naruto",
      "title": "Naruto",
      "image": "https://...",
      "totalEpisodes": 220
    }
  ]
}
```

### 2. Test Info del Anime

```bash
curl "https://api.consumet.org/anime/hianime/info?id=naruto"
```

**Respuesta:**
```json
{
  "id": "naruto",
  "title": "Naruto",
  "description": "...",
  "episodes": [
    {
      "id": "naruto-episode-1",
      "number": 1,
      "title": "Enter: Naruto Uzumaki!"
    }
  ],
  "totalEpisodes": 220
}
```

### 3. Test Streaming Links (Lo importante!)

```bash
curl "https://api.consumet.org/anime/hianime/watch/naruto-episode-1"
```

**Respuesta (ESTO ES LO QUE NECESITAS):**
```json
{
  "headers": {
    "Referer": "https://hianime.to",
    "User-Agent": "Mozilla/5.0..."
  },
  "sources": [
    {
      "url": "https://ajay-cdn-v.ajaycdn.com/hls/..../master.m3u8",
      "quality": "1080p",
      "isM3U8": true
    },
    {
      "url": "https://ajay-cdn-v.ajaycdn.com/hls/..../720.m3u8",
      "quality": "720p",
      "isM3U8": true
    },
    {
      "url": "https://ajay-cdn-v.ajaycdn.com/hls/..../480.m3u8",
      "quality": "480p",
      "isM3U8": true
    }
  ],
  "subtitles": [
    {
      "url": "https://..../en.vtt",
      "lang": "English"
    },
    {
      "url": "https://..../es.vtt",
      "lang": "Spanish"
    }
  ],
  "download": "https://example.com/naruto-episode-1.mp4"
}
```

---

## Test Consumet (Con Node.js)

### Instalación

```bash
npm install consumet
```

### Ejemplo 1: Búsqueda Completa

```javascript
const { Consumet } = require('consumet');

async function searchAnime() {
  const consumet = new Consumet();
  
  try {
    // Buscar anime
    const results = await consumet.anime.hianime.search('One Piece');
    console.log('Resultados:', results.results.slice(0, 3));
    
    // Obtener ID del primer resultado
    const animeId = results.results[0].id;
    console.log('ID encontrado:', animeId);
    
    // Obtener información del anime
    const anime = await consumet.anime.hianime.getAnimeInfo(animeId);
    console.log('Episodios disponibles:', anime.totalEpisodes);
    console.log('Primer episodio ID:', anime.episodes[0].id);
    
    // Obtener fuentes de streaming del primer episodio
    const sources = await consumet.anime.hianime.getEpisodeSources(
      anime.episodes[0].id
    );
    
    console.log('Fuentes disponibles:');
    sources.sources.forEach(s => {
      console.log(`  - ${s.quality}p M3U8:`, s.url.substring(0, 50) + '...');
    });
    
    // Obtener subtítulos
    console.log('Subtítulos:');
    sources.subtitles?.forEach(sub => {
      console.log(`  - ${sub.lang}`);
    });
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

searchAnime();
```

### Ejemplo 2: Fallback entre Proveedores

```javascript
const { Consumet } = require('consumet');

async function getEpisodeWithFallback(episodeId) {
  const consumet = new Consumet();
  const providers = [
    'hianime',
    'animesaturn',
    'animesama',
    'animepahe'
  ];

  for (const provider of providers) {
    try {
      console.log(`Intentando con ${provider}...`);
      
      // @ts-ignore
      const sources = await consumet.anime[provider].getEpisodeSources(episodeId);
      
      if (sources.sources.length > 0) {
        console.log(`✅ Éxito con ${provider}!`);
        console.log(`Mejor calidad: ${sources.sources[0].quality}p`);
        return sources;
      }
    } catch (error) {
      console.log(`⚠️  ${provider} falló:`, error.message);
      continue;
    }
  }

  throw new Error('Todos los proveedores fallaron');
}

// Uso
getEpisodeWithFallback('naruto-episode-1')
  .then(sources => console.log('Fuentes obtenidas:', sources.sources.length))
  .catch(err => console.error('Error final:', err.message));
```

### Ejemplo 3: Caché con Expiración

```javascript
const { Consumet } = require('consumet');

class AnimeCache {
  constructor() {
    this.cache = new Map();
    this.TTL = 1 * 60 * 60 * 1000; // 1 hora
  }

  getKey(type, id) {
    return `${type}:${id}`;
  }

  get(type, id) {
    const key = this.getKey(type, id);
    const cached = this.cache.get(key);
    
    if (!cached) return null;
    if (Date.now() - cached.timestamp > this.TTL) {
      this.cache.delete(key);
      return null;
    }
    
    return cached.data;
  }

  set(type, id, data) {
    const key = this.getKey(type, id);
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  clear() {
    this.cache.clear();
  }
}

// Uso
const cache = new AnimeCache();
const consumet = new Consumet();

async function getAnimeWithCache(title) {
  // Verificar caché
  const cached = cache.get('search', title);
  if (cached) {
    console.log('Usando datos en caché');
    return cached;
  }

  // Si no está en caché, buscar
  console.log('Buscando en API...');
  const results = await consumet.anime.hianime.search(title);
  cache.set('search', title, results);
  
  return results;
}

// Prueba
(async () => {
  console.log('Primera búsqueda (desde API):');
  await getAnimeWithCache('Naruto');
  
  console.log('\nSegunda búsqueda (desde caché):');
  await getAnimeWithCache('Naruto');
})();
```

---

## Test Jikan API (Legal)

### 1. Búsqueda Anime

```bash
curl "https://api.jikan.moe/v4/anime?query=naruto&limit=5"
```

**Respuesta:**
```json
{
  "data": [
    {
      "mal_id": 20,
      "url": "https://myanimelist.net/anime/20/Naruto",
      "images": {
        "jpg": {
          "image_url": "https://...",
          "large_image_url": "https://...",
          "small_image_url": "https://..."
        }
      },
      "trailer": {
        "youtube_id": "4xfY0k2snXE"
      },
      "approved": true,
      "titles": [
        {
          "type": "Default",
          "title": "Naruto"
        }
      ],
      "title": "Naruto",
      "source": "Manga",
      "episodes": 220,
      "status": "Finished Airing",
      "airing": false,
      "aired": {
        "from": "2002-10-03T00:00:00+00:00",
        "to": "2007-02-08T00:00:00+00:00"
      },
      "duration": "23 min",
      "rating": "PG-13",
      "genres": [
        {
          "mal_id": 1,
          "type": "anime",
          "name": "Action"
        }
      ],
      "score": 7.61,
      "scored_by": 567843,
      "rank": 224,
      "popularity": 1,
      "members": 2216625,
      "favorites": 125500
    }
  ],
  "pagination": {
    "last_visible_page": 1,
    "has_next_page": false,
    "current_page": 1,
    "items": {
      "count": 1,
      "total": 1,
      "per_page": 25
    }
  }
}
```

### 2. Obtener Info Completa

```bash
curl "https://api.jikan.moe/v4/anime/1"
```

Retorna toda la información del anime con ID 1

### 3. Con Node.js

```javascript
const axios = require('axios');

async function getAnimeInfo(animeQuery) {
  try {
    // Buscar
    const searchRes = await axios.get('https://api.jikan.moe/v4/anime', {
      params: { query: animeQuery, limit: 1 }
    });

    const anime = searchRes.data.data[0];
    const animeId = anime.mal_id;

    console.log('Anime encontrado:', anime.title);
    console.log('Episodes:', anime.episodes);
    console.log('Score:', anime.score);
    console.log('URL MAL:', anime.url);

    // Obtener episodios
    const episodesRes = await axios.get(
      `https://api.jikan.moe/v4/anime/${animeId}/episodes`
    );

    console.log('Episodios disponibles:', episodesRes.data.pagination.items.total);
    episodesRes.data.data.slice(0, 3).forEach(ep => {
      console.log(`  ${ep.mal_id}: ${ep.title}`);
    });

    return anime;
  } catch (error) {
    console.error('Error:', error.message);
  }
}

getAnimeInfo('One Piece');
```

---

## Test Kitsu API

### 1. Búsqueda

```bash
curl "https://kitsu.io/api/edge/anime?filter[text]=naruto&limit=5"
```

### 2. Con info de Streamers

```bash
curl "https://kitsu.io/api/edge/anime?filter[text]=naruto&include=streamingLinks"
```

**Respuesta (Kitsu retorna dónde está en cada país/streamer):**
```json
{
  "data": [
    {
      "id": "1",
      "type": "anime",
      "attributes": {
        "canonicalTitle": "Naruto",
        "titles": {...},
        "synopsis": "...",
        "posterImage": {...},
        "episodeCount": 220,
        "status": "finished"
      },
      "relationships": {
        "streamingLinks": {
          "data": [
            {
              "id": "123",
              "type": "streamingLinks",
              "attributes": {
                "url": "https://crunchyroll.com/naruto",
                "streamingService": {
                  "name": "Crunchyroll"
                }
              }
            }
          ]
        }
      }
    }
  ]
}
```

### 3. Con Node.js

```javascript
const axios = require('axios');

async function findLegalStreamers(animeTitle) {
  try {
    const res = await axios.get('https://kitsu.io/api/edge/anime', {
      params: {
        'filter[text]': animeTitle,
        'include': 'streamingLinks',
        'limit': 1
      },
      headers: {
        'Accept': 'application/vnd.api+json',
        'Content-Type': 'application/vnd.api+json'
      }
    });

    const anime = res.data.data[0];
    console.log('Anime:', anime.attributes.canonicalTitle);
    console.log('Episodes:', anime.attributes.episodeCount);

    // Obtener links de streaming includeados
    if (res.data.included) {
      const streamers = res.data.included.filter(
        item => item.type === 'streamingLinks'
      );
      
      console.log('Disponible en:');
      streamers.forEach(link => {
        const service = link.attributes.streamingService?.name || 'Unknown';
        console.log(`  - ${service}: ${link.attributes.url}`);
      });
    }

  } catch (error) {
    console.error('Error:', error.message);
  }
}

findLegalStreamers('One Piece');
```

---

## 🧪 Script de Prueba Completo

```javascript
// test-anime-apis.js

const { Consumet } = require('consumet');
const axios = require('axios');

class AnimeAPITester {
  constructor() {
    this.results = {
      consumet: {},
      jikan: {},
      kitsu: {}
    };
  }

  async testConsumet(title) {
    console.log('\n🧪 TESTANDO CONSUMET...');
    try {
      const consumet = new Consumet();
      
      // Buscar
      const search = await consumet.anime.hianime.search(title);
      const animeId = search.results[0].id;
      console.log('✅ Búsqueda exitosa:', animeId);

      // Info
      const info = await consumet.anime.hianime.getAnimeInfo(animeId);
      console.log('✅ Info obtenida:', info.totalEpisodes, 'episodios');

      // Fuentes streaming
      const sources = await consumet.anime.hianime.getEpisodeSources(
        info.episodes[0].id
      );
      console.log('✅ Streaming obtenido:', sources.sources.length, 'calidades');
      console.log('   - Mejor:', sources.sources[0].quality);

      this.results.consumet = { status: 'OK', source: sources.sources[0] };
    } catch (error) {
      console.log('❌ Error:', error.message);
      this.results.consumet = { status: 'ERROR', error: error.message };
    }
  }

  async testJikan(title) {
    console.log('\n🧪 TESTANDO JIKAN (LEGAL)...');
    try {
      const search = await axios.get('https://api.jikan.moe/v4/anime', {
        params: { query: title, limit: 1 }
      });

      const anime = search.data.data[0];
      console.log('✅ Búsqueda exitosa:', anime.title);
      console.log('✅ Episodes:', anime.episodes);
      console.log('✅ Score:', anime.score);
      console.log('✅ URL MAL:', anime.url);

      this.results.jikan = { status: 'OK', anime };
    } catch (error) {
      console.log('❌ Error:', error.message);
      this.results.jikan = { status: 'ERROR', error: error.message };
    }
  }

  async testKitsu(title) {
    console.log('\n🧪 TESTANDO KITSU...');
    try {
      const res = await axios.get('https://kitsu.io/api/edge/anime', {
        params: {
          'filter[text]': title,
          'limit': 1
        },
        headers: {
          'Accept': 'application/vnd.api+json'
        }
      });

      const anime = res.data.data[0];
      console.log('✅ Anime encontrado:', anime.attributes.canonicalTitle);
      console.log('✅ Episodes:', anime.attributes.episodeCount);

      this.results.kitsu = { status: 'OK', anime };
    } catch (error) {
      console.log('❌ Error:', error.message);
      this.results.kitsu = { status: 'ERROR', error: error.message };
    }
  }

  async runAll(title = 'Naruto') {
    console.log('\n=== 🎬 ANIME API TEST SUITE ===\n');
    console.log('Buscando:', title);

    await this.testConsumet(title);
    await this.testJikan(title);
    await this.testKitsu(title);

    console.log('\n=== 📊 RESUMEN ===');
    console.log(JSON.stringify(this.results, (k, v) => {
      if (k === 'source' || k === 'anime') return '[OBJECT]';
      return v;
    }, 2));
  }
}

// Ejecutar
const tester = new AnimeAPITester();
tester.runAll('One Piece');
```

**Ejecutar con:**
```bash
node test-anime-apis.js
```

---

## Performance Test

```javascript
async function performanceTest() {
  const consumet = new Consumet();
  const title = 'Naruto';

  // Test 1: Búsqueda
  console.time('Search');
  const search = await consumet.anime.hianime.search(title);
  console.timeEnd('Search');

  // Test 2: Info
  console.time('GetInfo');
  const info = await consumet.anime.hianime.getAnimeInfo(search.results[0].id);
  console.timeEnd('GetInfo');

  // Test 3: Streaming
  console.time('GetSources');
  const sources = await consumet.anime.hianime.getEpisodeSources(info.episodes[0].id);
  console.timeEnd('GetSources');

  // Test 4: Multiple episodes (para medir velocidad con concurrencia)
  console.time('Concurrent 5 episodes');
  const promises = info.episodes.slice(0, 5).map(ep =>
    consumet.anime.hianime.getEpisodeSources(ep.id)
  );
  await Promise.allSettled(promises);
  console.timeEnd('Concurrent 5 episodes');
}

performanceTest();
```

---

## ✅ Checklist de Testing

```
[ ] Búsqueda funciona
[ ] Info del anime se obtiene
[ ] Fuentes M3U8 son válidas
[ ] Subtítulos disponibles
[ ] Fallback entre proveedores
[ ] Timeout configurable
[ ] Retry logic funciona
[ ] Caché reduces requests
[ ] Error handling adecuado
[ ] Rate limiting implementado
[ ] Logs de debug útiles
[ ] Performance aceptable (<2s)
```

---

## 🚨 Debugging

Si algo no funciona:

```javascript
// Habilitar logs detallados
const { Consumet } = require('consumet');
const consumet = new Consumet({
  debug: true // Muestra todos los requests
});

// Capturar errores específicos
try {
  const sources = await consumet.anime.hianime.getEpisodeSources(episodeId);
} catch (error) {
  console.error('Tipo de error:', error.constructor.name);
  console.error('Mensaje:', error.message);
  console.error('Stack:', error.stack);
  
  if (error.response) {
    console.error('Status:', error.response.status);
    console.error('Headers:', error.response.headers);
  }
}

// Validar M3U8
const isValidM3U8 = (url) => {
  return url && url.includes('m3u8') && url.startsWith('http');
};

const source = sources.sources[0];
console.log('M3U8 válido:', isValidM3U8(source.url));
```

---

**Próximo paso:** Integrá esto en tu MangaApp usando CONSUMET_IMPLEMENTATION_GUIDE.md
