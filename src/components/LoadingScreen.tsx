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
      <div className="glass-loading-card">
        <div className="logo-spinner-container">
          <div className="loading-orbit"></div>
          <img src="/logolh.webp" alt="Lector Haus" className="loading-logo-img" />
        </div>
        
        <div className="loading-text-container">
          <h2 className="loading-phrase">{currentPhrase}</h2>
          <div className="mini-progress-bar">
            <div className="progress-glow"></div>
          </div>
          <span className="brand-subtext">LECTOR HAUS</span>
        </div>
      </div>
    </div>
  );
};

export default LoadingScreen;
