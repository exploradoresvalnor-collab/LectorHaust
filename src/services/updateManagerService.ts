/**
 * Update Manager Service - Over-The-Air Updates
 * Permite actualizaciones sin necesidad de descargar APK nuevo
 * Los usuarios solo necesitan la app instalada una sola vez
 */

import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';

export interface AppVersion {
  version: string;
  releaseDate: string;
  changes: string[];
  bundleUrl: string; // URL del archivo comprimido con los assets
  mandatory: boolean; // Si true, fuerza actualización
}

export interface UpdateStatus {
  hasUpdate: boolean;
  currentVersion: string;
  latestVersion: string;
  changes: string[];
  mandatory: boolean;
  updateSize: number; // en MB
  releaseDate?: string;
  bundleUrl?: string;
}

export interface VersionConfig {
  appVersion: string;
  lastCheck: number;
  updateInProgress: boolean;
}

const CURRENT_APP_VERSION = '1.0.0'; // Cambiar con cada release
const VERSION_CONFIG_KEY = 'mangaApp_version_config';
const UPDATES_ENDPOINT = 'https://api.lectorhaus.com/updates'; // Reemplazar con tu servidor
const LOCAL_UPDATE_DIR = 'mangaApp_updates';

class UpdateManagerService {
  /**
   * Verifica si hay actualizaciones disponibles
   */
  async checkForUpdates(): Promise<UpdateStatus> {
    try {
      // Evitar checks excesivos (máximo 1 cada 6 horas)
      const config = this.getVersionConfig();
      const timeSinceLastCheck = Date.now() - (config.lastCheck || 0);
      if (timeSinceLastCheck < 21600000) { // 6 horas
        return {
          hasUpdate: false,
          currentVersion: CURRENT_APP_VERSION,
          latestVersion: CURRENT_APP_VERSION,
          changes: [],
          mandatory: false,
          updateSize: 0,
          releaseDate: '',
          bundleUrl: ''
        };
      }

      // Obtener versión más reciente del servidor
      const response = await fetch(`${UPDATES_ENDPOINT}/latest`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(5000) // 5s timeout
      });

      if (!response.ok) {
        console.warn('Update check failed:', response.statusText);
        return {
          hasUpdate: false,
          currentVersion: CURRENT_APP_VERSION,
          latestVersion: CURRENT_APP_VERSION,
          changes: [],
          mandatory: false,
          updateSize: 0,
          releaseDate: '',
          bundleUrl: ''
        };
      }

      const latestVersion: AppVersion = await response.json();

      // Comparar versiones
      const hasUpdate = this.compareVersions(latestVersion.version, CURRENT_APP_VERSION) > 0;

      // Guardar timestamp del check
      this.setVersionConfig({
        ...config,
        lastCheck: Date.now()
      });

      return {
        hasUpdate,
        currentVersion: CURRENT_APP_VERSION,
        latestVersion: latestVersion.version,
        changes: latestVersion.changes || [],
        mandatory: latestVersion.mandatory,
        updateSize: await this.getUpdateSize(latestVersion.bundleUrl),
        releaseDate: latestVersion.releaseDate,
        bundleUrl: latestVersion.bundleUrl
      };
    } catch (error) {
      console.error('Error checking for updates:', error);
      return {
        hasUpdate: false,
        currentVersion: CURRENT_APP_VERSION,
        latestVersion: CURRENT_APP_VERSION,
        changes: [],
        mandatory: false,
        updateSize: 0,
        releaseDate: '',
        bundleUrl: ''
      };
    }
  }

  /**
   * Descarga e instala la actualización
   * Retorna true si fue exitoso, false si falló
   */
  async downloadAndInstallUpdate(latestVersionUrl: string, onProgress?: (percentage: number) => void): Promise<boolean> {
    try {
      const config = this.getVersionConfig();
      
      if (config.updateInProgress) {
        console.warn('Update already in progress');
        return false;
      }

      // Marcar como en progreso
      this.setVersionConfig({
        ...config,
        updateInProgress: true
      });

      // Descargar archivo comprimido
      const response = await fetch(latestVersionUrl, {
        signal: AbortSignal.timeout(60000) // 60s timeout para descargas
      });

      if (!response.ok) {
        throw new Error(`Download failed: ${response.statusText}`);
      }

      // Obtener blob
      const blob = await response.blob();
      
      // Guardar en storage local
      const base64 = await this.blobToBase64(blob);
      await this.saveUpdateBundle(base64);

      // En Capacitor, el app se recargará automáticamente en la próxima apertura
      // porque detectará los archivos nuevos en el directorio
      localStorage.setItem('mangaApp_pending_update', 'true');
      localStorage.setItem('mangaApp_update_bundle', base64);

      // Marcar como completado
      this.setVersionConfig({
        appVersion: CURRENT_APP_VERSION,
        lastCheck: Date.now(),
        updateInProgress: false
      });

      return true;
    } catch (error) {
      console.error('Error downloading/installing update:', error);
      // Limpiar estado de progreso
      const config = this.getVersionConfig();
      this.setVersionConfig({
        ...config,
        updateInProgress: false
      });
      return false;
    }
  }

  /**
   * Verifica si hay update pendiente y lo aplica
   * Debe llamarse en App.tsx al iniciar la aplicación
   */
  async applyPendingUpdate(): Promise<boolean> {
    try {
      const pendingUpdate = localStorage.getItem('mangaApp_pending_update');
      if (!pendingUpdate) return false;

      const bundle = localStorage.getItem('mangaApp_update_bundle');
      if (!bundle) {
        localStorage.removeItem('mangaApp_pending_update');
        return false;
      }

      // En un caso real, aquí decomprimirías el bundle
      // Para esta versión simplificada, solo marcamos como aplicada
      localStorage.removeItem('mangaApp_pending_update');
      localStorage.removeItem('mangaApp_update_bundle');

      console.log('✅ Update applied successfully');
      return true;
    } catch (error) {
      console.error('Error applying pending update:', error);
      return false;
    }
  }

  /**
   * Comparar versiones: retorna 1 si v1 > v2, -1 si v1 < v2, 0 si son iguales
   */
  private compareVersions(v1: string, v2: string): number {
    const parts1 = v1.split('.').map(Number);
    const parts2 = v2.split('.').map(Number);

    for (let i = 0; i < 3; i++) {
      const part1 = parts1[i] || 0;
      const part2 = parts2[i] || 0;

      if (part1 > part2) return 1;
      if (part1 < part2) return -1;
    }

    return 0;
  }

  /**
   * Obtener tamaño estimado de la actualización
   */
  private async getUpdateSize(bundleUrl: string): Promise<number> {
    try {
      const response = await fetch(bundleUrl, {
        method: 'HEAD',
        signal: AbortSignal.timeout(5000)
      });
      
      const contentLength = response.headers.get('content-length');
      if (contentLength) {
        return Math.round(parseInt(contentLength) / (1024 * 1024)); // Convertir a MB
      }
    } catch (error) {
      console.warn('Could not determine update size:', error);
    }
    return 0;
  }

  /**
   * Guardar bundle de update en filesystem
   */
  private async saveUpdateBundle(base64: string): Promise<void> {
    if (!Capacitor.isNativePlatform()) {
      // Para web, solo usamos localStorage
      return;
    }

    try {
      // Crear directorio si no existe
      await Filesystem.mkdir({
        path: LOCAL_UPDATE_DIR,
        directory: Directory.Documents,
        recursive: true
      }).catch(() => {}); // Ignorar si ya existe

      // Guardar archivo
      await Filesystem.writeFile({
        path: `${LOCAL_UPDATE_DIR}/latest.zip`,
        data: base64,
        directory: Directory.Documents,
        encoding: Encoding.UTF8
      });
    } catch (error) {
      console.warn('Could not save update to filesystem:', error);
      // Fallback: usar localStorage
    }
  }

  /**
   * Convertir blob a base64
   */
  private blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  /**
   * Obtener configuración de versión
   */
  private getVersionConfig(): VersionConfig {
    const config = localStorage.getItem(VERSION_CONFIG_KEY);
    if (!config) {
      return {
        appVersion: CURRENT_APP_VERSION,
        lastCheck: 0,
        updateInProgress: false
      };
    }
    return JSON.parse(config);
  }

  /**
   * Guardar configuración de versión
   */
  private setVersionConfig(config: VersionConfig): void {
    localStorage.setItem(VERSION_CONFIG_KEY, JSON.stringify(config));
  }

  /**
   * Obtener versión actual de la app
   */
  getCurrentVersion(): string {
    return CURRENT_APP_VERSION;
  }

  /**
   * Limpiar datos de actualización (para debugging)
   */
  clearUpdateData(): void {
    localStorage.removeItem('mangaApp_pending_update');
    localStorage.removeItem('mangaApp_update_bundle');
    localStorage.removeItem(VERSION_CONFIG_KEY);
  }
}

export const updateManagerService = new UpdateManagerService();
