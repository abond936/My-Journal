'use client';

import { usePathname } from 'next/navigation';
import { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  /** Reloads the page so SSR-injected theme tokens (after Theme admin save) apply. Prefer `router.refresh()` in admin when possible. */
  refreshTheme: () => Promise<void>;
  applyDraftThemeCss: (css: string) => void;
  clearDraftThemeCss: () => void;
  hasDraftThemeCss: boolean;
  isThemeLoading: boolean;
  isThemeAdminOpen: boolean;
  openThemeAdmin: () => void;
  closeThemeAdmin: () => void;
  lastNonThemeAdminPath: string;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window === 'undefined') return 'dark';
    const fromDataAttr = document.documentElement.getAttribute('data-theme');
    if (fromDataAttr === 'light' || fromDataAttr === 'dark') {
      return fromDataAttr;
    }
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'light' || savedTheme === 'dark') {
      return savedTheme;
    }
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });
  const [draftThemeCss, setDraftThemeCss] = useState('');
  const [isThemeAdminOpen, setIsThemeAdminOpen] = useState(false);
  const [lastNonThemeAdminPath, setLastNonThemeAdminPath] = useState('/view');

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'light' || savedTheme === 'dark') {
      setTheme(savedTheme);
      document.documentElement.setAttribute('data-theme', savedTheme);
    } else {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      const initialTheme = prefersDark ? 'dark' : 'light';
      setTheme(initialTheme);
      document.documentElement.setAttribute('data-theme', initialTheme);
    }
  }, []);

  const refreshTheme = useCallback(async () => {
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const savedPath = sessionStorage.getItem('theme-admin:last-non-theme-path');
    if (savedPath) {
      setLastNonThemeAdminPath(savedPath);
    }
    const savedOpenState = sessionStorage.getItem('theme-admin:is-open');
    if (savedOpenState === 'true') {
      setIsThemeAdminOpen(true);
    }
  }, []);

  useEffect(() => {
    if (!pathname || pathname.startsWith('/admin/theme-admin')) return;
    setLastNonThemeAdminPath(pathname);
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('theme-admin:last-non-theme-path', pathname);
    }
  }, [pathname]);

  const applyDraftThemeCss = useCallback((css: string) => {
    setDraftThemeCss(css);
  }, []);

  const clearDraftThemeCss = useCallback(() => {
    setDraftThemeCss('');
  }, []);

  const openThemeAdmin = useCallback(() => {
    setIsThemeAdminOpen(true);
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('theme-admin:is-open', 'true');
    }
  }, []);

  const closeThemeAdmin = useCallback(() => {
    setIsThemeAdminOpen(false);
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('theme-admin:is-open', 'false');
    }
  }, []);

  const toggleTheme = useCallback(() => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
  }, [theme]);

  const value = useMemo(
    () => ({
      theme,
      toggleTheme,
      refreshTheme,
      applyDraftThemeCss,
      clearDraftThemeCss,
      hasDraftThemeCss: draftThemeCss.length > 0,
      isThemeLoading: false,
      isThemeAdminOpen,
      openThemeAdmin,
      closeThemeAdmin,
      lastNonThemeAdminPath,
    }),
    [theme, toggleTheme, refreshTheme, applyDraftThemeCss, clearDraftThemeCss, draftThemeCss, isThemeAdminOpen, openThemeAdmin, closeThemeAdmin, lastNonThemeAdminPath]
  );

  return (
    <ThemeContext.Provider value={value}>
      <div className="themeDraftReaderScope">
        {draftThemeCss ? (
          <style
            id="theme-draft-tokens"
            dangerouslySetInnerHTML={{ __html: draftThemeCss }}
          />
        ) : null}
        {children}
      </div>
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
