import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface GlobalLoadingContextType {
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  message?: string;
  setMessage: (message?: string) => void;
}

const GlobalLoadingContext = createContext<GlobalLoadingContextType | undefined>(undefined);

interface GlobalLoadingProviderProps {
  children: ReactNode;
}

export const GlobalLoadingProvider: React.FC<GlobalLoadingProviderProps> = ({ children }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<string | undefined>();

  const handleSetIsLoading = useCallback((loading: boolean) => {
    setIsLoading(loading);
  }, []);

  const handleSetMessage = useCallback((msg?: string) => {
    setMessage(msg);
  }, []);

  return (
    <GlobalLoadingContext.Provider
      value={{
        isLoading,
        setIsLoading: handleSetIsLoading,
        message,
        setMessage: handleSetMessage
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
