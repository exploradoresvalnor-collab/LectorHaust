import React, { useState, useEffect } from 'react';
import { IonSpinner } from '@ionic/react';
import './LoadingScreen.css';

interface LoadingScreenProps {
  message?: string;
}

const PHRASES = [
  'Preparando los pergaminos...',
  'Dibujando tu próxima aventura...',
  'Invocando personajes épicos...',
  'Traduciendo emociones...',
  'Cargando mundos fantásticos...',
  'Afilando las katanas...',
  'Buscando el siguiente capítulo...'
];

const LoadingScreen: React.FC<LoadingScreenProps> = ({ message }) => {
  const [currentPhrase, setCurrentPhrase] = useState(message || PHRASES[0]);

  useEffect(() => {
    if (message) return;
    
    const interval = setInterval(() => {
      const randomPhrase = PHRASES[Math.floor(Math.random() * PHRASES.length)];
      setCurrentPhrase(randomPhrase);
    }, 2500);

    return () => clearInterval(interval);
  }, [message]);

  return (
    <div className="pro-loading-container animate-fade-in">
      <div className="modern-loading-content">
        <div className="spinner-wrapper">
          <div className="modern-spinner"></div>
          <img src="/logolh.webp" alt="Logo" className="spinner-center-logo" />
        </div>
        
        <div className="loading-info">
          <h2 className="loading-phrase">{currentPhrase}</h2>
          <div className="loading-bar-container">
            <div className="loading-bar-progress"></div>
          </div>
          <p className="brand-tagline">LECTOR HAUS</p>
        </div>
      </div>
    </div>
  );
};

export default LoadingScreen;
