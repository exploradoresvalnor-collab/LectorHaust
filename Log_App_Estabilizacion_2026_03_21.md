# Reporte de Integración Anime - Estabilización
**Fecha:** 21 de Marzo de 2026

## 🎯 Estado Actual del Proyecto (Lo que sí funciona)
Tras múltiples pruebas de concepto y batallas contra los bloqueos antibots (Cloudflare), hemos estabilizado la sección de Anime de la aplicación descartando dependencias frágiles y adoptando una arquitectura de **Scrapers Nativos**.

### 1. Motor "Anime Haus" (AnimeFLV Nativo)
- Se reemplazó completamente la API de Aniwatch en el explorador por un scraper nativo (`animeflvService.ts`) que ataca directamente a `www4.animeflv.net`.
- **Características operativas:**
  - Carga de Últimos Episodios y Tendencias de la página principal.
  - Búsqueda Avanzada utilizando arreglos de géneros web nativos (`genre[]=accion&genre[]=romance`).
  - Extracción directa de reproductores IFRAME interceptando las variables ocultas de JavaScript (`var videos = {...}`).
- **Resolución de Bloqueos:** Se eliminaron las restricciones `sandbox` del reproductor nativo, lo que permite que los scripts de servidores como *Mega*, *SW* y *Okru* se ejecuten libremente sin congelar la aplicación ("Debugger Paused").

### 2. Scraper Gogoanime Nativo
- Para contenido en inglés, se reescribió `gogoanimeService.ts` eliminando la dependencia de la API externa (Vercel).
- El scraper extrae los enlaces directos de `<iframe>` leyendo el DOM nativamente y haciendo peticiones con la IP del dispositivo del usuario, saltándose efectivamente el bloqueo de "Datacenter" de Cloudflare.

### 3. Reproductor Híbrido (`VideoPlayer.tsx`)
- Se construyó un reproductor dinámico capaz de interpretar y reproducir tanto *Streams HLS puros (`.m3u8`)* como *Incrustaciones Nativas (`<iframe>`)* dependiendo del proveedor elegido.
- Incorpora un ciclo de recambio de fuentes manual para permitirle al usuario saltar de servidores defectuosos a servidores funcionales de forma unificada.

---

## 🚀 El Plan Futuro (Lo que de verdad funciona para el "Nivel Élite")

Actualmente dependemos de reproductores de terceros (`iframes`) que inyectan su propia publicidad estática web. Si el objetivo definitivo de proyecto es igualar la experiencia de Netflix (Video limpio, sin popups, sin logos quemados), este es el único **Plan de Acción Viable**:

### Fase A: Abandono de IFRAMES y Raspeo de Fuentes Directas
1. **Investigar y perfilar sitios "Raw":** Localizar plataformas latinas (como *MonosChinos*, *TioAnime* o *Jkanime*) que todavía alojen sus archivos en **Google Drive** o **Amazon S3**.
2. **Construir Extractores de MP4:** En lugar de extraer la URL entera del `<iframe src="...">`, construiremos extractores nativos que desentrañen el código fuente del Iframe para obtener directamente el enlace `.mp4`.
3. **Consecuencia:** Al inyectar un `.mp4` puro en una etiqueta `<video>` HTML5 estándar de la app, eliminamos el 100% de la publicidad y de las interacciones bloqueantes (Adiós `sandbox`).

### Fase B: Backend Propio para Aniwatch (HiAnime)
Aniwatch sigue siendo el estándar de oro para subtítulos suaves (VTT) sin marcas de agua.
1. **Descartar Vercel:** Vercel está marcado en la lista negra de Cloudflare, por tanto nuestra API actual arroja errores 500.
2. **Alojamiento Alternativo:** Desplegar el repositorio de *Consumet API* en un VPS privado (DigitalOcean, Linode) o un host menos vigilado por Cloudflare (Railway, Render) para recuperar el acceso a los `.m3u8` limpios de Aniwatch.

### Fase C: Proxy HLS Local (Exclusivo móvil)
- Si un servidor `.m3u8` rechaza reproducir en Web por un error de "CORS", implementaremos el **Capacitor HTTP Plugin**.
- El plugin nativo del teléfono actuará como su propio Proxy local, descargando los fragmentos de video `ts` burlando las reglas de los navegadores web tradicionales y sirviéndolos a la app impecablemente.

---

## 📚 Estado de la Sección de Lectura (Manga)

La sección lectura también ha alcanzado un estado de inmensa estabilidad en las sesiones recientes utilizando un sistema de **"Fallback Dinámico Inteligente"**:

### 1. Motor Principal: MangaDex
- Funciona como la columna vertebral de la aplicación para buscar obras, portadas de alta resolución, obtener metadata oficial y cargar imágenes (`mangadexService.ts`).
- Permite la lectura fluida desde una red gigantesca y sin bloqueos regionales severos.

### 2. Motor de Respaldo Híbrido: MangaPill
- Construimos e integramos `mangapillService.ts` para cubrir los masivos vacíos legales de MangaDex (ej. Obras licenciadas que no permiten lectura de capítulos como *Mashle* o *One Piece*).
- **Resolución de Bugs Críticos:** Se solucionó el problema crónico donde React Router enloquecía con los IDs con diagonales de MangaPill, encriptando las URL con el separador `$`.
- **Inyección de Identidad:** Se modificó la arquitectura para que el Manga Reader nunca perdiera el "Contexto" al cambiar de capítulos empapelando el ID del manga raíz adentro del ID del capítulo (`[mangaId]@[chapterId]`).

