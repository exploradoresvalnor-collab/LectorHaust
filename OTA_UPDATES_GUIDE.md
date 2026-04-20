# 📱 Sistema de Actualizaciones OTA (Over-The-Air Updates)

## Resumen Ejecutivo

LectorHaus ahora soporta **actualizaciones sin descargar APK nuevo**. Los usuarios instalan la app una sola vez y reciben actualizaciones automáticas descargando solo los cambios.

---

## 🏗️ Arquitectura del Sistema

```
┌─────────────────────────────────────────┐
│     LectorHaus App (Instalada en        │
│     dispositivo del usuario)            │
└──────────────────┬──────────────────────┘
                   │
                   │ Verifica cada 6 horas
                   ↓
┌─────────────────────────────────────────┐
│  API Server                             │
│  GET /api/updates/latest                │
│  (retorna info de nueva versión)        │
└──────────────────┬──────────────────────┘
                   │
                   │ Si hay update
                   ↓
┌─────────────────────────────────────────┐
│  CDN / Storage                          │
│  GET /updates/bundle/v1.2.0             │
│  (descarga .zip con assets)             │
└──────────────────┬──────────────────────┘
                   │
                   │ Descarga en background
                   ↓
┌─────────────────────────────────────────┐
│  localStorage en el dispositivo         │
│  mangaApp_pending_update                │
│  mangaApp_update_bundle                 │
└──────────────────┬──────────────────────┘
                   │
                   │ Próximo inicio de app
                   ↓
┌─────────────────────────────────────────┐
│  App se reinicia y aplica update        │
│  sin necesidad de descargar APK nuevo   │
└─────────────────────────────────────────┘
```

---

## 📦 Componentes Implementados

### 1. **updateManagerService.ts** (Lado del cliente)
- Verifica actualizaciones contra tu servidor
- Descarga bundles en background
- Almacena cambios en localStorage
- Aplica updates en el próximo reinicio

### 2. **useUpdateManager Hook** (Lado del cliente)
- React hook para gestionar estado de updates
- Control de progreso de descarga
- Manejo de errores y reintentos

### 3. **UpdateNotificationCard Component** (UI)
- Notificación flotante elegante
- Muestra cambios de la versión
- Botones para instalar/descartar
- Indica tamaño de descarga

### 4. **update-notification.css** (Estilos)
- Responsive design
- Animaciones suaves
- Respeta safe areas

---

## 🚀 Implementación Backend

### Opción A: Node.js / Express (Recomendado)

```javascript
// server.ts
import express from 'express';
import fs from 'fs';
import path from 'path';

const app = express();

// Estructura de versiones (puedes guardar en DB)
const versionData = {
  '1.1.0': {
    version: '1.1.0',
    releaseDate: '2026-04-20',
    changes: [
      'Nuevo sistema de notificaciones',
      'Mejora en carga de imágenes',
      'Corrección de bugs en ReaderPage',
      'Soporte para más fuentes de manga',
      'Tema oscuro optimizado'
    ],
    bundleUrl: 'https://cdn.lectorhaus.com/updates/bundle-1.1.0.zip',
    mandatory: false
  }
};

// Endpoint: Obtener última versión
app.get('/api/updates/latest', (req, res) => {
  const latest = Object.values(versionData).sort(
    (a, b) => compareVersions(b.version, a.version)
  )[0];

  res.json(latest);
});

// Endpoint: Obtener versión específica
app.get('/api/updates/:version', (req, res) => {
  const version = versionData[req.params.version];
  
  if (!version) {
    return res.status(404).json({ error: 'Version not found' });
  }

  res.json(version);
});

// Función para comparar versiones
function compareVersions(v1: string, v2: string): number {
  const parts1 = v1.split('.').map(Number);
  const parts2 = v2.split('.').map(Number);

  for (let i = 0; i < 3; i++) {
    const p1 = parts1[i] || 0;
    const p2 = parts2[i] || 0;
    if (p1 > p2) return 1;
    if (p1 < p2) return -1;
  }
  return 0;
}

app.listen(3000, () => {
  console.log('✅ Update server running on port 3000');
});
```

