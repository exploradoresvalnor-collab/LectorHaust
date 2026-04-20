# 🔧 FIX: Loop Infinito en Búsqueda de Manga

## Problema
Algunos manga como "Kimi ga Bokura wo Akuma to Yonda Koro" se quedaban en "Cargando..." indefinidamente porque:

1. No tenían capítulos en MangaDex en español
2. El sistema intentaba buscar capítulos en fuentes externas (ManhwaWeb, etc.)
3. La búsqueda de fuentes externas se ejecutaba infinitamente sin éxito

## Solución Implementada

### 1. Límite de Intentos de Búsqueda
- Máximo 3 intentos de búsqueda de fuentes externas (antes: infinito)
- Si después de 3 intentos no hay capítulos, se muestra error

### 2. Global Timeout
- Timeout global de 20 segundos en `useMangaDetails`
- Si después de 20s no se carga nada, muestra lo que tiene

### 3. Logs Mejorados
- Ahora muestra `[Details] Haus Intelligence (attempt X/3)`
- Facilita el debugging si falla

## Resultado

**Antes:**
```
[Search] Cascade for: "..."  (infinitamente)
[Details] Testing candidate: ...
[Details] Testing candidate: ...
... forever ...
```

**Ahora:**
```
[Details] Haus Intelligence (attempt 1/3)...
[Details] Haus Intelligence (attempt 2/3)...
[Details] Haus Intelligence (attempt 3/3)...
[Details] Max external search attempts (3) reached. Cannot find chapters.
⏱️ Timeout o error mostrado en UI
```

## Prueba

1. Recarga `localhost:5173`
2. Abre el manga "Kimi ga Bokura wo Akuma to Yonda Koro"
3. Debería:
   - Mostrar los detalles del manga
   - Intentar 3 veces encontrar capítulos externos
   - Rendirse después de ~3-5 segundos (no más de 20s)
   - Mostrar un mensaje de error si no encuentra capítulos

Si aún así se queda en loading por más de 25 segundos = hay otro problema.
