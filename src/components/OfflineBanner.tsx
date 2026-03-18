import React, { useState, useEffect } from 'react';
import { IonIcon, IonButton } from '@ionic/react';
import { alertCircleOutline, cloudDownloadOutline, chevronForwardOutline } from 'ionicons/icons';
import { networkService } from '../services/networkService';
import { useIonRouter } from '@ionic/react';
import './OfflineBanner.css';

const OfflineBanner: React.FC = () => {
  const [isConnected, setIsConnected] = useState(true);
  const router = useIonRouter();

  useEffect(() => {
    const unsubscribe = networkService.subscribe(status => {
      setIsConnected(status.connected);
    });
    return () => unsubscribe();
  }, []);

  if (isConnected) return null;

  return (
    <div className="offline-banner-container animate-slide-down">
      <div className="offline-banner-content">
        <div className="offline-info">
          <IonIcon icon={alertCircleOutline} className="offline-icon" />
          <div className="offline-text">
            <h4>Sin conexión</h4>
            <p>Estás en modo offline</p>
          </div>
        </div>
        
        <IonButton 
          fill="solid" 
          size="small" 
          className="go-to-downloads-btn"
          onClick={() => router.push('/library')}
        >
          <IonIcon icon={cloudDownloadOutline} slot="start" />
          BIBLIOTECA
          <IonIcon icon={chevronForwardOutline} slot="end" />
        </IonButton>
      </div>
    </div>
  );
};

export default OfflineBanner;
