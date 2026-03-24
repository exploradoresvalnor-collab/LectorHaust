# 📖 LectorHaus

**Tu lector de manga premium, PWA-first, con estética Glassmorphism.**

LectorHaus es una aplicación web progresiva (PWA) para descubrir, leer y descargar manga, manhwa y manhua desde múltiples proveedores, con un sistema social integrado y soporte offline completo.

---

## 🛠️ Tech Stack

| Capa | Tecnología |
|------|-----------|
| **Frontend** | React 19 · TypeScript · Ionic 8 |
| **Estado** | Zustand (persist) · TanStack React Query |
| **Backend** | Firebase (Auth, Firestore, Hosting) |
| **APIs** | MangaDex · ManhwaWeb · MangaPill · AniList |
| **Offline** | IndexedDB (offlineService) · Service Worker |
| **Build** | Vite 6 · Vercel (producción) |

---

## 🚀 Inicio Rápido

```bash
# 1. Clonar el repositorio
git clone <tu-repo-url>
cd mangaApp

# 2. Instalar dependencias
npm install

# 3. Iniciar en modo desarrollo
npm run dev

# 4. Build de producción
npm run build
```

La app correrá en `http://localhost:5173`

---

## 📂 Estructura del Proyecto

```
src/
├── components/      # Componentes reutilizables (SmartImage, CommentSection, etc.)
├── hooks/           # Custom hooks (useHomeData, useMangaDetails, useMangaReader, useSearch)
├── pages/           # Páginas principales (Home, Search, Library, Profile, Chat, Reader)
├── services/        # Servicios de API, Firebase, red, caché y descargas
├── store/           # Zustand stores (Library, Settings, Language)
├── theme/           # Variables CSS y estilos globales
├── types/           # TypeScript interfaces
└── utils/           # Traducciones y helpers
```

---

## ✨ Features Principales

- **🌐 Multi-Proveedor**: MangaDex + ManhwaWeb + MangaPill con Intelligent Fallback automático
- **📖 Lector Premium**: Scroll vertical (webtoon) y paginado (manga), prefetching, RTL
- **💾 Descargas Offline**: Lee sin conexión desde IndexedDB
- **👥 Social**: Chat global, mensajes privados, sistema de amigos (Nakamas)
- **👤 Perfiles**: Niveles, XP, logros, estadísticas de lectura
- **🔐 Auth Dual**: Google Sign-In + Modo Fantasma (anónimo con bandera del país)
- **☁️ Cloud Sync**: Favoritos, historial y progreso sincronizados con Firestore
- **💰 Donaciones Crypto**: Solana, Tron (TRC20), Binance Smart Chain (BEP20)
- **🌍 Multi-idioma**: Español, English, Português, Français, Deutsch

---

## 📋 Estado de Producción

Consulta [`REVISION_PRODUCCION.md`](./REVISION_PRODUCCION.md) para ver el estado detallado de cada sistema auditado.

---

## 📄 Licencia

Proyecto privado. Todos los derechos reservados.
