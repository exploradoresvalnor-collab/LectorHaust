# 🎯 Guía de Implementación - APIs Anime para tu MangaApp

## Estado Actual del Proyecto

Tu app ya usa:
- ✅ Jikan (Metadata de MyAnimeList)
- ✅ Kitsu (Metadata de plataformas)
- ✅ AniList (Metadata de AniList)
- ✅ Web Scrapers (AnimeFlv, GogoAnime, TioAnime) - **Para streaming**

---

## 🎬 Problema Identificado

1. **Web scrapers son frágiles** → Los sitios cambian estructura frecuentemente
2. **Mucha publicidad** → AnimeFlv, GogoAnime tienen ads invasivos
3. **Riesgo de bloqueo** → CloudFlare protege estos sitios
4. **CORS issues** → Necesitas proxy (como haces actualmente)

---

## ✅ Solución Recomendada: Migrar a Consumet

### Por qué Consumet es mejor:

| Aspecto | Web Scrapers (Actual) | Consumet (Propuesto) |
|--------|---|---|
| **Mantenimiento** | Alto (sites cambian) | Bajo (comunidad lo mantiene) |
| **Ads** | 7/10 (Muchos) | 1-3/10 (Pocos) |
| **Velocidad** | Lenta | Rápida |
| **Confiabilidad** | 70% | 95%+ |
| **M3U8 Directo** | ❌ No siempre | ✅ Sí |
| **Actualización** | Manual | Automática |

---

## 🛠️ Plan de Migración

### Fase 1: Reemplazar AnimeFlv con Consumet/HiAnime
```typescript
// ANTES:
import { animeflvService } from './services/animeflvService';
const sources = await animeflvService.getEpisodeSources(animeId);

// DESPUÉS:
const consumet = new Consumet();
const sources = await consumet.anime.hianime.getEpisodeSources(episodeId);
```

### Fase 2: Reemplazar GogoAnime con Consumet/HiAnime
```typescript
// ANTES:
import { gogoanimeService } from './services/gogoanimeService';

// DESPUÉS:
const consumet = new Consumet();
const sources = await consumet.anime.hianime.getEpisodeSources(episodeId);
```

### Fase 3: Mantener TioAnime como Fallback
```typescript
const primaryProvider = 'hianime';
const fallbackProviders = [
  'animesaturn',  // Europeo limpio
  'animesama',    // Francés limpio
  'animepahe',    // Archive-style
];
```

---

## 📦 Instalación

### 1. Instalar Consumet
```bash
npm install consumet
```

### 2. Crear nuevo servicio
```bash
touch src/services/consumetService.ts
```

---

## 💻 Código de Implementación

### 1. Nuevo Servicio Consumet

```typescript
// src/services/consumetService.ts

import { Consumet } from 'consumet';

const consumet = new Consumet();

export interface ConsumSource {
  url: string;
  quality: string;
  isM3U8: boolean;
}

export interface ConsumSearchResult {
  id: string;
  title: string;
  image: string;
  totalEpisodes: number;
}

export const consumetService = {
  // Buscar anime
  async searchAnime(query: string): Promise<ConsumSearchResult[]> {
    try {
      const results = await consumet.anime.hianime.search(query);
      return results.results.map(r => ({
        id: r.id,
        title: r.title,
        image: r.image,
        totalEpisodes: parseInt(r.totalEpisodes) || 0,
      }));
    } catch (e) {
      console.error('[ConsumET Search]', e);
      throw e;
    }
  },

  // Obtener información del anime
  async getAnimeInfo(animeId: string) {
    try {
      const info = await consumet.anime.hianime.getAnimeInfo(animeId);
      return {
        id: info.id,
        title: info.title,
        description: info.description,
        image: info.image,
        cover: info.cover,
        episodes: info.episodes.map(ep => ({
          id: ep.id,
          number: ep.number,
          title: ep.title,
        })),
        totalEpisodes: info.totalEpisodes,
      };
    } catch (e) {
      console.error('[ConsumET AnimeInfo]', e);
      throw e;
    }
  },

  // Obtener fuentes de streaming
  async getEpisodeSources(episodeId: string): Promise<ConsumSource[]> {
    try {
      const sources = await consumet.anime.hianime.getEpisodeSources(episodeId);
      
      return sources.sources.map(source => ({
        url: source.url,
        quality: source.quality || 'default',
        isM3U8: source.isM3U8 || false,
      }));
    } catch (e) {
      console.error('[ConsumET Sources]', e);
      throw e;
    }
  },

  // Con fallback a otros proveedores
  async getEpisodeSourcesWithFallback(
    episodeId: string,
    providers: string[] = ['hianime', 'animesaturn', 'animesama']
  ): Promise<ConsumSource[]> {
    for (const provider of providers) {
      try {
        console.log(`[ConsumET] Intentando ${provider}...`);
        const getSourcesFn = consumet.anime[provider as keyof typeof consumet.anime];
        
        if (!getSourcesFn || !('getEpisodeSources' in getSourcesFn)) {
          console.warn(`[ConsumET] Provider ${provider} no disponible`);
          continue;
        }

        // @ts-ignore
        const sources = await getSourcesFn.getEpisodeSources(episodeId);
        
        if (sources && sources.sources && sources.sources.length > 0) {
          console.log(`[ConsumET] Éxito con ${provider}`);
          return sources.sources.map(s => ({
            url: s.url,
            quality: s.quality || 'default',
            isM3U8: s.isM3U8 || false,
          }));
        }
      } catch (e) {
        console.warn(`[ConsumET] ${provider} falló:`, e.message);
        continue;
      }
    }

    throw new Error('Todos los proveedores fallaron');
  },

  // Obtener subtítulos
  async getEpisodeSubtitles(episodeId: string) {
    try {
      const data = await consumet.anime.hianime.getEpisodeSources(episodeId);
      return data.subtitles || [];
    } catch (e) {
      console.error('[ConsumET Subtitles]', e);
      return [];
    }
  },
};
```

