# 🔧 FIX: Manga "No Terminal de Renderizar" en Producción

## Problema Reportado
En producción, algunos manga se quedan en estado de "Cargando..." sin renderizar nunca, mientras que MangaDex responde correctamente (200 en 908ms).

## Root Cause
1. **Timeout global demasiado largo**: 20 segundos (usuario espera 20s para ver error)
2. **AniList rate-limited (429)**: Está siendo golpeado demasiadas veces y devuelve 429
3. **Worker fallback también rate-limited**: Cloudflare worker devuelve 429
4. **Timeout en AniList muy largo**: 15 segundos para un servicio no-esencial

## Soluciones Implementadas

### 1. ✅ Reducido Global Timeout de Details
**Antes:** 20 segundos
**Ahora:** 12 segundos
```typescript
const globalTimeoutMs = 12000; // 12s en lugar de 20s
```
**Beneficio:** Si algo falla, muestra error 8 segundos antes

### 2. ✅ Reducido AniList Timeout
**Antes:** 15 segundos
**Ahora:** 5 segundos (3x más rápido)
```typescript
export async function postGraphQL<T = any>(
  url: string,
  query: string,
  variables: Record<string, any> = {},
  timeoutMs = 5000 // Reduced from 15s
)
```
**Beneficio:** Si AniList está rate-limitado, falla rápido sin bloquear detalles del manga

### 3. ✅ Mejorado Logging en useMangaDetails
Ahora registra:
- `[Details] START: Fetching manga...`
- `[Details] ✅ Main fetch completed in Xms`
- `[Details] ✅ Setting loading=false`

**Beneficio:** Podemos ver exactamente dónde se queda colgado

### 4. ✅ Mejorado Logging en useMangaReader
Ahora registra:
- `[Reader] START: Checking offline status...`
- `[Reader] ✅ Metadata fetched successfully...`
- `[Reader] Marking loading as complete`

**Beneficio:** Diagnosticar dónde se queda colgado el lector

## Resultado Esperado

**Antes:**
```
User: Abre manga
UI: "Cargando..." (20 segundos después)
User: Se cansa, recarga
```

**Ahora:**
```
User: Abre manga
Logs: [Details] START...
Logs: [Details] ✅ Main fetch completed in 800ms
Logs: [Details] ✅ Setting loading=false
UI: Manga aparece en < 2 segundos
(Si AniList falla, se muestra sin esa data en 5 segundos)
```

## Para Verificar en Producción

1. Abre DevTools Console
2. Abre un manga
3. Mira estos logs en orden:
   - `[Details] START` ← Empieza
   - `[Details] ✅ Main fetch completed in Xms` ← Detalles OK (debería ser < 2s)
   - `[Details] ✅ Setting loading=false` ← Renderizado

4. Si ves `[Details] CRITICAL: Global timeout exceeded`:
   - Main fetch tardó > 12 segundos
   - Problema en MangaDex o en Vite proxy en producción

5. Si ves `[AniList] Worker Fallback returned 429`:
   - AniList está rate-limitado pero OK (no afecta detalles del manga)

## Debugging Tips

Si aún se queda en loading:
1. Abre DevTools Network tab
2. Busca peticiones a `/api-md/manga/...` - ¿Cuánto tardan?
3. Si tardan > 12s = problema en proxy de producción
4. Si devuelven 429 = rate limited
5. Si devuelven error = API down

## Notas

- AniList es **completamente opcional** (background Promise, sin await)
- MangaDex es **crítico** (debe completar en < 12s)
- Si el problema persiste, el issue está en la red entre Vercel ↔ MangaDex
