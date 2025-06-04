'use client';

import { useState } from 'react';
import styles from './ThemeTestPage.module.css';

export default function ThemeTestPage() {
  const [isDarkMode, setIsDarkMode] = useState(false);

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
    document.documentElement.setAttribute('data-theme', isDarkMode ? 'light' : 'dark');
  };

  return (
    <div className={styles.container}>
      <h1>Theme Test Page</h1>
      
      <button 
        onClick={toggleTheme}
        className={styles.themeToggle}
      >
        {isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
      </button>

      <div className={styles.colorGrid}>
        <div className={styles.colorSection}>
          <h2>Primary Colors</h2>
          <div className={styles.colorBox} style={{ backgroundColor: 'var(--color-primary)' }}>Primary</div>
          <div className={styles.colorBox} style={{ backgroundColor: 'var(--color-primary-light)' }}>Primary Light</div>
          <div className={styles.colorBox} style={{ backgroundColor: 'var(--color-primary-dark)' }}>Primary Dark</div>
        </div>

        <div className={styles.colorSection}>
          <h2>Secondary Colors</h2>
          <div className={styles.colorBox} style={{ backgroundColor: 'var(--color-secondary)' }}>Secondary</div>
          <div className={styles.colorBox} style={{ backgroundColor: 'var(--color-secondary-light)' }}>Secondary Light</div>
          <div className={styles.colorBox} style={{ backgroundColor: 'var(--color-secondary-dark)' }}>Secondary Dark</div>
        </div>

        <div className={styles.colorSection}>
          <h2>Accent Colors</h2>
          <div className={styles.colorBox} style={{ backgroundColor: 'var(--color-accent)' }}>Accent</div>
          <div className={styles.colorBox} style={{ backgroundColor: 'var(--color-accent-light)' }}>Accent Light</div>
          <div className={styles.colorBox} style={{ backgroundColor: 'var(--color-accent-dark)' }}>Accent Dark</div>
        </div>

        <div className={styles.colorSection}>
          <h2>Background Colors</h2>
          <div className={styles.colorBox} style={{ backgroundColor: 'var(--background-primary)' }}>Background Primary</div>
          <div className={styles.colorBox} style={{ backgroundColor: 'var(--background-secondary)' }}>Background Secondary</div>
          <div className={styles.colorBox} style={{ backgroundColor: 'var(--background-tertiary)' }}>Background Tertiary</div>
        </div>

        <div className={styles.colorSection}>
          <h2>Text Colors</h2>
          <div className={styles.colorBox} style={{ backgroundColor: 'var(--text-primary)' }}>Text Primary</div>
          <div className={styles.colorBox} style={{ backgroundColor: 'var(--text-secondary)' }}>Text Secondary</div>
          <div className={styles.colorBox} style={{ backgroundColor: 'var(--text-tertiary)' }}>Text Tertiary</div>
        </div>

        <div className={styles.colorSection}>
          <h2>Status Colors</h2>
          <div className={styles.colorBox} style={{ backgroundColor: 'var(--color-success)' }}>Success</div>
          <div className={styles.colorBox} style={{ backgroundColor: 'var(--color-warning)' }}>Warning</div>
          <div className={styles.colorBox} style={{ backgroundColor: 'var(--color-error)' }}>Error</div>
          <div className={styles.colorBox} style={{ backgroundColor: 'var(--color-info)' }}>Info</div>
        </div>
      </div>

      <div className={styles.componentSection}>
        <h2>Component Examples</h2>
        
        <div className={styles.componentGrid}>
          <div className={styles.component}>
            <h3>Buttons</h3>
            <button className="btn btn-primary">Primary Button</button>
            <button className="btn btn-secondary">Secondary Button</button>
          </div>

          <div className={styles.component}>
            <h3>Cards</h3>
            <div className="card">
              <h4>Card Title</h4>
              <p>This is a sample card with some content.</p>
            </div>
          </div>

          <div className={styles.component}>
            <h3>Inputs</h3>
            <input type="text" className="input" placeholder="Text input" />
            <input type="email" className="input" placeholder="Email input" />
          </div>
        </div>
      </div>
    </div>
  );
} 