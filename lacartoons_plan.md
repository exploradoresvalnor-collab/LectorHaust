# Plan de Integración: LACartoons (Servidor de Caricaturas)

Este plan detalla la integración de **LACartoons.com** como el proveedor principal de caricaturas clásicas y modernas en la plataforma. LACartoons ha sido elegido por su organización superior (por canales) y su extenso catálogo de más de 600 series.

## Análisis Técnico de la Fuente

- **Buscador**: `https://lacartoons.com/?Titulo=[QUERY]` (Método GET).
- **Ficha de Serie**: `https://lacartoons.com/serie/[ID]`
- **Ficha de Episodio**: `https://lacartoons.com/serie/capitulo/[EP_ID]?t=[TEMPORADA]`
- **Estructura**: Los episodios están agrupados por temporadas mediante headers colapsables.

## Puntos de Revisión Requeridos (Importante)

1.  **Bloqueo de Anuncios y Popups (Sandbox)**: LACartoons utiliza servidores de video con publicidad agresiva que intenta redirigir fuera de la app (tab-hijacking) al recibir un clic. Para engañar al sistema, el reproductor de video (`<iframe... >`) estará encerrado en un **Iframe Sandbox Estricto** (ej. `sandbox="allow-scripts allow-same-origin allow-presentation"`). Esto previene explícitamente atributos como `allow-popups` y `allow-top-navigation`, garantizando que el usuario pueda reproducir el video sin ser expulsado de la aplicación, y sin que el servidor de origen detecte un AdBlock tradicional.
2.  **Estructura de Temporadas**: A diferencia del anime, las caricaturas requieren una interfaz que soporte la jerarquía de temporadas y una navegación clara entre ellas.

## Cambios Propuestos

### 1. Capa de Servicios

**[NUEVO] `src/services/lacartoonsService.ts`**
- Implementar `search(query)`: Extraer títulos, IDs y posters (limpiando proxies y optimizando tiempos de carga).
- Implementar `getAnimeInfo(id)`: 
    - Extraer descripción y metadatos.
    - Extraer la lista total de temporadas para la serie y generar una estructura de listado de capítulos coherente.
- Implementar `getEpisodeSources(episodeId, season)`: Aislar y extraer el enlace en bruto (src) del reproductor de video.

### 2. UI y Experiencia de Usuario

**[MODIFICAR] `src/pages/AnimeDirectoryPage.tsx`**
- **Separación de Universo**: En lugar de ahogar las "Caricaturas" en los filtros de idioma del Anime, se implementará un Segmentador Principal (Switch superior) con un diseño llamativo: "🌌 Anime Premium" vs "📺 Caricaturas Clásicas".
- Al seleccionar "Caricaturas", la página limpiará la lista, apagará los filtros irrelevantes (ej. Latino/Sub) y cargará contenido exclusivamente de `lacartoonsService`.

**[MODIFICAR] `src/pages/AnimeDetailsPage.tsx`**
- **Selector de Temporadas**: Adaptar la lista de episodios para mostrar selectores de temporada interactivos (dropdown o scroll horizontal de "Temporada 1, 2, 3...") cuando la fuente original tenga temporadas definidas.

**[MODIFICAR] Reproductor de Episodios (`AnimePlayerPage.tsx` o Componente Equivalente)**
- **Iframe Escudo**: Modificar la inyección de `href`/`src` del video para utilizar el sandbox anti-popups, garantizando "clics seguros".

## Plan de Verificación

1.  Realizar una búsqueda de "Bob Esponja" bajo el switch de Caricaturas y revisar que cargue correctamente la imagen y metadatos.
2.  Abrir la ficha de una serie larga (ej: *Los Padrinos Mágicos*) y verificar la navegación suave entre la Temporada 1 y la Temporada 2.
3.  Intentar reproducir un episodio haciendo múltiples "clics trampa" sobre el área central del video para comprobar que la app jamás resulta secuestrada ni se abren ventanas alternas.
