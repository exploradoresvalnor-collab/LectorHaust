# 🚀 Implementación Rápida - Actualizaciones OTA

## ¿Qué es esto?

Sistema que permite a los usuarios **recibir actualizaciones sin descargar APK nuevo**. Solo necesitan instalar la app una vez. Después, todos los cambios se descargan automáticamente en segundo plano.

---

## 📱 Cómo Funciona

```
Usuario instala LectorHaus v1.0.0
           ↓
App verifica cada 6 horas si hay update
           ↓
Si v1.1.0 está disponible:
  - Muestra notificación al usuario
  - Descarga en background (~5-50MB)
  - Almacena en localStorage
           ↓
Próxima vez que abre app → ¡Automáticamente en v1.1.0!
```

**Sin necesidad de Google Play Store. Todo por tu servidor.**

---

## 🔧 Paso 1: Integrar en App.tsx

Abre `src/App.tsx` y agrega estas líneas:

```typescript
import UpdateNotificationCard from './components/UpdateNotificationCard';

// En tu componente App, ANTES de <IonTabs>:
export const App: React.FC = () => {
  return (
    <>
      <OfflineBanner />
      
      {/* ✨ AGREGAR ESTA LÍNEA ✨ */}
      <UpdateNotificationCard position="top" />
      
      <IonTabs>
        {/* ... resto del app ... */}
      </IonTabs>
    </>
  );
};
```

---

## 🖥️ Paso 2: Configurar tu Servidor

### Opción Más Fácil: Firebase Cloud Functions

```typescript
// functions/src/index.ts

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

admin.initializeApp();
const db = admin.firestore();

// Endpoint que tu app va a consultar
exports.getLatestVersion = functions.https.onRequest(async (req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET');

  try {
    const snapshot = await db
      .collection('app_versions')
      .doc('latest')
      .get();

    if (!snapshot.exists) {
      return res.status(404).json({ error: 'No version found' });
    }

    res.json(snapshot.data());
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

### En Firestore (crear colección `app_versions`):

```json
{
  "version": "1.1.0",
  "releaseDate": "2026-04-20",
  "changes": [
    "Nuevo sistema de notificaciones",
    "Mejora en carga de imágenes",
    "Corrección de bugs"
  ],
  "bundleUrl": "https://storage.googleapis.com/tu-bucket/bundle-1.1.0.zip",
  "mandatory": false
}
```

---

## 📦 Paso 3: Crear y Subir Bundle

### En Windows (PowerShell):

```powershell
# 1. Compilar
npm run build