### 2. Hook para usar en componentes React

```typescript
// src/hooks/useConsumEpisode.ts

import { useEffect, useState } from 'react';
import { consumetService } from '../services/consumetService';

export const useConsumEpisode = (episodeId: string) => {
  const [sources, setSources] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!episodeId) return;

    const fetchSources = async () => {
      try {
        setLoading(true);
        const data = await consumetService.getEpisodeSourcesWithFallback(episodeId);
        setSources(data);
        setError(null);
      } catch (err) {
        setError(err.message);
        setSources([]);
      } finally {
        setLoading(false);
      }
    };

    fetchSources();
  }, [episodeId]);

  return { sources, loading, error };
};
```

### 3. Sistema de Fallback mejorado

```typescript
// src/services/animeProviderChain.ts

type Provider = 'consumet' | 'animeflv' | 'gogoanime' | 'tioanime';

interface ProviderConfig {
  method: Provider;
  priority: number; // 1-5, más bajo = más prioritario
  timeout: number;
  retries: number;
}

const DEFAULT_CHAIN: ProviderConfig[] = [
  { method: 'consumet', priority: 1, timeout: 5000, retries: 2 },
  { method: 'animeflv', priority: 2, timeout: 8000, retries: 1 },
  { method: 'tioanime', priority: 3, timeout: 8000, retries: 1 },
  { method: 'gogoanime', priority: 4, timeout: 10000, retries: 1 },
];

export const animeProviderChain = {
  async getSources(
    animeId: string,
    episodeNum: number,
    chain = DEFAULT_CHAIN
  ) {
    const sorted = [...chain].sort((a, b) => a.priority - b.priority);

    for (const config of sorted) {
      try {
        let sources;
        
        switch (config.method) {
          case 'consumet':
            sources = await Promise.race([
              consumetService.getEpisodeSourcesWithFallback(
                `${animeId}-episode-${episodeNum}`
              ),
              new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Timeout')), config.timeout)
              ),
            ]);
            break;

          case 'animeflv':
            sources = await Promise.race([
              animeflvService.getEpisodeSources(animeId, episodeNum),
              new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Timeout')), config.timeout)
              ),
            ]);
            break;

          // ... otros providers
        }

        if (sources && sources.length > 0) {
          console.log(`✅ Éxito con ${config.method}`);
          return {
            sources,
            provider: config.method,
            quality: 'mixed',
          };
        }
      } catch (err) {
        console.warn(`⚠️ ${config.method} falló:`, err.message);
        continue;
      }
    }

    throw new Error('Todos los proveedores fallaron');
  },
};
```

---

## 🎬 Uso en Componentes

### Opción 1: Simple (Hook)

```tsx
// src/pages/ReaderPage/index.tsx

import { useConsumEpisode } from '../../hooks/useConsumEpisode';

export const ReaderPage = ({ animeId, episodeNum }: Props) => {
  const episodeId = `${animeId}-episode-${episodeNum}`;
  const { sources, loading, error } = useConsumEpisode(episodeId);

  if (loading) return <LoadingScreen />;
  if (error) return <ErrorScreen message={error} />;

  return (
    <VideoPlayer
      sources={sources}
      container="reader"
      onPlaybackStart={() => {
        // Analytics
      }}
    />
  );
};
```

