import React, { createContext, useContext, useState, useCallback, ReactNode, useRef, useEffect } from 'react';

interface GlobalLoadingContextType {
  isLoading: boolean;
  setIsLoading: (loading: boolean, id?: string) => void;
  message?: string;
  setMessage: (message?: string) => void;
}

const GlobalLoadingContext = createContext<GlobalLoadingContextType | undefined>(undefined);

export const GlobalLoadingProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [activeLoaders, setActiveLoaders] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState<string | undefined>();
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const setIsLoading = useCallback((loading: boolean, id: string = 'default') => {
    setActiveLoaders(prev => {
      const next = new Set(prev);
      if (loading) {
        next.add(id);
      } else {
        next.delete(id);
      }
      
      // Auto-cleanup timeout if nothing is loading
      if (next.size === 0 && timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      
      return next;
    });

    if (loading) {
      // Safety: No loader should last more than 15s
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        setActiveLoaders(new Set());
        console.warn('[GlobalLoading] Safety timeout triggered - Force clearing loader');
      }, 15000);
    }
  }, []);

  const setMessageCallback = useCallback((msg?: string) => {
    setMessage(msg);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  return (
    <GlobalLoadingContext.Provider
      value={{
        isLoading: activeLoaders.size > 0,
        setIsLoading,
        message,
        setMessage: setMessageCallback
      }}
    >
      {children}
    </GlobalLoadingContext.Provider>
  );
};

export const useGlobalLoading = (): GlobalLoadingContextType => {
  const context = useContext(GlobalLoadingContext);
  if (context === undefined) {
    throw new Error('useGlobalLoading must be used within GlobalLoadingProvider');
  }
  return context;
};