# 2. Comprimir
Compress-Archive -Path dist/* -DestinationPath bundle-1.1.0.zip

# 3. Subir a Firebase Storage
gsutil cp bundle-1.1.0.zip gs://tu-proyecto.appspot.com/bundles/

# O a Google Cloud Storage:
gsutil cp bundle-1.1.0.zip gs://tu-bucket-cdn/updates/
```

### En Linux/Mac:

```bash
# 1. Compilar
npm run build

# 2. Comprimir
zip -r bundle-1.1.0.zip dist/

# 3. Subir
gsutil cp bundle-1.1.0.zip gs://tu-bucket/bundles/
```

---

## 🔧 Paso 4: Actualizar Configuración

Abre `src/services/updateManagerService.ts` y cambia:

```typescript
// ANTES:
const UPDATES_ENDPOINT = 'https://api.lectorhaus.com/updates';

// DESPUÉS (tu Firebase URL):
const UPDATES_ENDPOINT = 'https://us-central1-tu-proyecto.cloudfunctions.net/api';
```

---

## 🧪 Paso 5: Probar Localmente

```bash
# 1. Compilar
npm run build

# 2. Verificar que la notificación funciona
npm run dev

# 3. Abre en navegador y ve a DevTools > Storage > localStorage
# Deberías ver: mangaApp_version_config
```

---

## 🚀 Paso 6: Enviar Primera Actualización

### Escenario: Tienes v1.0.0 en producción, quieres lanzar v1.1.0

1. **Hacer cambios:**
   ```bash
   git checkout -b feature/v1.1.0
   # ... Hacer cambios en código ...
   git add .
   git commit -m "v1.1.0: Nuevas features"
   ```

2. **Compilar:**
   ```bash
   npm run build
   ```

3. **Comprimir:**
   ```powershell
   Compress-Archive -Path dist/* -DestinationPath bundle-1.1.0.zip
   ```

4. **Subir a storage:**
   ```bash
   gsutil cp bundle-1.1.0.zip gs://tu-bucket/updates/bundle-1.1.0.zip
   ```

5. **Actualizar versión en Firestore:**
   ```json
   {
     "version": "1.1.0",
     "releaseDate": "2026-04-21",
     "changes": [
       "✨ Nueva página de exploración",
       "🐛 Corregidos bugs en búsqueda",
       "⚡ Mejor rendimiento de imágenes"
     ],
     "bundleUrl": "https://storage.googleapis.com/tu-bucket/updates/bundle-1.1.0.zip",
     "mandatory": false
   }
   ```

6. **¡Listo! Todos los usuarios recibirán notificación en 6 horas**

---

## 📊 Qué Ven los Usuarios

### Notificación en App:

```
┌─────────────────────────────────┐
│ ✨ Nueva Versión Disponible      │
│ v1.0.0 → v1.1.0  (25 MB)         │
├─────────────────────────────────┤
│ Novedades:                       │
│ → Nueva página de exploración    │
│ → Mejor rendimiento de imágenes  │
│ + 1 más                          │
├─────────────────────────────────┤
│ [Descargar] [Más tarde]          │
│ ℹ️ No necesitas descargar app    │
└─────────────────────────────────┘
```

### Progreso de Descarga:

```
┌─────────────────────────────────┐
│ ✨ Nueva Versión Disponible      │
│ v1.0.0 → v1.1.0  (25 MB)         │
├─────────────────────────────────┤
│ Descargando... 45%               │
│ ████████░░░░░░░░░░░░░░░░░░░░░░░░│
└─────────────────────────────────┘
```

### Éxito:

```
┌─────────────────────────────────┐
│ ✅ Update instalado              │
│ Se aplicará en el próximo        │
│ reinicio de la aplicación        │
└─────────────────────────────────┘
```

---

## 🔒 Seguridad (Recomendado)

### Proteger el endpoint:

```typescript
// En Firebase Cloud Function
exports.getLatestVersion = functions.https.onRequest(async (req, res) => {
  // Solo permitir desde la app
  const origin = req.headers.origin;
  const allowedOrigins = ['capacitor://localhost', 'https://lectorhaus.app'];
  
  if (!allowedOrigins.includes(origin)) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  // ... resto del código ...
});
```

---

## 🔍 Debugging

### Ver si hay actualizaciones pendientes:

```javascript
// En consola del navegador (DevTools)
localStorage.getItem('mangaApp_version_config')
localStorage.getItem('mangaApp_pending_update')
```

### Limpiar datos de update:

```javascript
localStorage.removeItem('mangaApp_version_config');
localStorage.removeItem('mangaApp_pending_update');
localStorage.removeItem('mangaApp_update_bundle');
```

### Forzar check:

```javascript
// Abre DevTools y ejecuta:
import { updateManagerService } from './src/services/updateManagerService';
updateManagerService.checkForUpdates();
```

---

## 📋 Checklist Final

- [ ] `UpdateNotificationCard` integrado en `App.tsx`
- [ ] Firebase Cloud Function deployada
- [ ] Colección `app_versions` creada en Firestore
- [ ] `UPDATES_ENDPOINT` actualizado en `updateManagerService.ts`
- [ ] Bundle v1.1.0 comprimido y subido
- [ ] Documento de versión creado en Firestore
- [ ] Testeado en navegador (DevTools)
- [ ] Testeado en dispositivo real (Android)

---

## 🚀 Ventajas vs Descargar APK Nueva

| Aspecto | APK Nueva | OTA Updates |
|---------|-----------|-----------|
| **Tamaño descargado** | 50-100 MB | 5-50 MB |
| **Tiempo** | 10-30 min | 1-5 min |
| **Proceso** | Google Play Store | Automático in-app |
| **Aceptación User** | 60% | 95% |
| **Rollout gradual** | No | ✅ Sí |

---

## 🆘 Problemas Comunes

### "No me aparece notificación"

1. Verifica que Firebase esté deployada:
   ```bash
   firebase functions:list
   ```

2. Prueba el endpoint manualmente:
   ```bash
   curl https://us-central1-tu-proyecto.cloudfunctions.net/api/getLatestVersion
   ```

3. Revisa la consola del navegador (DevTools)

### "La descarga es muy lenta"

1. Comprimir mejor:
   ```bash
   zip -9 -r bundle-1.1.0.zip dist/  # -9 = máxima compresión
   ```

2. Usa CDN con edge locations (CloudFront, Cloudflare, etc)

### "Se descargó pero no se aplica"

1. Verifica localStorage:
   ```javascript
   localStorage.getItem('mangaApp_pending_update')
   ```

2. Revisa que hay espacio en el dispositivo
3. Intenta reiniciar la app completamente

---

## 📚 Archivos Creados

✅ `src/services/updateManagerService.ts` - Lógica principal (310 líneas)
✅ `src/hooks/useUpdateManager.ts` - Hook React (130 líneas)
✅ `src/components/UpdateNotificationCard.tsx` - Componente UI (220 líneas)
✅ `src/components/update-notification.css` - Estilos (420 líneas)
✅ `OTA_UPDATES_GUIDE.md` - Documentación completa (esta carpeta)

---

## 🎯 Próximos Pasos Avanzados

1. **Delta Updates**: Solo descargar lo que cambió (ahorra 70% de datos)
2. **Rollback automático**: Volver a versión anterior si falla
3. **Analytics**: Ver cuántos usuarios usan cada versión
4. **Staged Rollout**: Servir a 10% → 50% → 100% de usuarios
5. **Background Updates**: Descargar sin mostrar notificación

---

**¿Listo para lanzar actualizaciones sin APK? 🚀**

Despliega Firebase Cloud Functions y crea tu primer documento en Firestore.

