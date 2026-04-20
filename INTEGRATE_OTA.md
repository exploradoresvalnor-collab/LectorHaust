# 🔧 INTEGRACIÓN FINAL - UpdateNotificationCard en App.tsx

## ¿Qué Necesitas Hacer?

Solo **1 línea de código** (import) y **1 línea en JSX**.

---

## 📝 Paso a Paso

### Abre: `src/App.tsx`

Busca estas líneas (cerca del final del archivo, líneas ~30-40):

```typescript
import { useState, useEffect, useRef } from 'react';
import { useLibraryStore } from './store/useLibraryStore';
import { checkUpdatesForLibrary, MangaUpdate } from './services/updateService';
import { hapticsService } from './services/hapticsService';
import { db } from './services/firebase';
// ... más imports
```

### Agrega este import (después de los otros):

```typescript
import UpdateNotificationCard from './components/UpdateNotificationCard';
```

**Así quedaría:**

```typescript
import { useState, useEffect, useRef } from 'react';
import { useLibraryStore } from './store/useLibraryStore';
import { checkUpdatesForLibrary, MangaUpdate } from './services/updateService';
import { hapticsService } from './services/hapticsService';
import { db } from './services/firebase';
import UpdateNotificationCard from './components/UpdateNotificationCard';  // ← AGREGAR ESTA LÍNEA
// ... resto de imports
```

---

### Busca el return del componente

Está cerca del final del archivo (búsca `return (` o `<IonPage`):

```typescript
export const App: React.FC = () => {
  // ... código del componente ...

  return (
    <>
      <OfflineBanner />
      <IonTabs>
        {/* ... */}
      </IonTabs>
    </>
  );
};
```

### Agrega el componente (después de OfflineBanner)

```typescript
return (
  <>
    <OfflineBanner />
    
    <UpdateNotificationCard position="top" />  {/* ← AGREGAR ESTA LÍNEA */}
    
    <IonTabs>
      {/* ... resto del código ... */}
    </IonTabs>
  </>
);
```

---

## ✅ Completo!

Eso es todo. Ya está integrado.

Ahora:

1. **Compila**: `npm run build` (verifica 0 errores)
2. **Prueba en navegador**: Abre DevTools → Storage → localStorage
3. **Verás**: Clave `mangaApp_version_config` creada

---

## 🧪 Para Testar

### Opción 1: Simular Update (Dev)

En DevTools Console:

```javascript
localStorage.setItem('mangaApp_pending_update', 'true');
localStorage.setItem('mangaApp_version_config', JSON.stringify({
  appVersion: '1.1.0',
  lastCheck: Date.now(),
  updateInProgress: false
}));

// Recarga la página
location.reload();
```

Deberías ver la notificación.

### Opción 2: Esperar 6 horas

El hook `useUpdateManager` hace auto-check cada 6 horas. Solo espera.

---

## 🎨 Customizar (Opcional)

### Cambiar posición de notificación

```typescript
// ANTES:
<UpdateNotificationCard position="top" />

// OPCIONES:
<UpdateNotificationCard position="top" />    {/* Arriba */}
<UpdateNotificationCard position="bottom" /> {/* Abajo (sobre tab bar) */}
```

### Cambiar mensajes

Abre `src/components/UpdateNotificationCard.tsx` y busca:

```typescript
const isMandatory = state.updateStatus?.mandatory || false;

return (
  <>
    {/* Cambiar estos textos: */}
    {isMandatory ? '⚠️ Actualización Requerida' : '✨ Nueva Versión Disponible'}
    {/* ... */}
```

---

## 🔍 Verificar que Funciona

### En Navegador (DevTools)

1. **F12** → Application → Storage → localStorage
2. Deberías ver claves que comienzan con `mangaApp_`
3. Si hay updates, verás `mangaApp_version_config`

### En Consola

```javascript
// Ver estado de updates
Object.keys(localStorage).filter(k => k.includes('mangaApp'))

// Ver config actual
JSON.parse(localStorage.getItem('mangaApp_version_config'))
```

---

## ⚡ Resumen

```
1 línea de código agregada     → import UpdateNotificationCard
1 línea en JSX agregada        → <UpdateNotificationCard />
0 cambios en otros archivos    → Totalmente independiente
0 dependencias nuevas          → Usa lo que ya tienes
✅ Listo                        → npm run build
```

---

## 🚀 Próximo Paso

Una vez integrado y testeado localmente:

1. Compila APK: sigue `EXPORT_APK_GUIDE.md`
2. Setup OTA (opcional): sigue `QUICK_START_OTA.md`
3. Distribuye y disfruta 🎉

---

**¿Listo? Abre `src/App.tsx` y agrega las 2 líneas** ✅