### Opción B: Firebase Cloud Functions (Alternativa)

```typescript
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

admin.initializeApp();
const db = admin.firestore();

exports.getLatestVersion = functions.https.onRequest(async (req, res) => {
  res.set('Access-Control-Allow-Origin', '*');

  try {
    const snapshot = await db
      .collection('versions')
      .orderBy('versionNumber', 'desc')
      .limit(1)
      .get();

    if (snapshot.empty) {
      return res.status(404).json({ error: 'No versions found' });
    }

    res.json(snapshot.docs[0].data());
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

exports.getVersionInfo = functions.https.onRequest(async (req, res) => {
  res.set('Access-Control-Allow-Origin', '*');

  const { version } = req.query;

  if (!version) {
    return res.status(400).json({ error: 'Version parameter required' });
  }

  try {
    const doc = await db.collection('versions').doc(version as string).get();

    if (!doc.exists) {
      return res.status(404).json({ error: 'Version not found' });
    }

    res.json(doc.data());
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

### Opción C: Python / FastAPI

```python
from fastapi import FastAPI
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from typing import List
import json

app = FastAPI()

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Base de versiones
VERSIONS_DB = {
    "1.1.0": {
        "version": "1.1.0",
        "releaseDate": "2026-04-20",
        "changes": [
            "Nuevo sistema de notificaciones",
            "Mejora en carga de imágenes",
            "Corrección de bugs"
        ],
        "bundleUrl": "https://cdn.lectorhaus.com/updates/bundle-1.1.0.zip",
        "mandatory": False
    }
}

@app.get("/api/updates/latest")
async def get_latest_version():
    """Obtiene la última versión disponible"""
    latest = sorted(
        VERSIONS_DB.values(),
        key=lambda x: tuple(map(int, x["version"].split("."))),
        reverse=True
    )[0]
    return latest

@app.get("/api/updates/{version}")
async def get_version(version: str):
    """Obtiene información de una versión específica"""
    if version not in VERSIONS_DB:
        return {"error": "Version not found"}, 404
    
    return VERSIONS_DB[version]
```

---

## 📝 Estructura de Datos en el Servidor

```json
{
  "version": "1.1.0",
  "releaseDate": "2026-04-20",
  "changes": [
    "Nuevo sistema de notificaciones",
    "Mejora en carga de imágenes",
    "Corrección de bugs en ReaderPage",
    "Soporte para más fuentes de manga",
    "Tema oscuro optimizado"
  ],
  "bundleUrl": "https://cdn.lectorhaus.com/updates/bundle-1.1.0.zip",
  "mandatory": false
}
```

---

## 📤 Cómo Preparar Updates

### Paso 1: Hacer cambios en el código

```bash
git checkout -b feature/new-update
# Hacer cambios...
git add .
git commit -m "v1.1.0: Nuevas características"
```

### Paso 2: Compilar nueva versión

```bash
npm run build
# Esto genera dist/ con los archivos compilados
```

### Paso 3: Crear bundle (ZIP)

```bash
# En Windows (PowerShell)
Compress-Archive -Path dist/* -DestinationPath updates/bundle-1.1.0.zip

# En Linux/Mac
zip -r updates/bundle-1.1.0.zip dist/*
```

### Paso 4: Subir a CDN

```bash
# Ejemplo con AWS S3
aws s3 cp updates/bundle-1.1.0.zip s3://tu-bucket/updates/

# Ejemplo con Google Cloud Storage
gsutil cp updates/bundle-1.1.0.zip gs://tu-bucket/updates/

# O simplemente subirlo a tu servidor web
scp updates/bundle-1.1.0.zip tu-servidor:/var/www/cdn/updates/
```

### Paso 5: Registrar versión en servidor

```bash
# Enviar POST a tu API
curl -X POST https://api.lectorhaus.com/api/updates/register \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "version": "1.1.0",
    "releaseDate": "2026-04-20",
    "changes": [
      "Nuevo sistema de notificaciones",
      "Mejora en carga de imágenes"
    ],
    "bundleUrl": "https://cdn.lectorhaus.com/updates/bundle-1.1.0.zip",
    "mandatory": false
  }'
```

---

## 🔧 Integración en App.tsx

```typescript
import UpdateNotificationCard from './components/UpdateNotificationCard';

export const App: React.FC = () => {
  return (
    <>
      <OfflineBanner />
      
      {/* Agregar notificación de updates */}
      <UpdateNotificationCard position="top" />
      
      <IonTabs>
        {/* ... resto del app ... */}
      </IonTabs>
    </>
  );
};
```

---

## ✅ Checklist de Configuración

- [ ] Endpoint `/api/updates/latest` configurado
- [ ] Base de datos de versiones creada
- [ ] CDN/Storage para bundles listo
- [ ] Bundle de v1.1.0 subido
- [ ] Versión registrada en servidor
- [ ] `UpdateNotificationCard` integrado en `App.tsx`
- [ ] Variable de entorno `VITE_UPDATES_ENDPOINT` configurada
- [ ] Tests en dispositivo Android real

---

## 🔒 Seguridad

### Autenticación del Servidor

```typescript
// Proteger endpoints de actualización
app.get('/api/updates/latest', (req, res) => {
  // Validar origen
  const origin = req.headers.origin;
  const allowedOrigins = [
    'https://lectorhaus.app',
    'capacitor://localhost'
  ];
  
  if (!allowedOrigins.includes(origin)) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  // ... resto del código ...
});
```

### Validar Integridad de Bundle

```typescript
// Agregar checksum SHA256
import crypto from 'crypto';

