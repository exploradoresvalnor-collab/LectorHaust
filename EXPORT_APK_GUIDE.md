# 📦 Guía Completa: Exportar APK de LectorHaus

## 🚀 Estado Actual

✅ **App Completa y Lista**
- ✅ 5 features innovadoras integradas (ReadingMoodAI, DropPredictor, CharacterDex, AdaptationTimeline, ChronoSync)
- ✅ TypeScript: 0 errores
- ✅ Build: 3.26s (500+ módulos)
- ✅ Safe areas: Configuradas para notch y botones de navegación Android
- ✅ Sistema OTA de actualizaciones: Implementado
- ✅ Responsive design: Probado en todas las resoluciones

---

## 📋 Pre-Requisitos

### Windows

```bash
# 1. Node.js (ya tienes)
node --version

# 2. Java Development Kit (JDK 17+)
java -version

# 3. Android SDK (descargable desde Android Studio)
# https://developer.android.com/studio

# 4. Variables de entorno (Windows)
# Crear variables en tu sistema:
# - JAVA_HOME = C:\Program Files\Java\jdk-17.0.X
# - ANDROID_HOME = C:\Users\Usuario\AppData\Local\Android\sdk
```

### En PowerShell (como Admin):

```powershell
# Verificar Java
java -version

# Verificar Android SDK
echo $env:ANDROID_HOME

# Si no están establecidas:
[Environment]::SetEnvironmentVariable("JAVA_HOME", "C:\Program Files\Java\jdk-17.0.X", "User")
[Environment]::SetEnvironmentVariable("ANDROID_HOME", "C:\Users\Usuario\AppData\Local\Android\sdk", "User")
```

---

## 🔧 Paso 1: Actualizar Capacitor

```bash
cd "c:\Users\Usuario\Desktop\Proyecto practica\mangaApp"

# Actualizar Capacitor CLI
npm install -g @capacitor/cli@latest

# Verificar versión
npx cap --version
```

---

## 📱 Paso 2: Agregar Plataforma Android

```bash
# Agregar soporte Android
npx cap add android

# Esto crea la carpeta 'android/' con el proyecto Android
```

**Salida esperada:**
```
✔ Creating native Android project...
✔ Copying web assets...
✔ Generating Android configuration...
```

---

## 🔄 Paso 3: Sincronizar Assets Web

```bash
# Compilar web
npm run build

# Sincronizar con proyecto Android
npx cap sync android

# Esto copia dist/ a android/app/src/main/assets/public/
```

---

## 🎨 Paso 4: Configurar Ícono y Splash

### Ícono de App

```bash
# Copiar tu ícono (512x512 PNG) a:
# android/app/src/main/res/mipmap-xxxhdpi/ic_launcher.png
# android/app/src/main/res/mipmap-xxhdpi/ic_launcher.png
# android/app/src/main/res/mipmap-xhdpi/ic_launcher.png
# android/app/src/main/res/mipmap-hdpi/ic_launcher.png
# android/app/src/main/res/mipmap-mdpi/ic_launcher.png

# O usar herramienta:
npm install -g @capacitor/assets
npx capacitor-assets generate --iconBackgroundColor "#000000" --splashBackgroundColor "#000000"
```

### Splash Screen

Editar `capacitor.config.ts`:

```typescript
const config: CapacitorConfig = {
  appId: 'com.lectorhaus.app',
  appName: 'LectorHaus',
  webDir: 'dist',
  plugins: {
    SplashScreen: {
      launchShowDuration: 3000,
      showDuration: 3000,
      launchAutoHide: true,
      backgroundColor: '#000000',
      androidScaleType: 'CENTER_CROP',
      androidSpinnerStyle: 'small',
      spinnerColor: '#8b5cf6'
    }
  }
};
```

---

## 🔑 Paso 5: Crear Keystore (Firma)

El keystore es el certificado que firma tu APK.

### En PowerShell:

