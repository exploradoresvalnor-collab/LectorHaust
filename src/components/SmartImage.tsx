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
}

const SmartImage: React.FC<SmartImageProps> = ({ 
  src, 
  alt, 
  className = '', 
  wrapperClassName = '',
  onClick,
  timeout = 10000,
  placeholder = 'https://placehold.co/512x768/222222/cccccc?text=Error',
  children,
  width,
  height,
  loading = 'lazy',
  fetchPriority = 'auto'
}) => {
  const [status, setStatus] = useState<'loading' | 'loaded' | 'error'>('loading');
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    setStatus('loading');
    if (imgRef.current?.complete && imgRef.current?.naturalWidth > 0) {
      setStatus('loaded');
      return;
    }
    const timer = setTimeout(() => {
      setStatus(prev => prev === 'loading' ? 'error' : prev);
    }, timeout);
    return () => clearTimeout(timer);
  }, [src, timeout]);

  const proxiedSrc = proxifyImage(src);
  const finalSrc = (!proxiedSrc || status === 'error') ? placeholder : proxiedSrc;
  const isCritical = loading === 'eager';

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
        onLoad={() => setStatus('loaded')}
        onError={() => setStatus('error')}
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