### 3. Proxy de Imágenes (Web)
- Hemos afianzado nuestro Cloudflare Worker (`manga-proxy.mchaustman.workers.dev`) para servir como túnel no solo al raspar animes, sino para cargar todas las imágenes restrictivas de MangaPill, marcándolas nativamente con un prefijo `mp:`.

---

## 🔎 Auditoría Profunda: Fugas, Bugs y Mejoras Arquitectónicas (Actualizado)

Tras un escaneo profundo a nivel de compilador (`tsc`) y diseño de componentes, esta es la radiografía atómica de los puntos de quiebre y deuda técnica de la aplicación, detallando el camino exacto para su corrección.

### 🔴 1. Riesgos Críticos de Red (El Cuello de Botella del Proxy)

- **El Problema:** Actualmente dependemos de `manga-proxy.mchaustman.workers.dev` (Cloudflare Worker) para saltarnos las restricciones CORS del navegador Web en imágenes de MangaPill y HTML de AnimeFLV.
- **El Riesgo Matemático:** Cloudflare Workers en su capa gratuita impone un límite de **100,000 peticiones diarias**. Dado que cada imagen de un capítulo de manga es una petición independiente, un solo usuario leyendo 10 capítulos de 30 páginas generará ~300 peticiones. Con solo 300 usuarios activos diarios, el límite estallará, arrojando el Error HTTP 429 y colapsando el despliegue para todos.
- **Solución Arquitectónica (Capacitor Http):** Ya que la app tiene como destino final Android/iOS, la solución es evadir el proxy web en producción. En los contenedores nativos, el bloqueo CORS no existe si usamos el protocolo interno. Se debe refactorizar `manga-proxy` para que, cuando detecte `Capacitor.isNativePlatform()`, las promesas utilicen `CapacitorHttp.get({ url })` saltándose a Cloudflare por completo.

### 🟡 2. Rendimiento, Caching y Fugas de Memoria (Memory Leaks)

- **Basura Computacional en `VideoPlayer.tsx`:**
  - **Diagnóstico:** El diseño de React en el `<VideoPlayer>` desmonta y vuelve a montar nodos inmensos iterando entre `<iframe>` y `<video>` (HLS.js) violentamente con cada renderizado condicional. Esto deja residuos en la memoria del navegador y del dispositivo al desincronizar los scripts nativos de los iframes.
  - **Solución Práctica:** Migrar a una arquitectura de "Aislamiento de Dominios via CSS". Ambos reproductores (`HLS` e `Iframe`) deben coexistir montados en el DOM permanentemente, controlando su visibilidad estrictamente con una capa de estilos (`display: none` o `visibility: hidden`) en lugar de depender del Reconciliation Engine de React para matarlos y revivirlos.

- **Vampirismo de Ancho de Banda en `MangaReader`:**
  - **Diagnóstico:** Al cambiar de página (hacia atrás) o re-visitar capítulos, la App obliga al servidor remoto y al Proxy a re-descargar los mismos JPEGs de alta resolución, desperdiciando datos móviles del usuario.
  - **Solución Dinámica:** Implementar el paradigma de **Offline-First**. Aplicar `Cache-Control` estricto en los headers del Proxy, y utilizar **IndexedDB** a nivel front-end para guardar Blobs temporales de los últimos 20 capítulos, o el sistema **Capacitor Filesystem** para cachear de forma física en el almacenamiento del teléfono.

### 🟠 3. Sanidad del Código (TypeScript Estricto)

- **Verificación Pasada (0 Errores Actuales):** Se corrió el compilador atómico `npx tsc --noEmit` a lo largo de los más de 80 archivos del proyecto. Se descubrieron 4 fallas silenciosas en la tipificación genérica en `useHomeData.ts` y `useMangaReader.ts` que provocaban variables "implicitly any" en retornos de Promises de `mangaProvider`.
- **Estado:** Estos 4 errores se resolvieron inmediatamente. **La aplicación compila hoy con 100% de sanidad técnica (Cero Errores).**
- **Deuda Pendiente (Interfaces Zod):** Aunque el proyecto compila, casi todos los scrapers (`animeflvService.ts`, `gogoanimeService.ts`) prometen devolver `any[]`. Se recomienda encarecidamente incrustar interfaces estrictas (ej. `interface AnimeScrapeResult { slug: string; cover: string }`) y usar **Zod Validation** para fallar elegante si mañana AnimeFLV decide cambiar las etiquetas HTML `<h3 class="Title">` por otra clase estructurada.

### 🟣 4. Arquitectura de Estado Local (SQLite)

- **Dependencia a Base de Datos de Nivel 0:** Al día de hoy, funciones como "Historial de Lectura" o "Manga Favorito" almacenan su persistencia posiblemente en `localStorage` o dependen directamente de Firebase vivo. 
- **Evolución Nativa:** En una App de producción móvil realista, un usuario en el tren sin internet abrirá la aplicación esperando ver los mangas que guardó y leer capítulos descargados. Debemos orquestar `@capacitor-community/sqlite` para que la App sea verdaderamente una isla independiente que sincronice contra la nube solo cuando detecte señal Wi-Fi.