### Opción 2: Con Fallback Chain

```tsx
export const ReaderPage = ({ animeId, episodeNum }: Props) => {
  const [playbackState, setPlaybackState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [currentSource, setCurrentSource] = useState<any>(null);
  const [provider, setProvider] = useState<string>('');

  useEffect(() => {
    const loadSources = async () => {
      try {
        const result = await animeProviderChain.getSources(animeId, episodeNum);
        setCurrentSource(result.sources[0]);
        setProvider(result.provider);
        setPlaybackState('ready');
      } catch (err) {
        setPlaybackState('error');
      }
    };

    loadSources();
  }, [animeId, episodeNum]);

  return (
    <>
      {playbackState === 'ready' && (
        <>
          <VideoPlayer sources={[currentSource]} />
          <Badge label={`Fuente: ${provider}`} />
        </>
      )}
      {playbackState === 'error' && (
        <ErrorState 
          message="No se pudo cargar el episodio"
          onRetry={() => setPlaybackState('loading')}
        />
      )}
    </>
  );
};
```

---

## 🔒 Consideraciones de Privacidad

### Ocultar Detalles de Provider

```typescript
// NO mostrar que usas Consumet directamente
const PROVIDER_LABELS: Record<string, string> = {
  'consumet': 'Servidor de Streaming',
  'hianime': 'Servidor de Streaming', 
  'animesaturn': 'Servidor de Streaming',
  'animeflv': 'Servidor de Streaming',
};

// Usar
<Badge label={PROVIDER_LABELS[provider]} />
// No
<Badge label={`Consumet - ${provider}`} />
```

### Disclaimer Legal

```tsx
<Modal title="Aviso Legal">
  <p>
    El contenido de video proviene de servidores de terceros. 
    Los derechos de autor pertenecen a sus respectivos dueños.
  </p>
  <p>
    Usa servicios legales como Crunchyroll, Netflix o Amazon Prime 
    para apoyar a los creadores.
  </p>
  <Checkbox label="No mostrar de nuevo" />
</Modal>
```

---

## 📊 Monitoreo & Análisis

```typescript
// src/services/analyticsService.ts

export const trackStreamEvent = (event: {
  provider: string;
  anime: string;
  episode: number;
  quality: string;
  timestamp: Date;
  duration_watched: number;
}) => {
  // Analytics anónimo
  // NO rastrear IP ni identificadores personales
  
  const payload = {
    event_type: 'stream_play',
    provider: event.provider,
    quality: event.quality,
    duration: event.duration_watched,
  };

  // Enviar a tu backend
  fetch('/api/analytics', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
};
```

---

## 🎯 Timeline de Implementación

### Semana 1:
- [ ] Instalar Consumet
- [ ] Crear consumetService.ts
- [ ] Tests unitarios

### Semana 2:
- [ ] Migrar AnimeFlv a Consumet
- [ ] Testear con 100 animes
- [ ] Medir velocidad/confiabilidad

### Semana 3:
- [ ] Migrar GogoAnime
- [ ] Implementar fallback chain
- [ ] Deploy a beta

### Semana 4:
- [ ] Monitoreo en producción
- [ ] Retirar scrapers Legacy
- [ ] Optimizaciones finales

---

## 🚀 Beneficios Esperados

| Metrica | Antes | Después | Mejora |
|---------|-------|---------|--------|
| **Uptime** | 75% | 95%+ | +26% |
| **Ads** | 7/10 | 2/10 | -71% |
| **Velocidad promedio** | 3.5s | 1.2s | -65% |
| **Confiabilidad** | 70% | 95%+ | +35% |
| **Time to market** | - | -50% | Menos desarrollo |

---

## ⚠️ Riesgos Mitigados

| Riesgo | Impacto | Mitigación |
|--------|--------|-----------|
| **Consumet desaparece** | Alto | Mantener fallback a web scrapers |
| **IP baneada** | Medio | Usar proxy/rotation |
| **Cambios API** | Bajo | Comunidad activa mantiene |
| **DDoS de sitios** | Medio | Timeout + retry logic |
| **Datos incompletos** | Bajo | Validación + fallbacks |

---

## 📞 Soporte

Si tienes problemas:
1. Discord Consumet: discord.gg/consumet
2. Documentación: docs.consumet.org
3. GitHub Issues: github.com/consumet/api.consumet.org/issues

---

**Próximos pasos:**
1. Leer ANIME_APIS_ANALYSIS.md completo
2. Instalar Consumet: `npm install consumet`
3. Implementar consumetService.ts
4. Crear tests de fallback
5. Beta testing con usuarios reales