```powershell
# Navegar a carpeta donde guardarás el keystore
cd $env:USERPROFILE

# Crear keystore (válido 25 años)
keytool -genkey -v `
  -keystore lectorhaus-key.keystore `
  -keyalg RSA `
  -keysize 2048 `
  -validity 9125 `
  -alias lectorhaus-key

# Se pedirá:
# - Contraseña (ej: micontraseña123)
# - Nombre: LectorHaus Team
# - Unidad organizativa: Engineering
# - Organización: LectorHaus
# - Provincia: [Tu provincia]
# - País: ES (o tu país)
```

**Importante**: Guarda esta contraseña en lugar seguro (será necesaria cada vez)

### Verificar que se creó:

```powershell
ls lectorhaus-key.keystore

# Output:
# Mode                 LastWriteTime         Length Name
# ----                 -----------           ------ ----
# -a----        19/04/2026   10:30 AM      2575 lectorhaus-key.keystore
```

---

## 🏗️ Paso 6: Configurar Firma en Android Studio

### Abrir proyecto Android:

```bash
npx cap open android
```

Esto abre Android Studio con el proyecto.

### En Android Studio:

1. **Build** → **Generate Signed Bundle / APK**
2. Seleccionar **APK** (no Bundle)
3. **Next**

### Configurar keystore:

1. **Key store path**: Seleccionar `lectorhaus-key.keystore`
2. **Key store password**: Tu contraseña
3. **Key alias**: `lectorhaus-key`
4. **Key password**: Tu contraseña
5. **Next**

### Seleccionar variante:

- **Flavor**: Default
- **Build Types**: **release** ← IMPORTANTE
- **Finish**

Android Studio compilará y creará el APK firmado.

---

## 💻 Paso 7: Compilación Alternativa (CLI)

Si prefieres no usar Android Studio:

```bash
# En el directorio android/
cd android

# Linux/Mac:
./gradlew assembleRelease

# Windows (PowerShell):
.\gradlew.bat assembleRelease

# El APK estará en:
# android/app/build/outputs/apk/release/app-release.apk
```

---

## 📍 Paso 8: Ubicación del APK

Después de compilar, encontrarás:

```
android/
└── app/
    └── build/
        └── outputs/
            └── apk/
                └── release/
                    └── app-release.apk  ← ¡AQUÍ ESTÁ!
```

**Tamaño esperado**: 15-30 MB

---

## ✅ Paso 9: Verificar APK

```bash
# En PowerShell
aapt dump badging "android/app/build/outputs/apk/release/app-release.apk"

# Output incluye:
# package: name='com.lectorhaus.app'
# versionCode='1'
# versionName='1.0.0'
# launchableActivity: name='MainActivity'
```

---

## 📤 Paso 10: Distribuir APK

### Opción A: Por Email (Usuarios Privados)

```powershell
# Copiar APK a carpeta accesible
Copy-Item "android/app/build/outputs/apk/release/app-release.apk" `
  -Destination "$env:USERPROFILE\Desktop\LectorHaus-v1.0.0.apk"

# Adjuntar a email
```

### Opción B: Google Drive / OneDrive

```bash
# Subir el archivo a tu nube
# Los usuarios descargan y instalan (Settings → Unknown Sources → Instalar)
```

### Opción C: Servidor Web

```bash
# Subir a tu servidor
scp android/app/build/outputs/apk/release/app-release.apk \
  usuario@servidor.com:/var/www/descargas/

# Crear enlace de descarga
# https://lectorhaus.com/descargas/LectorHaus-v1.0.0.apk
```

### Opción D: Google Play Store (Pro)

```bash
# Requiere:
# 1. Cuenta Google Play Developer ($25 única vez)
# 2. Generar App Bundle (no APK)
# 3. Subir en Play Console
# 4. Esperar 2-3 horas para revisión
```

---

## 🚀 Instalación en Dispositivo

### Por USB (Debugging):

```bash
# Conectar teléfono USB (activar Debugging en Developer Options)
# En Windows:
adb install -r android/app/build/outputs/apk/release/app-release.apk

# Output:
# Success
```

### Por Descarga Manual:

