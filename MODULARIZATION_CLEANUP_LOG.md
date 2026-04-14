# Auditoría de Limpieza y Modularización - MangaApp

Este documento registra los hallazgos y acciones tomadas durante el proceso de limpieza "radical" tras la modularización del proyecto.

## 📋 Estado de la Auditoría por Carpeta

### 🏠 1. HomePage
-   [ ] **Código Muerto (JS/TS):**
    -   Import `mangaProvider` no utilizado directamente (vencido por `useHomeData`).
    -   Import `closeOutline` remanente de la eliminación del modal Lightbox.
-   [ ] **Estilos (CSS):**
    -   Verificar si quedan reglas `.modal-lightbox` o similares.
-   [ ] **Accesibilidad (A11y):**
    -   El logo (`.brand-container`) es clickable pero no tiene `role="button"` ni `tabIndex`.

### 🔍 2. SearchPage
-   [ ] **Código Muerto (JS/TS):**
    -   Componente `TrendingStrip` definido pero NO invocado en el JSX.
    -   Múltiples iconos importados sin uso: `checkmarkCircleOutline`, `closeOutline`, `timeOutline`, `medalOutline`, `starOutline`, `personOutline`, `imagesOutline`, `heartOutline`.
    -   Hook `useIonViewWillEnter` importado pero sin uso.
-   [ ] **Estilos (CSS):** Sin hallazgos críticos aún.

### 📚 3. LibraryPage
-   [ ] **Código Muerto (JS/TS):**
    -   Imports de `IonInfiniteScroll` y `IonInfiniteScrollContent` no utilizados.
-   [ ] **Accesibilidad (A11y):**
    -   Iconos de control (`gridOutline`, `listOutline`) necesitan mejor feedback táctil/visual.

### 👤 4. ProfilePage
-   [ ] **Código Muerto (JS/TS):**
    -   Import `alertCircleOutline` no utilizado.
-   [ ] **Modularización:**
    -   El modal de Donaciones es muy extenso, podría extraerse a `subcomponents/DonationsModal.tsx`.
-   [ ] **Accesibilidad (A11y):**
    -   `avatar-edit-overlay` y `user-uid-tag` carecen de gestión de teclado.

### 👥 5. SocialPage
-   [ ] **Código Muerto (JS/TS):**
    -   Icono `peopleOutline` importado sin uso.
    -   Tipo `FriendRequest` importado sin uso (se usa `any[]`).
-   [ ] **Accesibilidad (A11y):**
    -   Banner de "Taverna Global" necesita `role="link"`.

### 💬 6. ChatPage / PrivateChatPage
-   [ ] **Código Muerto (JS/TS):**
    -   Iconos `paperPlaneOutline` y `checkmarkDoneOutline` sin uso.
-   [ ] **Estilos (CSS):**
    -   `PrivateChatPage` reutiliza el CSS de `ChatPage` mediante una ruta relativa. Se recomienda mover estilos comunes a un shared theme.

### 📖 7. ReaderPage
-   [ ] **Código Muerto (JS/TS):**
    -   Gran cantidad de iconos importados (Bloque 34-38) sin uso real en el componente.
-   [ ] **Modularización:**
    -   `renderEndSection` es candidato a componente independiente.

### 📖 8. MangaDetailsPage & AnimeDetailsPage
-   [ ] **Código Muerto (JS/TS):**
    -   Logs de depuración residuales en `prefetch` y `translationService`.
    -   Múltiples iconos importados sin uso (`informationCircleOutline`, `playSkipBackOutline`, etc.).
-   [ ] **Duplicación de Estilos (CRÍTICO):**
    -   Los estilos de `Hero` y `Banners` son ~90% idénticos.
    -   **Acción:** Crear `src/theme/CinematicHero.css`.

---

## 🛠️ Acciones en Progreso

1.  **Unificación de Temas:** Extracción de CinematicHero.
2.  **Eliminación Radical:** Borrado de imports huérfanos en lote.
3.  **Refactor A11y:** Añadiendo `role` y `onKeyDown` a elementos interactivos.

*Última actualización: 2026-04-07*
