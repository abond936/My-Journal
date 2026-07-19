'use client';

import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setThemePreference: (theme: Theme) => Promise<boolean>;
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
  const { status: sessionStatus } = useSession();
  // Keep the first client render identical to SSR. The inline layout script sets
  // the visual theme before paint; the effect below then synchronizes React state.
  const [theme, setTheme] = useState<Theme>('dark');
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

  useEffect(() => {
    if (sessionStatus !== 'authenticated') return;
    let cancelled = false;
    void fetch('/api/account/preferences')
      .then(async (response) => {
        if (!response.ok) return null;
        return response.json() as Promise<{ readerThemeMode?: Theme | null }>;
      })
      .then((data) => {
        const saved = data?.readerThemeMode;
        if (cancelled || (saved !== 'light' && saved !== 'dark')) return;
        setTheme(saved);
        document.documentElement.setAttribute('data-theme', saved);
        localStorage.setItem('theme', saved);
      })
      .catch(() => {
        // Browser preference remains the temporary fallback when account settings are unavailable.
      });
    return () => {
      cancelled = true;
    };
  }, [sessionStatus]);

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

  const setThemePreference = useCallback(async (newTheme: Theme): Promise<boolean> => {
    setTheme(newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    if (sessionStatus !== 'authenticated') return true;
    try {
      const response = await fetch('/api/account/preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ readerThemeMode: newTheme }),
      });
      return response.ok;
    } catch {
      return false;
    }
  }, [sessionStatus]);

  const toggleTheme = useCallback(() => {
    void setThemePreference(theme === 'light' ? 'dark' : 'light');
  }, [setThemePreference, theme]);

  const value = useMemo(
    () => ({
      theme,
      toggleTheme,
      setThemePreference,
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
    [theme, toggleTheme, setThemePreference, refreshTheme, applyDraftThemeCss, clearDraftThemeCss, draftThemeCss, isThemeAdminOpen, openThemeAdmin, closeThemeAdmin, lastNonThemeAdminPath]
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
