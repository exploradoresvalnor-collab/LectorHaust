import React from 'react';
import { useGlobalLoading } from '../contexts/GlobalLoadingContext';
import LoadingScreen from './LoadingScreen';

/**
 * Componente que muestra la pantalla de carga global
 * Se renderiza cuando isLoading es true en el contexto
 */
const GlobalLoadingOverlay: React.FC = () => {
  const { isLoading, message } = useGlobalLoading();

  if (!isLoading) return null;

  return <LoadingScreen message={message} />;
};

export default GlobalLoadingOverlay;
