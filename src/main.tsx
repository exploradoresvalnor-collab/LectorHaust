import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

// Detector de errores de Vite (Limpia la caché si hay actualización)
window.addEventListener('vite:preloadError', (event) => {
  console.warn('[LectorHaus] Nueva versión detectada. Recargando...');
  event.preventDefault();
  window.location.reload();
});

// Atrapa errores de import dinámico de Ionic (ion-router-outlet usa import() directamente)
window.addEventListener('unhandledrejection', (event) => {
  if (event.reason?.message?.includes('dynamically imported module') ||
      event.reason?.message?.includes('Failed to fetch')) {
    console.warn('[LectorHaus] Chunk desactualizado detectado. Recargando...');
    event.preventDefault();
    window.location.reload();
  }
});

const container = document.getElementById('root');
const root = createRoot(container!);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);