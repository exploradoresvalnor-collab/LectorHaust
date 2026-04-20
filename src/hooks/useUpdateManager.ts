/**
 * useUpdateManager Hook - Manejo de actualizaciones OTA
 * Usado en componentes para verificar e instalar actualizaciones
 */

import { useState, useCallback, useEffect } from 'react';
import { updateManagerService, UpdateStatus } from '../services/updateManagerService';

export interface UseUpdateManagerState {
  updateStatus: UpdateStatus | null;
  loading: boolean;
  downloading: boolean;
  downloadProgress: number;
  error: string | null;
}

export interface UseUpdateManagerActions {
  checkForUpdates: () => Promise<void>;
  downloadUpdate: (versionUrl: string) => Promise<void>;
  dismissUpdate: () => void;
  retryUpdate: () => Promise<void>;
}

export function useUpdateManager() {
  const [state, setState] = useState<UseUpdateManagerState>({
    updateStatus: null,
    loading: false,
    downloading: false,
    downloadProgress: 0,
    error: null
  });

  /**
   * Verificar actualizaciones
   */
  const checkForUpdates = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const status = await updateManagerService.checkForUpdates();
      setState(prev => ({
        ...prev,
        updateStatus: status,
        loading: false
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Error checking updates',
        loading: false
      }));
    }
  }, []);

  /**
   * Descargar e instalar actualización
   */
  const downloadUpdate = useCallback(async (versionUrl: string) => {
    setState(prev => ({ ...prev, downloading: true, error: null }));
    try {
      const success = await updateManagerService.downloadAndInstallUpdate(
        versionUrl,
        (progress) => {
          setState(prev => ({
            ...prev,
            downloadProgress: progress
          }));
        }
      );

      if (success) {
        setState(prev => ({
          ...prev,
          downloading: false,
          downloadProgress: 100
        }));
        // Mostrar mensaje: "Update instalado, se aplicará en el próximo reinicio"
      } else {
        setState(prev => ({
          ...prev,
          downloading: false,
          error: 'Download failed'
        }));
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        downloading: false,
        error: error instanceof Error ? error.message : 'Download error'
      }));
    }
  }, []);

  /**
   * Descartar actualización
   */
  const dismissUpdate = useCallback(() => {
    setState(prev => ({
      ...prev,
      updateStatus: null,
      error: null
    }));
  }, []);

  /**
   * Reintentar descarga
   */
  const retryUpdate = useCallback(async () => {
    if (state.updateStatus?.latestVersion) {
      // En un caso real, obtendrías la URL del servidor
      await downloadUpdate(`${state.updateStatus.latestVersion}.zip`);
    }
  }, [state.updateStatus?.latestVersion, downloadUpdate]);

  // Auto-check al montar el componente (solo una vez cada 6 horas)
  useEffect(() => {
    const checkInterval = setInterval(() => {
      checkForUpdates();
    }, 3600000); // Cada hora

    // Hacer check inicial
    checkForUpdates();

    return () => clearInterval(checkInterval);
  }, [checkForUpdates]);

  return {
    // State
    updateStatus: state.updateStatus,
    loading: state.loading,
    downloading: state.downloading,
    downloadProgress: state.downloadProgress,
    error: state.error,

    // Actions
    checkForUpdates,
    downloadUpdate,
    dismissUpdate,
    retryUpdate,

    // Helpers
    hasUpdate: state.updateStatus?.hasUpdate || false,
    isMandatory: state.updateStatus?.mandatory || false,
    currentVersion: updateManagerService.getCurrentVersion()
  };
}
