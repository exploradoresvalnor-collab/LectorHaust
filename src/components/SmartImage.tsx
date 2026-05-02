import React, { useState, useRef, useEffect } from 'react';
import { proxifyImage } from '../utils/imageUtils';
import './SmartImage.css';

interface SmartImageProps {
  src: string;
  alt: string;
  className?: string;
  wrapperClassName?: string;
  onClick?: (e: React.MouseEvent) => void;
  timeout?: number;
  placeholder?: string;
  children?: React.ReactNode;
  width?: string | number;
  height?: string | number;
  loading?: 'lazy' | 'eager';
  fetchPriority?: 'high' | 'low' | 'auto';
  onLoad?: () => void;
}

const SmartImage: React.FC<SmartImageProps> = ({ 
  src, 
  alt, 
  className = '', 
  wrapperClassName = '',
  onClick,
  timeout = 15000,
  placeholder = 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 512 768%22%3E%3Crect fill=%22%231a1a1a%22 width=%22512%22 height=%22768%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 font-family=%22Arial%22 font-size=%2224%22 fill=%22%23555%22 text-anchor=%22middle%22 dominant-baseline=%22middle%22%3ELoading...%3C/text%3E%3C/svg%3E',
  children,
  width,
  height,
  loading = 'lazy',
  fetchPriority = 'auto',
  onLoad
}) => {
  const [status, setStatus] = useState<'loading' | 'loaded' | 'error'>('loading');
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    let isMounted = true;

    // Check if already loaded
    if (imgRef.current?.complete && imgRef.current?.naturalWidth > 0) {
      setStatus('loaded');
      if (onLoad) onLoad();
      return;
    }

    setStatus('loading');
    const timer = setTimeout(() => {
      if (isMounted) {
        setStatus(prev => prev === 'loading' ? 'error' : prev);
      }
    }, timeout);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [src, timeout]); // Removed onLoad from deps to break the loop

  const proxiedSrc = src ? proxifyImage(src) : null;
  const finalSrc = (!proxiedSrc || status === 'error') ? placeholder : proxiedSrc;
  const isCritical = loading === 'eager';

  if (!src) return <div className={`smart-image-wrapper ${wrapperClassName}`} style={{ background: '#1a1a1a', aspectRatio: '2/3' }}></div>;

  return (
    <div 
      className={`smart-image-wrapper ${status === 'loading' && !isCritical ? 'image-skeleton-shimmer' : ''} ${wrapperClassName}`}
      onClick={onClick}
    >
        <img
          ref={imgRef}
          src={finalSrc}
          alt={alt}
          className={`smart-img ${status === 'loaded' || isCritical ? 'img-visible' : 'img-hidden'} ${className}`}
          loading={loading}
          decoding={isCritical ? 'sync' : 'async'}
          onLoad={() => {
            setStatus('loaded');
            if (onLoad) onLoad();
          }}
          onError={() => setStatus('error')}
          width={width}
          height={height}
          fetchPriority={fetchPriority}
        />
      {children}
    </div>
  );
};

export default SmartImage;
