import React, { useState, useEffect } from 'react';
import './LoadingScreen.css';

interface LoadingScreenProps {
  message?: string;
  isInitialLoad?: boolean;
}

const PHRASES = [
  'Preparando los pergaminos...',
  'Dibujando tu próxima aventura...',
  'Invocando personajes épicos...',
  'Traduciendo emociones...',
  'Cargando mundos fantásticos...',
  'Afilando las katanas...',
  'Buscando el siguiente capítulo...',
  'Sincronizando con el multiverso...',
  'Ajustando los trazos del destino...'
];

const LoadingScreen: React.FC<LoadingScreenProps> = ({ message, isInitialLoad = false }) => {
  const [currentPhrase, setCurrentPhrase] = useState(message || PHRASES[0]);
  const [dots, setDots] = useState('');

  useEffect(() => {
    if (message) {
      setCurrentPhrase(prev => prev !== message ? message : prev);
      return;
    }
    
    const phraseInterval = setInterval(() => {
      // Solo actualizar si la pestaña está activa para ahorrar recursos
      if (document.visibilityState === 'visible') {
        const randomPhrase = PHRASES[Math.floor(Math.random() * PHRASES.length)];
        setCurrentPhrase(randomPhrase);
      }
    }, 3000);

    return () => clearInterval(phraseInterval);
  }, [message]);

  useEffect(() => {
    const dotsInterval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        setDots(prev => prev.length >= 3 ? '' : prev + '.');
      }
    }, 500);
    return () => clearInterval(dotsInterval);
  }, []);


  return (
    <div className={`unified-loading-overlay ${isInitialLoad ? 'initial-load' : ''}`}>
      <div className="loading-background-effects">
        <div className="glow-orb orb-1"></div>
        <div className="glow-orb orb-2"></div>
      </div>

      <div className="loading-center-content">
        <div className="premium-logo-loader">
          <div className="outer-ring"></div>
          <div className="inner-ring"></div>
          <div className="logo-container">
            <img src="/logolh.webp" alt="Lector Haus" className="pulse-logo" />
          </div>
        </div>
        
        <div className="loading-text-container">
          <h2 className="loading-message">
            {currentPhrase}
            <span className="animated-dots">{dots}</span>
          </h2>
          <div className="progress-track">
            <div className="progress-fill"></div>
          </div>
          <p className="brand-signature">LECTOR HAUS PREMIUM</p>
        </div>
      </div>
    </div>
  );
};

export default LoadingScreen;
