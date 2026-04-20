/**
 * UpdateNotificationCard - Componente para mostrar actualizaciones disponibles
 * Se puede integrar en App.tsx o en una página específica
 */

import React, { useState } from 'react';
import {
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonButton,
  IonIcon,
  IonProgressBar,
  IonText,
  IonBadge,
  IonModal
} from '@ionic/react';
import { download, checkmarkCircle, warningOutline, reloadOutline, close } from 'ionicons/icons';
import { useUpdateManager } from '../hooks/useUpdateManager';
import './update-notification.css';

interface UpdateNotificationCardProps {
  position?: 'top' | 'bottom';
  showDetails?: boolean;
}

export const UpdateNotificationCard: React.FC<UpdateNotificationCardProps> = ({
  position = 'top',
  showDetails = false
}) => {
  const { 
    updateStatus, 
    loading, 
    downloading, 
    downloadProgress, 
    error,
    checkForUpdates,
    downloadUpdate,
    dismissUpdate,
    retryUpdate,
    isMandatory,
    currentVersion
  } = useUpdateManager();

  const [showModal, setShowModal] = useState(false);

  if (!updateStatus?.hasUpdate || loading) {
    return null;
  }

  const sizeStr = updateStatus.updateSize ? `${updateStatus.updateSize} MB` : '';
  const changesList = updateStatus.changes || [];

  return (
    <>
      {/* Tarjeta flotante compacta */}
      <div className={`update-notification update-${position} ${downloading ? 'downloading' : ''}`}>
        <IonCard className="update-card">
          <IonCardHeader className="ion-no-padding">
            <div className="update-header">
              <div className="update-icon-wrapper">
                <IonIcon 
                  icon={isMandatory ? warningOutline : download} 
                  className={`update-icon ${isMandatory ? 'mandatory' : ''}`}
                />
              </div>
              <div className="update-header-text">
                <IonCardTitle className="update-title">
                  {isMandatory ? '⚠️ Actualización Requerida' : '✨ Nueva Versión Disponible'}
                </IonCardTitle>
                <p className="update-version">
                  v{updateStatus.currentVersion} → v{updateStatus.latestVersion}
                  {sizeStr && <IonBadge className="update-size">{sizeStr}</IonBadge>}
                </p>
              </div>
              {!isMandatory && (
                <IonButton 
                  fill="clear" 
                  onClick={dismissUpdate}
                  className="update-close-btn"
                >
                  <IonIcon icon={close} />
                </IonButton>
              )}
            </div>
          </IonCardHeader>

          <IonCardContent className="ion-padding-sm">
            {/* Barra de progreso durante descarga */}
            {downloading && (
              <div className="update-progress-section">
                <IonProgressBar 
                  value={downloadProgress / 100}
                  color="primary"
                  className="update-progress-bar"
                />
                <p className="update-progress-text">
                  Descargando... {downloadProgress}%
                </p>
              </div>
            )}

            {/* Mensaje de error */}
            {error && (
              <div className="update-error-section">
                <IonText color="danger" className="update-error-text">
                  {error}
                </IonText>
              </div>
            )}

            {/* Cambios (preview) */}
            {changesList.length > 0 && !downloading && (
              <div className="update-changes">
                <p className="update-changes-title">Novedades:</p>
                <ul className="update-changes-list">
                  {changesList.slice(0, 2).map((change, idx) => (
                    <li key={idx}>{change}</li>
                  ))}
                  {changesList.length > 2 && (
                    <li className="update-see-more" onClick={() => setShowModal(true)}>
                      + {changesList.length - 2} más
                    </li>
                  )}
                </ul>
              </div>
            )}

            {/* Botones de acción */}
            <div className="update-actions">
              {!downloading && !error && (
                <IonButton 
                  expand="block"
                  color="primary"
                  onClick={() => downloadUpdate(`https://api.lectorhaus.com/updates/bundle/${updateStatus.latestVersion}`)}
                >
                  <IonIcon slot="start" icon={download} />
                  {isMandatory ? 'Instalar Ahora' : 'Descargar'}
                </IonButton>
              )}

              {error && (
                <IonButton 
                  expand="block"
                  fill="outline"
                  color="primary"
                  onClick={retryUpdate}
                >
                  <IonIcon slot="start" icon={reloadOutline} />
                  Reintentar
                </IonButton>
              )}

              {downloading && downloadProgress === 100 && (
                <div className="update-success-message">
                  <IonIcon icon={checkmarkCircle} color="success" />
                  <p>Update instalado. Se aplicará en el próximo reinicio.</p>
                </div>
              )}

              {!isMandatory && !downloading && !error && (
                <IonButton 
                  fill="clear"
                  size="small"
                  onClick={dismissUpdate}
                >
                  Más tarde
                </IonButton>
              )}

              {changesList.length > 2 && !downloading && (
                <IonButton 
                  fill="clear"
                  size="small"
                  onClick={() => setShowModal(true)}
                >
                  Ver cambios completos
                </IonButton>
              )}
            </div>

            {/* Info de instalación */}
            <p className="update-install-info">
              ℹ️ No necesitas descargar la app nuevamente. Se actualiza automáticamente.
            </p>
          </IonCardContent>
        </IonCard>
      </div>

      {/* Modal con cambios completos */}
      <IonModal 
        isOpen={showModal}
        onDidDismiss={() => setShowModal(false)}
        className="update-modal"
      >
        <div className="update-modal-header">
          <h2>Cambios en v{updateStatus.latestVersion}</h2>
          <IonButton 
            fill="clear"
            onClick={() => setShowModal(false)}
          >
            <IonIcon icon={close} />
          </IonButton>
        </div>
        <div className="update-modal-content ion-padding">
          <ul className="update-full-changes-list">
            {changesList.map((change, idx) => (
              <li key={idx}>{change}</li>
            ))}
          </ul>
          <p className="update-release-date">
            Fecha de lanzamiento: {updateStatus.releaseDate || 'Próximamente'}
          </p>
        </div>
      </IonModal>
    </>
  );
};

export default UpdateNotificationCard;
