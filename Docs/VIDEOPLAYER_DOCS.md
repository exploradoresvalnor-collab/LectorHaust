# 🎬 VideoPlayer - Reproductor HLS

**Status:** ✅ Completado sin errores  
**Librería:** HLS.js  
**Fecha:** 20 de Marzo 2026

---

## 📺 Características

### 1. **Reproducción HLS (M3U8)**
- Soporte nativo para streams HTTP Live Streaming
- Fallback automático para Safari (nativo)
- Detección automática de resoluciones disponibles

### 2. **Selector de Idiomas**
- 🇯🇵 **Subtítulos** - Cargar versión japonesa subtitulada
- 🗣️ **Doblaje** - Cargar versión doblada (si disponible)
- Las opciones se cargan dinámicamente según disponibilidad del episodio

### 3. **Selector de Servidores**
- Buttons interactivos que muestran qué servidores tinene disponible el episodio
- Cambio dinámico de servidor sin recargar
- Indicador visual del servidor activo (coloreado en primary)

### 4. **Subtítulos**
- Muestra idiomas disponibles
- Cargados desde el stream (si .vtt disponible)
- Integración automática con video element

### 5. **Controles**
- Video element estándar HTML5
- Play/Pause/Fullscreen
- Timeline scrubbing
- Volumen

---

## 🏗️ Arquitectura

```
AnimeExplorer.tsx
└── Estado: playingEpisode
    └── VideoPlayer.tsx
        ├── getEpisodeServers() → Listar servidores
        ├── getEpisodeSources() → Obtener stream M3U8
        └── Hls.js → Reproducir M3U8
```

### Flow de Reproducción

```
Usuario clickea episodio
    ↓
setPlayingEpisode(episodeId)
    ↓
VideoPlayer monta
    ↓
useEffect → getEpisodeServers()
    ↓
Muestra selector de idiomas/servidores
    ↓
Usuario selecciona servidor
    ↓
useEffect → getEpisodeSources()
    ↓
Obtiene URL M3U8
    ↓
Hls.js carga y reproduce
```

---

## 💻 Componentes

### VideoPlayer.tsx

**Props:**
```typescript
interface VideoPlayerProps {
  episodeId: string;        // Ej: "one-piece-100?ep=1001"
  animeTitle: string;       // Ej: "One Piece"
  episodeNumber: number;    // Ej: 1001
  imageUrl?: string;        // Poster del anime
  onClose: () => void;      // Callback para cerrar
}
```

**Estructura:**
```
┌─────────────────────────────────┐
│ One Piece | Episodio 1001 | [X] │ ← Header
├─────────────────────────────────┤
│                                 │
│        [VIDEO PLAYER]           │ ← HTML5 video
│        (HLS stream)              │    con Hls.js
│                                 │
├─────────────────────────────────┤
│ 🇯🇵 Subtítulos (3) 🗣️ Doblaje(2)  │
│ [hd-1] [hd-2] [vidstream]       │
│ Subtítulos: English, Spanish... │
└─────────────────────────────────┘
```

---

## 🔧 Uso

### 1. Seleccionar Episodio
```typescript
// En AnimeExplorer:
onClick={() => {
  setPlayingEpisode({
    id: "one-piece-100?ep=1001",
    number: 1001,
    title: "Episodio 1001"
  });
}}
```

### 2. VideoPlayer Se Abre (Modal)
```jsx
{playingEpisode && selectedAnime && (
  <VideoPlayer
    episodeId={playingEpisode.id}
    animeTitle={selectedAnime.title}
    episodeNumber={playingEpisode.number}
    onClose={() => setPlayingEpisode(null)}
  />
)}
```

### 3. Seleccionar Servidor y Reproducir
- Usuario selecciona idioma (SUB/DUB)
- User ve servidores disponibles
- Selecciona servidor
- Stream se carga y reproduce automáticamente

---

## 🎯 API Integration

### 1. getEpisodeServers()
```typescript
// Obtiene qué servidores tienen este episodio
const servers = await aniwatchService.getEpisodeServers(episodeId);

// Respuesta:
{
  sub: [
    {serverId: 4, serverName: "vidstreaming"},
    {serverId: 5, serverName: "gopstream"}
  ],
  dub: [
    {serverId: 1, serverName: "megacloud"}
  ]
}
```

### 2. getEpisodeSources()
```typescript
// Obtiene el stream M3U8 del servidor seleccionado
const sources = await aniwatchService.getEpisodeSources(
  episodeId,
  "vidstreaming",  // serverName
  "sub"            // categoría: sub|dub|raw
);

// Respuesta:
{
  sources: [
    {url: "https://...playlist.m3u8", quality: "720p"},
    {url: "https://...playlist.m3u8", quality: "1080p"}
  ],
  subtitles: [
    {lang: "English", url: "https://.../en.vtt"},
    {lang: "Spanish", url: "https://.../es.vtt"}
  ]
}
```

---

## 📦 Dependencias

- **hls.js** - Reproducción de streams HLS
- **React** - UI components
- **@ionic/react** - Componentes Ionic

```bash
npm install hls.js
```

---

## ⚙️ Configuración HLS

```typescript
const hls = new Hls({
  debug: false,              // Sin logs en consola
  enableWorker: true,        // Web Worker para parsing
  lowLatencyMode: true,      // Baja latencia
  backBufferLength: 90       // Buffer 90s
});
```

---

## 🎨 Estilos

**Modal:**
- Position: fixed (cubre pantalla)
- Z-index: 9999 (sobre todo)
- Background: #000 (fullscreen)

**Header:**
- Fondo semi-transparente
- Título + número episodio
- Botón Cerrar

**Controles:**
- Tabs: SUB/DUB (si disponible)
- Buttons: Servidores dinámicos
- Info: Subtítulos disponibles

---

## 🐛 Manejo de Errores

```typescript
// Error en parsing M3U8
hls.on(Hls.Events.ERROR, (event, data) => {
  if (data.fatal) {
    setError(`Error: ${data.reason}`);
  }
});

// Error en fetch de stream
try {
  const response = await fetch(...);
  // ...
} catch (err) {
  setError(`Error: ${err}`);
}
```

---

## 🚀 Mejoras Futuras

1. **Quality Selector**
   - Mostrar opciones 480p, 720p, 1080p
   - Cambiar sin recargar

2. **Subtítulos Avanzados**
   - Seletor de idioma de subtítulos
   - Ajuste de tamaño/color
   - Sincronización manual

3. **Skip Intros/Outros**
   - Detectar y saltar automáticamente
   - Botones skip manual

4. **Historial**
   - Guardar posición (Zustand + Firebase)
   - "Continuar viendo"

5. **PiP (Picture in Picture)**
   - Flotante mientras navega
   -Modo miniplayer

6. **Recomendaciones**
   - Mostrar next episode card
   - Sugerencias relacionadas

---

## ✅ Testing Checklist

- ✅ VideoPlayer monta correctamente
- ✅ Servidores se detectan
- ✅ SUB/DUB tabs aparecen contextualmente
- ✅ Stream se carga y reproduce
- ✅ Selector de servidor funciona
- ✅ Manejo de errores muestra mensajes
- ✅ Cerrar abre/cierra modal
- ✅ Compilación sin errores
- ✅ Sin warnings

---

**Status:** Listo para Producción ✅