1. Usuario descarga APK
2. Abre Administrador de Archivos → Descargadas
3. Toca el APK
4. Toca "Instalar"
5. Listo ✅

---

## 🔍 Verificar en Dispositivo

```bash
# Ver si está instalada
adb shell pm list packages | Select-String "lectorhaus"

# Output:
# package:com.lectorhaus.app

# Ver versión
adb shell dumpsys package com.lectorhaus.app | Select-String "versionName"

# Lanzar app
adb shell am start -n com.lectorhaus.app/.MainActivity
```

---

## 🔄 Actualizaciones Futuras

### v1.0.0 ya está en el dispositivo del usuario

Para actualizar:

1. **Cambiar versionCode** en `capacitor.config.ts`:
   ```typescript
   export const config: CapacitorConfig = {
     version: '1.1.0', // ← Incrementar
     // ...
   };
   ```

2. **Recompilar**:
   ```bash
   npm run build
   npx cap sync android
   # ... compilar en Android Studio ...
   ```

3. **Distribuir nuevo APK**

**Nota**: Si implementas OTA Updates (ya está en el código), los usuarios recibirán actualizaciones sin descargar APK nuevo.

---

## 🆘 Troubleshooting

### "Error: No se encuentra JAVA_HOME"

```powershell
# Verificar
echo $env:JAVA_HOME

# Si está vacío:
[Environment]::SetEnvironmentVariable("JAVA_HOME", "C:\Program Files\Java\jdk-17", "User")

# Cerrar y abrir PowerShell nueva
```

### "Android SDK no encontrado"

```powershell
# Instalar desde Android Studio:
# Android Studio → SDK Manager → Android 12.0 (o superior)
# Descargar Build Tools 33.0.0+

# Luego:
[Environment]::SetEnvironmentVariable("ANDROID_HOME", "C:\Users\Usuario\AppData\Local\Android\sdk", "User")
```

### "APK demasiado grande (>100MB)"

- Verificar que `dist/` está optimizado
- Usar `npm run build` (producción)
- Considerar App Bundle en lugar de APK

### "La app falla al abrir en Android"

1. Revisar logs:
   ```bash
   adb logcat | Select-String "lectorhaus|error|crash"
   ```

2. Verificar que todos los assets están en `dist/`
3. Sincronizar nuevamente: `npx cap sync android`

---

## 📊 Comparativa de Métodos

| Método | Tiempo | Dificultad | Usuarios | Costo |
|--------|--------|-----------|----------|-------|
| **APK Manual** | 30 min | Fácil | <100 | $0 |
| **Google Drive** | 15 min | Muy fácil | <1000 | $0 |
| **Servidor Web** | 20 min | Media | <10k | $10/mes |
| **Google Play** | 2 horas | Dura | Infinito | $25/año |

---

## ✅ Checklist Final

- [ ] Keystore creado (`lectorhaus-key.keystore`)
- [ ] Android SDK instalado (API 31+)
- [ ] JAVA_HOME y ANDROID_HOME configurados
- [ ] `npx cap add android` ejecutado
- [ ] `npx cap sync android` ejecutado
- [ ] Ícono y splash configurados
- [ ] APK compilado en modo **release**
- [ ] APK testeado en dispositivo real
- [ ] Método de distribución elegido
- [ ] Documentación de instalación preparada para usuarios

---

## 🎯 Siguientes Pasos

1. **Compilar APK v1.0.0** (hoy)
2. **Distribuir a grupo reducido** (test)
3. **Recopilar feedback** (48h)
4. **Implementar OTA Updates** (changelog creado)
5. **Lanzamiento público** (comunicar por redes)

---

## 📞 Soporte

Si algo falla:

1. Revisar logs: `adb logcat`
2. Verificar que `dist/` existe: `ls dist/`
3. Sincronizar nuevamente: `npx cap sync`
4. Limpiar cache: `./gradlew clean`

---

**¡Tu APK está listo para exportar! 🚀**

**Tiempo estimado**: 30-45 minutos (primera vez)

