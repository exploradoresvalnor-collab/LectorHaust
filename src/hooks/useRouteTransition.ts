import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useGlobalLoading } from '../contexts/GlobalLoadingContext';

/**
 * Hook que muestra un loading breve cuando el usuario navega entre rutas
 * Útil para feedback visual durante transiciones de página
 */
export const useRouteTransition = () => {
  const { setIsLoading } = useGlobalLoading();
  const location = useLocation();

  useEffect(() => {
    // Mostrar loading brevemente al cambiar de ruta
    setIsLoading(true, 'route-transition');
    const timer = setTimeout(() => setIsLoading(false, 'route-transition'), 300);

    return () => {
      clearTimeout(timer);
      setIsLoading(false, 'route-transition'); // Garantizar limpieza del contador global
    };
  }, [location.pathname, setIsLoading]);
};
