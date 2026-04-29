# FIX: AniList Blocking UI - Implementation Guide

## PROBLEMA
AniList está rate-limited (429) y bloquea la UI porque está en Promise.all() crítico

## SOLUCIÓN: 3 Cambios Necesarios

### 1. useMangaDetails.ts - Sacar AniList de Promise.all()
**Línea ~213-225:** Separar AniList en fetch completamente aparte

ANTES:
```
Promise.all([
  // Translation
  // Statistics  
  // AniList (AQUÍ ESTÁ EL PROBLEMA - bloquea todo)
  // Languages
]);
```

DESPUÉS:
```
Promise.all([
  // Translation
  // Statistics  
  // Languages (sin AniList)
]);

// AniList completamente separado - NO bloquea
(async () => {
  // AniList fetch aquí
})();
```

### 2. anilistService.ts - Mejorar manejo de 429
**Línea ~36-60:** Aumentar spacing y manejar 429 mejor

CAMBIOS:
- MIN_SPACING: 800ms → 1200ms (respeta rate limits)
- Timeout: 5s → 3s en postGraphQL call
- Si 429: retornar { data: null } en lugar de throw

### 3. apiHelpers.ts - No reintentar en 429
**Línea ~76-140:** Si recibe 429, fail fast sin fallback

CAMBIOS:
- Detectar 429 al inicio
- No intentar fallback si es 429 (es rate limit, no error)
- Fallback timeout: 8s → 6s

## RESULTADO ESPERADO
✅ Manga Details carga en < 2 segundos
✅ AniList falla silenciosamente en background
✅ No más "negro" durante 15 segundos
✅ GlobalLoading se limpia rápidamente
