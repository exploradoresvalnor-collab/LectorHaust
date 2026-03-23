import React, { useState, useEffect } from 'react';
import './SmartImage.css';

interface SmartImageProps {
  src: string;
  alt: string;
  className?: string;
  wrapperClassName?: string;
  onClick?: (e: React.MouseEvent) => void;
  timeout?: number;
  placeholder?: string;
  children?: React.ReactNode; // For badges/overlays
}

/**
 * SmartImage Component
 * - Handles auto-timeout (8s default)
 * - Fade-in transition on load
 * - Skeleton shimmer while loading
 * - Fallback to placeholder on error or timeout
 */
const SmartImage: React.FC<SmartImageProps> = ({ 
  src, 
  alt, 
  className = '', 
  wrapperClassName = '',
  onClick,
  timeout = 8000,
  placeholder = 'https://placehold.co/512x768/222222/cccccc?text=Tiempo+Agotado',
  children
}) => {
  const [status, setStatus] = useState<'loading' | 'loaded' | 'error'>('loading');
  const statusRef = React.useRef(status);
  statusRef.current = status;

  useEffect(() => {
    // Reset status when src changes
    setStatus('loading');
    statusRef.current = 'loading';

    const timer = setTimeout(() => {
      if (statusRef.current === 'loading') {
        setStatus('error');
      }
    }, timeout);

    return () => clearTimeout(timer);
  }, [src, timeout]);

  const handleLoad = () => {
    setStatus('loaded');
  };

  const handleError = () => {
    setStatus('error');
  };

  const finalSrc = status === 'error' ? placeholder : src;

  return (
    <div className={`smart-image-wrapper ${status === 'loading' ? 'image-skeleton-wrapper' : ''} ${wrapperClassName}`} onClick={onClick}>
      <img
        src={finalSrc}
        alt={alt}
        className={`smart-img smooth-image ${className} ${status !== 'loading' ? 'img-loaded' : ''}`}
        loading="lazy"
        decoding="async"
        onLoad={handleLoad}
        onError={handleError}
      />
      {children}
    </div>
  );
};

export default SmartImage;
