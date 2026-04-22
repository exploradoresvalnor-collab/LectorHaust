import React from 'react';
import './PageLoadingFallback.css';

interface PageLoadingFallbackProps {
  message?: string;
}

const PageLoadingFallback: React.FC<PageLoadingFallbackProps> = ({ message = 'Cargando...' }) => {
  return (
    <div className="page-loading-fallback">
      <div className="page-loading-content">
        <div className="page-loading-spinner">
          <div className="page-spinner-ring"></div>
          <div className="page-spinner-ring"></div>
          <div className="page-spinner-ring"></div>
        </div>
        <p className="page-loading-text">{message}</p>
      </div>
    </div>
  );
};

export default PageLoadingFallback;
