import { useState, useCallback } from 'react';

interface NavigationHistory {
  currentPage: string;
  history: string[];
  navigate: (page: string) => void;
  goBack: () => void;
  canGoBack: boolean;
  clearHistory: () => void;
}

export function useNavigationHistory(initialPage: string = 'home'): NavigationHistory {
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [history, setHistory] = useState<string[]>([]);

  const navigate = useCallback((page: string) => {
    setHistory((prev) => [...prev, currentPage]);
    setCurrentPage(page);
  }, [currentPage]);

  const goBack = useCallback(() => {
    if (history.length > 0) {
      const previousPage = history[history.length - 1];
      setHistory((prev) => prev.slice(0, -1));
      setCurrentPage(previousPage);
    }
  }, [history]);

  const clearHistory = useCallback(() => {
    setHistory([]);
  }, []);

  return {
    currentPage,
    history,
    navigate,
    goBack,
    canGoBack: history.length > 0,
    clearHistory,
  };
}
