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
    // Iniciamos la carga al cambiar de ruta
    setIsLoading(true);
    
    // Safety timeout: Si la página no nos avisa que terminó (vía useEffect local), 
    // cerramos el overlay a los 8s para no bloquear al usuario.
    const safetyTimer = setTimeout(() => {
      setIsLoading(false);
    }, 8000);

    return () => clearTimeout(safetyTimer);
  }, [location.pathname, setIsLoading]);
};
