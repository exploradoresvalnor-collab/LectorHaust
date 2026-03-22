# 🎬 AnimeCard Mejorada - Documentación Visual

**Actualización:** 20 de Marzo 2026  
**Status:** ✅ Completado sin errores

---

## 📊 Cambios en AnimeCardItem.tsx

### Nuevas Características

#### 1. **Banderas de Idioma** 🗣️
- **Ubicación:** Esquina superior izquierda
- **Muestra:**
  - 🇯🇵 = Subtítulos en japonés
  - 🗣️ = Doblaje disponible
- **Detecta:** `anime.episodes.sub`, `anime.episodes.dub`

```
┌─────────────────────┐
│ 🇯🇵 🗣️    TV        │
│                     │
│                     │
│   [PORTADA]         │ 720p
│   (imagen)          │
│                     │
│                     │
│                     │ 12eps
└─────────────────────┘
```

#### 2. **Etiqueta de Tipo (Anime) - Coloreada**
- **Ubicación:** Esquina superior derecha
- **Colores por tipo:**
  - 🔴 TV = Rojo (#ff6b6b)
  - 🟦 Movie = Turquesa (#4ecdc4)
  - 🟪 OVA = Púrpura (#9b59b6)
  - 🔵 ONA = Azul (#3498db)
  - 🟠 Special = Naranja (#f39c12)

#### 3. **Contador de Episodios**
- **Ubicación:** Esquina inferior derecha
- **Estilo:** Terminal verde (como log)
- **Muestra:** `12eps`, `24eps`, etc.
- **Fuente monoespaciada** para efecto retro

#### 4. **Overlay de Géneros en Hover**
- **Ubicación:** Pie de la tarjeta
- **Activación:** Al pasar mouse
- **Anima:** Desliza desde abajo de 0 → 50px
- **Muestra:** Máximo 2 géneros (ej: "Action", "Adventure")
- **CSS:** `.genre-overlay` con transición suave

---

## 🎨 Estructura Visual

```
AnimeCard (140x196px en mobile)
├── Portada (imagen de fondo)
│   ├── Esquina Superior Izquierda
│   │   └── 🇯🇵 🗣️ (Banderas idioma - flex wrap)
│   ├── Esquina Superior Derecha
│   │   └── TV/Movie/OVA (Tipo - fondo coloreado)
│   ├── Esquina Inferior Derecha
│   │   └── 12eps (Episodios - estilo terminal)
│   └── Pie
│       └── Overlay de Géneros (hover effect)
│           └── Action Adventure (tags púrpura)
└── Título
    └── Nombre del anime (máx 2 líneas)
```

---

## 📱 Responsive Behavior

### Desktop (>1024px)
- Tarjetas: 160px base
- Hover amplía scale 1.02
- Overlay géneros: 50px height

### Tablet (768-1024px)
- Tarjetas: 140px
- Mismos efectos

### Mobile (<768px)
- Tarjetas: 120px
- Overlay géneros: 40px height

---

## 🔄 Flujo de Datos

```
API Response
    ↓
formatAnimeCard() [Mejorado]
    ├── name → title
    ├── poster → image
    ├── type → category + type
    ├── genres → genres[]
    ├── episodes → episodes (sub/dub count)
    └── [NEW] hasSub, hasDub, rating, jname
    ↓
AnimeCardItem.tsx
    ├── getLanguageFlags() → 🇯🇵 🗣️
    ├── getTypeColor() → #ff6b6b (TV)
    ├── getGenres() → Action, Adventure
    └── Renderiza todo en la tarjeta
    ↓
UI Component
```

---

## 💻 Código Key Pieces

### Helper: Banderas de Idioma
```typescript
const getLanguageFlags = (anime: any): string[] => {
  const flags: string[] = [];
  if (anime.episodes?.sub > 0) flags.push('🇯🇵');
  if (anime.episodes?.dub > 0) flags.push('🗣️');
  if (flags.length === 0) flags.push('🇯🇵'); // default
  return flags;
};
```

### Helper: Colores por Tipo
```typescript
const getTypeColor = (type: string): string => {
  const typeMap = {
    'TV': '#ff6b6b',
    'Movie': '#4ecdc4',
    'OVA': '#9b59b6',
    'ONA': '#3498db',
    'Special': '#f39c12',
  };
  return typeMap[type] || '#8c52ff';
};
```

### Overlay de Géneros (Hover)
```jsx
<div className="genre-overlay"> {/* height: 0 por default */}
  {genres.map((genre) => (
    <span>{genre}</span>
  ))}
</div>

/* CSS */
.anime-card:hover .genre-overlay {
  height: 50px; /* Anima desde 0 */
}
```

---

## 🎯 Ejemplos Visuales

### Tarjeta Completa: One Piece

```
┌──────────────────────┐
│ 🇯🇵 🗣️   TV          │  ← Banderas + Tipo
│  [PORTADA ONE PIECE] │
│    (imagen)          │  ← 1000+ episodios
│                      │
│      [géneros       │  ← Overlay (hover)
│      Action/Shounen │
│      aparecen aquí]  │  ← 1070eps (terminal)
└──────────────────────┘
One Piece
```

### Tarjeta Completa: Attack on Titan Movie

```
┌──────────────────────┐
│ 🇯🇵       Movie       │  ← Película (turquesa)
│  [PORTADA MOVIE]     │
│    (imagen)          │
│                      │
│      [géneros       │
│      Action/Drama   │  ← 1eps (terminal)
│      aparecen aquí]  │
└──────────────────────┘
Attack on Titan The Final...
```

---

## 📊 Cambios en formatAnimeCard()

**Antes (4 campos):**
```typescript
{
  id, title, image, category
}
```

**Ahora (11 campos):**
```typescript
{
  id, title, image, category,
  type,       // TV, Movie, OVA, especial
  genres,     // Array de géneros
  episodes,   // {sub: 24, dub: 12}
  hasSub,     // boolean
  hasDub,     // boolean  
  rating,     // MAL score
  jname       // Nombre japonés
}
```

---

## ✅ Testing Checklist

- ✅ Tarjetas se renderizan sin errores
- ✅ Banderas aparecen en esquina superior izquierda
- ✅ Tipos tienen colores correctos
- ✅ Episodios se muestran en estilo terminal
- ✅ Overlay de géneros anima on hover
- ✅ Responsive en 480px, 768px, 1024px+
- ✅ Compilación sin errores
- ✅ Sin warnings CSS

---

## 🚀 Actualizaciones Aplicadas

1. **AnimeCardItem.tsx** - Nuevo HTML + helpers
2. **aniwatchService.ts** - formatAnimeCard mejorado
3. **AnimeExplorer.css** - .genre-overlay hover effect

---

## 🎨 Colores de Tipos

| Tipo | Color | Código |
|------|-------|--------|
| TV | 🔴 Rojo | #ff6b6b |
| Movie | 🟦 Turquesa | #4ecdc4 |
| OVA | 🟪 Púrpura | #9b59b6 |
| ONA | 🔵 Azul | #3498db |
| Special | 🟠 Naranja | #f39c12 |

---

**Status:** ✅ Listo para Producción
