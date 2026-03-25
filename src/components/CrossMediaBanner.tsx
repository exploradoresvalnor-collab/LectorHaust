import React from 'react';
import { IonIcon, IonRippleEffect } from '@ionic/react';
import { playCircle, book, sparkles, arrowForward, closeCircle } from 'ionicons/icons';
import { useIonRouter } from '@ionic/react';
import SmartImage from './SmartImage';
import './CrossMediaBanner.css';

interface Props {
  crossMedia: {
    id: string;
    title: string;
    coverImage: {
      large: string;
      extraLarge: string;
    };
    type: 'ANIME' | 'MANGA';
    destinationUrl: string;
  };
  onClose?: () => void;
}

const CrossMediaBanner: React.FC<Props> = ({ crossMedia, onClose }) => {
  const router = useIonRouter();
  const isAnime = crossMedia.type === 'ANIME';

  return (
    <div 
      className={`cross-media-banner ${isAnime ? 'anime-theme' : 'manga-theme'} animate-fade-in-up ion-activatable`}
      onClick={() => router.push(crossMedia.destinationUrl)}
    >
      {onClose && (
        <div className="cmb-close" onClick={(e) => { e.stopPropagation(); onClose(); }}>
          <IonIcon icon={closeCircle} />
        </div>
      )}
      <IonRippleEffect />
      <div className="cmb-bg-glow"></div>
      <div className="cmb-content">
        <div className="cmb-text-section">
          <div className="cmb-badge">
            <IonIcon icon={isAnime ? playCircle : book} />
            <span>{isAnime ? '¡TIENE ANIME!' : '¡LEE EL ORIGEN!'}</span>
          </div>
          <h4 className="cmb-title">{crossMedia.title}</h4>
          <p className="cmb-desc">
            {isAnime 
              ? 'Disfruta de la adaptación animada de esta obra maestra.' 
              : 'Descubre la historia original en manga que inspiró el anime.'}
          </p>
          <div className="cmb-action">
            <span>{isAnime ? 'Ver Anime' : 'Leer Manga'}</span>
            <IonIcon icon={arrowForward} />
          </div>
        </div>
        <div className="cmb-image-section">
          <SmartImage src={crossMedia.coverImage.large} alt={crossMedia.title} className="cmb-cover" width={80} height={120} />
          <div className="cmb-image-overlay">
             <IonIcon icon={sparkles} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default CrossMediaBanner;
