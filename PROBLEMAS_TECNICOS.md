# 🛡️ Problemas Técnicos y Deuda Técnica

Este documento detalla los problemas identificados, errores de linting y la hoja de ruta técnica para alcanzar la visión de **Lector Haus** a fecha de **21 de Marzo, 2026**.

## 🚀 Visión: Cobertura Total ("No Manga Left Behind")

El objetivo fundamental del proyecto es que el usuario **nunca** reciba un "No se encontraron resultados" si el contenido existe en algún rincón de la web. Nuestra "lucha" actual es integrar múltiples proveedores (MangaDex, MangaPill, etc.) de forma que actúen como un solo ecosistema inteligente.

### El "Fallback" Inteligente
La meta es que el `mangaProvider.ts` no sea un simple interruptor manual, sino un orquestador que:
1.  **Busque en Cascada**: Si MangaDex no tiene un título (especialmente Manhwas coreanos o Mangas licenciados retirados), el sistema debe consultar automáticamente a MangaPill.
2.  **Unificación de Resultados**: Los resultados de búsqueda deben ser una lista combinada y deduplicada, priorizando fuentes de alta calidad pero asegurando disponibilidad total.
3.  **Transparencia al Usuario**: El usuario debe ver el contenido de forma fluida, sin importar de qué "hausa" provenga originalmente la data.

## 1. ⚠️ Errores de Linting (Prioridad Alta)

### `src/hooks/useSearch.ts`
*   **Error**: `eslint(no-const-assign): Unexpected re-assignment of const variable activeOrder`
*   **Detalles**: ESLint reporta una reasignación de la constante `activeOrder` (proveniente de `useState`) alrededor de la línea 234. 
*   **Causa Probable**: Uso incorrecto de `activeOrder = ...` en lugar de `setActiveOrder(...)` dentro de la función `handleSearch`.
*   **Estado**: Pendiente. No se ha localizado una reasignación directa en el código visible, lo que sugiere que podría ser un error derivado de una desestructuración mal formada o un conflicto con una variable de mismo nombre en un scope superior no detectado por las herramientas de búsqueda estándar. Se recomienda refactorizar el fragmento de `orderParam` para evitar el uso de `activeOrder` como clave dinámica sin validación previa.

## 2. 🧩 Integración de MangaPill (Back-end/Scraping)

*   **Fragilidad del Scraping**: La lógica de `mangapillService.ts` depende de expresiones regulares (regex) para extraer datos del HTML. Cualquier cambio en el diseño de MangaPill romperá la integración.
*   **Faltantes de Metadata**: Aunque se mejoró la obtención de portadas y descripciones, algunos datos como el "Status" del manga están hardcodeados como `completed` por simplicidad.
*   **Proxy de Imágenes**: La aplicación depende críticamente del Worker de Cloudflare (`manga-proxy.mchaustman.workers.dev`) para inyectar cabeceras `Referer`. Si el Worker cae, las imágenes de MangaPill darán error 403.

## 3. 🏗️ Arquitectura de Servicios

*   **Inconsistencia de Modelos**: Se está forzando a MangaPill a devolver objetos que imitan la API de MangaDex. Esto crea estructuras de datos "híbridas" que pueden causar errores si otros componentes esperan campos específicos de MangaDex que MangaPill no provee (ej. IDs de relaciones, UUIDs reales).
*   **Prefijos de ID**: El sistema de prefijos `mp:` es una solución temporal efectiva, pero requiere que todos los hooks y servicios verifiquen `isExternalId` constantemente.

## 4. 📱 Entorno Nativo (Capacitor)

*   **Bypass de Proxy**: En plataformas nativas (Android/iOS), se omite el proxy para las peticiones de red si se asume que Capacitor maneja los CORS. Sin embargo, si MangaPill bloquea por `User-Agent` o `Referer` en nativo, habrá que forzar el uso del proxy también allí.

## 5. ⚡ Rendimiento y UX

*   **Sobrecarga de Estado en Hooks**: El hook `useHomeData.ts` maneja más de 15 variables de estado simultáneamente. Esto incrementa la complejidad de renderizado y dificulta la depuración. Se recomienda el uso de `useReducer` o la división en sub-hooks (ej. `useHeroData`).
*   **Polling en Segundo Plano**: El sistema de notificaciones en `useHomeData.ts` realiza peticiones cada 5 minutos mediante `setInterval`. Esto consume batería y datos de forma innecesaria en dispositivos móviles. Sería preferible un sistema basado en eventos o refresco manual bajo demanda.
*   **Filtros de Búsqueda Pesados**: La función `handleSearch` en `useSearch.ts` tiene un array de dependencias masivo que incluye todos los estados de los filtros. Esto puede causar re-creaciones frecuentes de la función y ejecuciones innecesarias si no se maneja con cuidado el debouncing en los selectores.

## 6. 🛠️ Calidad de Código y Mantenibilidad

*   **Duplicación de Lógica de Cache**: La lógica de "fetch o cache" se repite manualmente en varios puntos de `useHomeData.ts`. Esto debería abstraerse en un helper dentro de `mangaProvider` o una utilidad de fetch-with-cache.
*   **Hardcoding de Endpoints**: Se observan URLs de producción y de desarrollo (Cloudflare Workers) escritas directamente en el código de servicios. Estas deben moverse a variables de entorno (`.env`) para facilitar el despliegue en diferentes stages.
*   **Parseo de IDs Manual**: El sistema depende de separar IDs mediante `split('/')` o `split('-')` en múltiples archivos. Si el formato del ID cambia (ej. MangaPill agrega una sección más), habrá que editar muchos archivos. Se recomienda una clase `MangaId` centralizada.
*   **Bug en `cacheService.ts`**: La función `clearByPrefix` itera sobre `localStorage` usando un índice mientras remueve elementos, lo que causa que los índices se desplacen y se omitan elementos por borrar. Debe usarse una lista de claves previa a la eliminación.

## 7. 🗓️ Roadmap de Estabilización

1.  **Refactor de `mangaProvider`**: Implementar lógica de búsqueda multi-fuente secuencial.
2.  **Mapeo de Títulos**: Crear un sistema de búsqueda por títulos normalizados para evitar duplicados entre proveedores.
3.  **Robustez de Proxies**: Diversificar los proxies de imágenes para evitar puntos únicos de fallo.

---
> [!IMPORTANT]
> Nuestra prioridad actual es que **si en MangaDex no tenemos un manga o contenido coreano, aparezca inteligentemente desde MangaPill**. Esta es la funcionalidad core por la que estamos trabajando.

---
> [!NOTE]
> Este documento no es una lista exhaustiva de errores, sino una auditoría técnica orientada a la mejora continua y reducción de deuda técnica.

---
*Documento generado para seguimiento del equipo de Lector Haus.*
