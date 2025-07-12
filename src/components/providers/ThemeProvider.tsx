'use client';

import { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  refreshTheme: () => Promise<void>;
  isThemeLoading: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>('light');
  const [isThemeLoading, setIsThemeLoading] = useState(false);

  // Load theme data from admin system
  const loadThemeData = useCallback(async () => {
    try {
      setIsThemeLoading(true);
      const response = await fetch('/api/theme');
      if (response.ok) {
        const themeData = await response.json();
        // Store theme data in a way that can be accessed by CSS
        // This could be through CSS custom properties or a different mechanism
        console.log('Theme data loaded:', themeData);
      }
    } catch (error) {
      console.error('Failed to load theme data:', error);
    } finally {
      setIsThemeLoading(false);
    }
  }, []);

  // Refresh theme from admin system
  const refreshTheme = useCallback(async () => {
    await loadThemeData();
  }, [loadThemeData]);

  useEffect(() => {
    // Check for saved theme preference
    const savedTheme = localStorage.getItem('theme') as Theme;
    if (savedTheme) {
      setTheme(savedTheme);
      document.documentElement.setAttribute('data-theme', savedTheme);
    } else {
      // Check system preference
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      const initialTheme = prefersDark ? 'dark' : 'light';
      setTheme(initialTheme);
      document.documentElement.setAttribute('data-theme', initialTheme);
    }

    // Load initial theme data
    loadThemeData();
  }, [loadThemeData]);

  const toggleTheme = useCallback(() => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
  }, [theme]);

  const value = useMemo(() => ({ 
    theme, 
    toggleTheme, 
    refreshTheme, 
    isThemeLoading 
  }), [theme, toggleTheme, refreshTheme, isThemeLoading]);

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
} 