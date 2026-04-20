# 🔍 Debug Guide: Manga Loading Issue in Local Dev

## ¿Qué cambió?

Se agregó **logging detallado** en los siguientes puntos:
1. `rateLimitedFetch()` - Muestra cada FETCH y su duración
2. `apiFetch()` - Rastreo completo del ciclo de vida del request
3. `useMangaReader.ts` - Logs mejorados en getChapterPages

## 🧪 Cómo probar:

### Paso 1: Asegurar que Vite está corriendo en localhost:5173
```bash
# En tu terminal de Vite, debería mostrar:
# VITE v5.x.x  ready in XXX ms
# ➜  Local:   http://localhost:5173/
```

### Paso 2: Abrir DevTools Console
- Press: `F12` → `Console` tab
- **Busca los logs azules** `[apiFetch]` y `[Reader]`

### Paso 3: Abrir un manga en localhost (ej: "Mad Miniscape")
1. Ve a Home
2. Click en un manga
3. Click en un capítulo para abrir Reader
4. **Observa la consola**

---

## 📊 Expected Logging Sequence

Si **TODO FUNCIONA BIEN**, deberías ver:

```log
[apiFetch] START: /manga/xxxxx (DEV, timeout=12000ms)
[apiFetch] CALLING: /api-md/manga/xxxxx
[MangaDex] FETCH → /api-md/manga/xxxxx...
[MangaDex] RESPONSE ← 200 in 250ms
[apiFetch] GOT RESPONSE: 200 for /manga/xxxxx
[apiFetch] PARSING JSON for /manga/xxxxx
[apiFetch] ✅ SUCCESS: /manga/xxxxx (5234 bytes)

[Reader] Calling getChapterPages(7fea037e-343e-433d-96db-2bd9b08d433c, quality=data)...
[apiFetch] START: /at-home/server/7fea037e-343e-433d-96db-2bd9b08d433c (DEV, timeout=12000ms)
[apiFetch] CALLING: /api-md/at-home/server/7fea037e-343e-433d-96db-2bd9b08d433c
[MangaDex] FETCH → /api-md/at-home/server/7fea037e-343e-433d-96db-2bd9b08d433c...
[MangaDex] RESPONSE ← 200 in 300ms
[apiFetch] GOT RESPONSE: 200 for /at-home/server/...
[apiFetch] PARSING JSON for /at-home/server/...
[apiFetch] ✅ SUCCESS: /at-home/server/... (2048 bytes)
[Reader] ✅ getChapterPages returned: 25 pages
[Reader] Setting pages state with 25 pages
✅ PÁGINAS CARGADAS
```

---

## 🔴 Si VES ESTOS LOGS = PROBLEMA

### 🔴 **PROBLEMA 1: Proxy Response 404**
```log
[apiFetch] CALLING: /api-md/manga/xxxxx
[MangaDex] RESPONSE ← 404 in 50ms
[apiFetch] HTTP 404 from /manga/xxxxx
[apiFetch] 🔄 Attempting Worker Fallback for: /manga/xxxxx
[apiFetch] Worker returned: 429
[apiFetch] ❌ Worker Fallback failed: Worker Fallback returned 429
```

**Causa:** El proxy de Vite no está funcionando correctamente.

**Solución:**
```bash
# Reinicia Vite completamente
# Ctrl+C en la terminal de Vite
npm run dev
```

---

### 🔴 **PROBLEMA 2: Timeout en Proxy (no responde)**
```log
[apiFetch] CALLING: /api-md/manga/xxxxx
[apiFetch] ⏱️ TIMEOUT after 12000ms: /manga/xxxxx
[apiFetch] CATCH ERROR: AbortError: The operation was aborted.
```

**Causa:** 
- El proxy de Vite nunca responde
- Problema de DNS o firewall con api.mangadex.org

**Solución:**
```bash
# Prueba si mangadex está accesible desde tu red
curl https://api.mangadex.org/manga
# Si devuelve JSON = OK
# Si devuelve error = Firewall bloqueando
```

---

### 🔴 **PROBLEMA 3: Worker Rate Limited (429)**
```log
[apiFetch] 🔄 Attempting Worker Fallback for: /at-home/server/xxxxx
[apiFetch] Worker returned: 429
[apiFetch] ❌ Worker Fallback failed: Worker Fallback returned 429
```

**Causa:** El Worker Cloudflare está siendo rate limitado porque recibe muchas requests.

**Solución:** Espera unos minutos o contacta al owner del worker.

---

### 🔴 **PROBLEMA 4: Empty JSON Response**
```log
[apiFetch] GOT RESPONSE: 200 for /manga/xxxxx
[apiFetch] PARSING JSON for /manga/xxxxx
[apiFetch] ❌ SUCCESS: /manga/xxxxx (0 bytes)
```

**Causa:** MangaDex devolvió 200 OK pero response vacía.

**Solución:** Podría ser un problema en MangaDex. Intenta con otro manga.

---

### 🔴 **PROBLEMA 5: Reader nunca llama getChapterPages**
```log
[Reader] Checking offline status for: 7fea037e-343e-433d-96db-2bd9b08d433c
[Reader] Offline check bypassed (Timeout/Error)
[Reader] Fetching pages from network...
[Reader] ⏱️ TIMEOUT after 25000ms: FATAL ERROR
[Reader] Tiempo de espera agotado. Intenta de nuevo.
```

**Causa:** El método `getChapterPages` nunca fue llamado o se cuelga.

**Solución:** 
1. Abre Network tab en DevTools
2. Filtra por `/api-md/at-home`
3. ¿Aparece la petición? 
   - SÍ → problema en MangaDex o rate limit
   - NO → problema en código, contactame

---

## 🔧 Quick Fixes a Intentar

### 1. **Limpiar caché local**
```javascript
// En DevTools Console:
localStorage.clear();
indexedDB.databases().then(dbs => dbs.forEach(db => indexedDB.deleteDatabase(db.name)));
console.log('✅ Caché limpiada. Recarga la página');
```

### 2. **Forzar hard refresh**
```
Ctrl + Shift + R  (Windows/Linux)
Cmd + Shift + R   (Mac)
```

### 3. **Comprobar si Vite está corriendo**
```bash
# En PowerShell:
netstat -ano | findstr :5173
# Si aparece algo = Vite está corriendo
```

---

## 📝 Información a Proporcionar

Si aún falla, **copia TODOS estos logs del DevTools Console:**

1. Los primeros 5 logs `[apiFetch]` o `[Reader]`
2. El último log antes del error
3. Usa este formato en el chat:

```
[apiFetch] START: /manga/xxxxx (DEV, timeout=12000ms)
[apiFetch] CALLING: /api-md/manga/xxxxx
...
[apiFetch] ❌ FATAL ERROR after all retries: /manga/xxxxx
```

---

## 🚀 Next Steps

1. **Recarga la página** con F5
2. **Abre DevTools** (F12 → Console)
3. **Intenta abrir un manga**
4. **Espera 5-30 segundos** para ver logs
5. **Toma una screenshot** de los logs
6. **Comparte conmigo**

¡Con los nuevos logs, podré identificar exactamente dónde se cuelga!