const fileBuffer = fs.readFileSync('bundle-1.1.0.zip');
const sha256 = crypto.createHash('sha256').update(fileBuffer).digest('hex');

const versionData = {
  version: '1.1.0',
  bundleUrl: '...',
  bundleChecksum: sha256, // Incluir en respuesta
  // ...
};

// En cliente, validar checksum
const downloadedChecksum = sha256(downloadedFile);
if (downloadedChecksum !== expectedChecksum) {
  throw new Error('Bundle integrity check failed');
}
```

---

## 📊 Monitoreo

### Endpoints útiles para monitoreo

```typescript
// Obtener estadísticas de updates
app.get('/api/updates/stats', async (req, res) => {
  const stats = {
    latestVersion: '1.1.0',
    downloadsLastWeek: 1250,
    usersOnLatest: 89.5, // porcentaje
    failureRate: 0.2, // porcentaje
    averageDownloadTime: 45 // segundos
  };
  res.json(stats);
});
```

---

## 🐛 Troubleshooting

### El app no muestra notificación de update

1. Verificar que el endpoint esté disponible:
   ```bash
   curl https://api.lectorhaus.com/api/updates/latest
   ```

2. Limpiar localStorage:
   ```javascript
   localStorage.removeItem('mangaApp_version_config');
   ```

3. Revisar logs en consola del navegador

### La descarga es muy lenta

1. Comprimir mejor el bundle:
   ```bash
   zip -9 -r bundle.zip dist/
   ```

2. Usar CDN con edge locations
3. Implementar descarga parcial (delta updates)

### Bundle no se aplica

1. Verificar que haya espacio en storage
2. Revisar permisos de escritura en localStorage
3. Probar en navegador: `localStorage.setItem('test', 'data')`

---

## 🚀 Próximos Pasos

1. **Delta Updates**: Solo descargar archivos cambiados
2. **Rollback**: Sistema para volver a versión anterior si falla
3. **Analytics**: Tracking de adopción de versiones
4. **Rate Limiting**: Controlar ancho de banda de descargas
5. **A/B Testing**: Servir versiones diferentes a usuarios

---

## 📚 Referencias

- [Capacitor App Update Plugin](https://capacitorjs.com/docs/plugins/app-update)
- [Firebase Remote Config](https://firebase.google.com/docs/remote-config)
- [CodePush Microsoft](https://microsoft.github.io/code-push/)
- [Electron App Updates](https://www.electronjs.org/docs/latest/api/app-updater)

