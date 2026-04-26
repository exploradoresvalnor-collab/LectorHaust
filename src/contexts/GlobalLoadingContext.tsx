import React, { createContext, useContext, useState, useCallback, ReactNode, useRef, useEffect } from 'react';

interface GlobalLoadingContextType {
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  message?: string;
  setMessage: (message?: string) => void;
}

const GlobalLoadingContext = createContext<GlobalLoadingContextType | undefined>(undefined);

export const GlobalLoadingProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [loadingCount, setLoadingCount] = useState(0);
  const [message, setMessage] = useState<string | undefined>();
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const setIsLoading = useCallback((loading: boolean) => {
    setLoadingCount(prev => {
      const next = loading ? prev + 1 : Math.max(0, prev - 1);
      
      // Auto-cleanup for safety
      if (next === 0 && timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      
      return next;
    });

    if (loading) {
      // Safety: No loader should last more than 15s
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        setLoadingCount(0);
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
        isLoading: loadingCount > 0,
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

