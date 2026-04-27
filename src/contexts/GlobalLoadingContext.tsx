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
  const [showDelayedLoading, setShowDelayedLoading] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const delayTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const setIsLoading = useCallback((loading: boolean, id: string = 'default') => {
    setActiveLoaders(prev => {
      const next = new Set(prev);
      if (loading) {
        next.add(id);
      } else {
        next.delete(id);
      }
      
      // Auto-cleanup timeouts
      if (next.size === 0) {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
        if (delayTimeoutRef.current) {
          clearTimeout(delayTimeoutRef.current);
          delayTimeoutRef.current = null;
        }
        setShowDelayedLoading(false);
      }
      
      return next;
    });

    if (loading) {
      // 1. Safety Timeout: No loader should last more than 15s
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        setActiveLoaders(new Set());
        setShowDelayedLoading(false);
        console.warn('[GlobalLoading] Safety timeout triggered - Force clearing loader');
      }, 15000);

      // 2. Anti-Flicker Delay: Only show UI if loading lasts > 300ms
      if (!delayTimeoutRef.current) {
        delayTimeoutRef.current = setTimeout(() => {
          setShowDelayedLoading(true);
        }, 300);
      }
    }
  }, []);

  const setMessageCallback = useCallback((msg?: string) => {
    setMessage(msg);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (delayTimeoutRef.current) clearTimeout(delayTimeoutRef.current);
    };
  }, []);

  return (
    <GlobalLoadingContext.Provider
      value={{
        isLoading: showDelayedLoading,
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

