import React, { useState, useEffect, useRef } from 'react';
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
}

/**
 * SmartImage Component (Enterprise/Webtoon Grade)
 * - Detects browser cache via imgRef.complete (Instant load)
 * - Optimized for LCP: Skips fade-in for 'eager' images
 * - Handles auto-timeout and error placeholders
 */
const SmartImage: React.FC<SmartImageProps> = ({ 
  src, 
  alt, 
  className = '', 
  wrapperClassName = '',
  onClick,
  timeout = 8000,
  placeholder = 'https://placehold.co/512x768/222222/cccccc?text=Tiempo+Agotado',
  children,
  width,
  height,
  loading = 'lazy',
  fetchPriority = 'auto'
}) => {
  const [status, setStatus] = useState<'loading' | 'loaded' | 'error'>('loading');
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    // 1. CACHE SALVATION: If image is already in browser cache, it marks as 'complete' immediately.
    // We skip the loading state to avoid skeleton flickering on fast navigations.
    if (imgRef.current && imgRef.current.complete && imgRef.current.naturalWidth > 0) {
      setStatus('loaded');
      return;
    }

    // 2. Start loading for new src
    setStatus('loading');

    // 3. 8s Kill Switch to prevent infinite skeleton
    const timer = setTimeout(() => {
      setStatus((prev) => prev === 'loading' ? 'error' : prev);
    }, timeout);

    return () => clearTimeout(timer);
  }, [src, timeout]);

  const handleLoad = () => setStatus('loaded');
  const handleError = () => setStatus('error');

  const finalSrc = status === 'error' ? placeholder : src;
  
  // Critical for LCP: If eager, bypass the smooth-image opacity transitions and expensive shimmer skeletons to paint ASAP.
  const isCritical = loading === 'eager';

  return (
    <div 
      className={`smart-image-wrapper ${status === 'loading' && !isCritical ? 'image-skeleton-wrapper' : ''} ${wrapperClassName}`} 
      onClick={onClick}
      style={{ backgroundColor: isCritical && status === 'loading' ? '#121212' : 'transparent' }}
    >
      <img
        ref={imgRef}
        src={finalSrc}
        alt={alt}
        className={`smart-img ${isCritical ? '' : 'smooth-image'} ${className} ${status !== 'loading' || isCritical ? 'img-loaded' : ''}`}
        loading={loading}
        decoding={isCritical ? "sync" : "async"}
        onLoad={handleLoad}
        onError={handleError}
        width={width}
        height={height}
        // @ts-ignore
        fetchPriority={fetchPriority}
      />
      {children}
    </div>
  );
};

export default SmartImage;
