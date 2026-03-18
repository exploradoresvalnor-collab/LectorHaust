import React, { useEffect, useState } from 'react';
import { IonCard, IonIcon, IonText, IonButton } from '@ionic/react';
import { globeOutline, closeOutline, checkmarkCircleOutline } from 'ionicons/icons';
import './LocalizationBanner.css';

interface LocalizationBannerProps {
  lang: string;
  onClose: () => void;
}

const LocalizationBanner: React.FC<LocalizationBannerProps> = ({ lang, onClose }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 1500);
    const hideTimer = setTimeout(() => setVisible(false), 8000);
    return () => { clearTimeout(timer); clearTimeout(hideTimer); };
  }, []);

  if (!visible && !lang.startsWith('en') && !lang.startsWith('pt')) return null;

  const getCountryInfo = () => {
    if (lang === 'en') return { name: 'USA/Global', flag: '🇺🇸', label: 'English' };
    if (lang === 'pt-br') return { name: 'Brasil', flag: '🇧🇷', label: 'Português' };
    return { name: 'España/Latam', flag: '🇪🇸', label: 'Español' };
  };

  const info = getCountryInfo();

  return (
    <div className={`loc-banner-container ${visible ? 'banner-show' : 'banner-hide'}`}>
      <IonCard className="loc-banner-card glass-effect">
        <div className="loc-banner-content">
          <div className="loc-icon-wrapper">
            <IonIcon icon={globeOutline} className="loc-icon pulse-animation" />
          </div>
          <div className="loc-text-wrapper">
            <IonText color="light">
              <h3 className="loc-title">
                {info.flag} {lang === 'es' ? '¡Bienvenido!' : 'Welcome!'}
              </h3>
            </IonText>
            <IonText color="medium">
              <p className="loc-subtitle">
                {lang === 'es' 
                  ? `Personalizando LectorHaus para ti (${info.name}).` 
                  : `Personalizing LectorHaus for you (${info.name}).`}
              </p>
            </IonText>
          </div>
          <div className="loc-actions">
            <IonButton fill="clear" onClick={() => setVisible(false)}>
              <IonIcon icon={closeOutline} slot="icon-only" />
            </IonButton>
          </div>
        </div>
        <div className="loc-progress-bar"></div>
      </IonCard>
    </div>
  );
};

export default LocalizationBanner;
