'use client';

import { useTheme } from '@/components/providers/ThemeProvider';
import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';
import styles from './ThemeToggle.module.css';

export function ThemeToggle() {
  const [mounted, setMounted] = useState(false);
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  const switchToLight = theme === 'dark';
  const actionLabel = switchToLight ? 'Light' : 'Dark';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={styles.themeToggle}
      aria-label={`Switch to ${actionLabel}`}
      title={`Switch to ${actionLabel}`}
    >
      {switchToLight ? <Sun strokeWidth={2} aria-hidden="true" /> : <Moon strokeWidth={2} aria-hidden="true" />}
      <span>{actionLabel}</span>
    </button>
  );
}
