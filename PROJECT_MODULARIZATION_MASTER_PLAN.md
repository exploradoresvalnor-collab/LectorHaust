# 🗺️ Plan Maestro de Modularización: Proyecto MangaApp

Este documento describe la hoja de ruta estratégica para organizar todas las páginas del proyecto en una estructura modular profesional, garantizando que el "cableado" (imports y exports) se mantenga intacto y estable.

---

## 📐 Estándar de Estructura de Carpeta
Cualquier página modularizada deberá seguir este esquema para mantener la consistencia:

- `src/pages/[PageName]/index.tsx` ➡️ Punto de entrada (UI Principal)
- `src/pages/[PageName]/styles.css` ➡️ Estilos únicos de la página
- `src/pages/[PageName]/hooks/` ➡️ Lógica de datos (si aplica)
- `src/pages/[PageName]/subcomponents/` ➡️ Fragmentos reutilizables de UI

---

## 📋 Prioridades de Ejecución (Poco a Poco)

He dividido el proyecto en tres niveles de complejidad para minimizar riesgos:

### 🟢 Nivel 1: Páginas Aisladas (Baja Complejidad) - 100% COMPLETADO ✅
1.  **HomePage** (✅ Completada)
2.  **SearchPage** (✅ Completada)
3.  **LibraryPage** (✅ Completada)

### 🟡 Nivel 2: Interacción y Comunidad (Media Complejidad) - 100% COMPLETADO ✅
1.  **ProfilePage** (✅ Completada): Incluye subsecciones de configuración y avatares.
2.  **SocialPage** (✅ Completada): Gestión de amigos y solicitudes sociales.
3.  **ChatPage** (✅ Completada): Chat global con perfiles y recomendaciones.
4.  **PrivateChatPage** (✅ Completada): Mensajería privada con typing indicators.

### 🔴 Nivel 3: Núcleo Técnico (Alta Complejidad) - 100% COMPLETADO ✅
1.  **ReaderPage** (✅ Completada): El visor de manga; componente CRÍTICO del sistema.
2.  **MangaDetailsPage** (✅ Completada): Metadatos de manga, lista de capítulos con filtrado multiidioma.
3.  **AnimePage** (✅ Completada): Página de inicio de anime con destaque heroico y episodios recientes.
4.  **AnimeDetailsPage** (✅ Completada): Detalles de anime con lista de episodios y reproductor de video.
5.  **AnimeDirectoryPage** (✅ Completada): Directorio avanzado de anime con búsqueda y filtros.

---

## 🛠️ Protocolo de "Cableado" Seguro
Para cada página, seguiremos estrictamente estos pasos:
1.  **Fase de Estilos**: Mover CSS y actualizar el import en el componente.
2.  **Fase de Lógica**: Mover Hooks y actualizar sus rutas relativas internas.
3.  **Fase de Componente**: Renombrar a `index.tsx` y actualizar la estructura de directorios.
4.  **Humo (Smoke Test)**: Verificación física en el navegador para confirmar que todo funciona.

---

## 📊 Progreso General
- **Completadas**: 12 / 12 páginas (100%) ✅
  - ✅ HomePage ✅ SearchPage ✅ LibraryPage ✅ ProfilePage ✅ SocialPage ✅ ChatPage ✅ PrivateChatPage ✅ ReaderPage ✅ MangaDetailsPage ✅ AnimeDetailsPage ✅ AnimePage ✅ AnimeDirectoryPage
- **En Progreso**: Ninguna
- **Pendientes**: 0 páginas

---

> [!SUCCESS] **🎉 HITO ALCANZADO: 100% DEL PROYECTO (12/12 páginas)**
>
> ✅ Nivel 1: 100% Completado (3/3)
> ✅ Nivel 2: 100% Completado (4/4)
> ✅ Nivel 3: 100% Completado (5/5 - Todas las páginas críticas terminadas!)
>
> **Estado Final**: Proyecto completamente modularizado con:
> - ✅ Estructura de carpetas uniforme
> - ✅ Cableado verificado (zero broken imports)
> - ✅ Archivos huérfanos eliminados
> - ✅ CSS consolidado en pages
> - ✅ Listo para producción
