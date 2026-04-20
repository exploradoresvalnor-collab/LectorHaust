import React, { useState, useEffect } from 'react';
import { LazyLoadImage } from 'react-lazy-load-image-component';
import { IonIcon } from '@ionic/react';
import { refreshOutline, warningOutline } from 'ionicons/icons';
import 'react-lazy-load-image-component/src/effects/blur.css';

import { Effect } from 'react-lazy-load-image-component';

interface ReaderImageProps {
  src: string;
  alt: string;
  className?: string;
  visibleByDefault?: boolean;
  effect?: Effect;
  wrapperClassName?: string;
  threshold?: number;
  style?: React.CSSProperties;
  maxRetries?: number;
}

export const ReaderImage: React.FC<ReaderImageProps> = ({
  src,
  alt,
  className = '',
  visibleByDefault = false,
  effect = 'blur',
  wrapperClassName = '',
  threshold = 800,
  style,
  maxRetries = 3
}) => {
  const [retryCount, setRetryCount] = useState(0);
  const [hasError, setHasError] = useState(false);
  const [currentSrc, setCurrentSrc] = useState(src);

  useEffect(() => {
    setCurrentSrc(src);
    setHasError(false);
    setRetryCount(0);
  }, [src]);

  const handleError = () => {
    if (retryCount < maxRetries) {
      setRetryCount(prev => prev + 1);
      // Append cache buster to force re-fetch
      const cacheBuster = `&retry=${retryCount + 1}&t=${Date.now()}`;
      const separator = src.includes('?') ? '' : '?';
      setCurrentSrc(`${src}${separator}${cacheBuster}`);
    } else {
      setHasError(true);
    }
  };

  const manualRetry = (e: React.MouseEvent) => {
    e.stopPropagation();
    setHasError(false);
    setRetryCount(0);
    setCurrentSrc(`${src}${src.includes('?') ? '&' : '?'}manual=${Date.now()}`);
  };

  if (hasError) {
    return (
      <div 
        className={`reader-image-error-container ${className}`} 
        style={{ ...style, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '300px', width: '100%', backgroundColor: '#1e1e1e', cursor: 'pointer' }}
        onClick={manualRetry}
      >
        <IonIcon icon={warningOutline} style={{ color: '#ffcc00', fontSize: '32px', marginBottom: '8px' }} />
        <span style={{ color: '#aaa', fontSize: '14px', marginBottom: '16px' }}>Error al cargar la imagen</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', background: 'rgba(255,255,255,0.1)', borderRadius: '20px', color: '#fff', fontSize: '14px' }}>
          <IonIcon icon={refreshOutline} />
          <span>Tocar para reintentar</span>
        </div>
      </div>
    );
  }

  return (
    <LazyLoadImage
      src={currentSrc}
      className={className}
      alt={alt}
      visibleByDefault={visibleByDefault}
      effect={effect}
      wrapperClassName={wrapperClassName}
      threshold={threshold}
      style={style}
      onError={handleError}
    />
  );
};
