import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { loadingManager } from '../utils/loadingManager';
import UnigatherLoader from '../components/UnigatherLoader';

const LoadingContext = createContext({
  isLoading: false,
  loadingText: 'Loading...',
  startLoading: () => {},
  stopLoading: () => {},
  withLoading: async (fn) => fn()
});

export function LoadingProvider({ children }) {
  const [isLoading, setIsLoading] = useState(false);
  const [loadingText, setLoadingText] = useState('Loading...');

  useEffect(() => {
    const unsubscribe = loadingManager.subscribe((loading, text) => {
      setIsLoading(loading);
      if (text) setLoadingText(text);
    });
    return unsubscribe;
  }, []);

  const startLoading = useCallback((key, text = 'Loading...') => {
    return loadingManager.start(key, text);
  }, []);

  const stopLoading = useCallback((key) => {
    loadingManager.stop(key);
  }, []);

  const withLoading = useCallback(async (asyncFn, text = 'Loading...') => {
    const key = loadingManager.start(null, text);
    try {
      return await asyncFn();
    } finally {
      loadingManager.stop(key);
    }
  }, []);

  return (
    <LoadingContext.Provider value={{ isLoading, loadingText, startLoading, stopLoading, withLoading }}>
      {children}
    </LoadingContext.Provider>
  );
}

export function useLoading() {
  return useContext(LoadingContext);
}

