'use client';

import React, { useState, useEffect } from 'react';
import { useTheme } from '@/components/providers/ThemeProvider';
import styles from './ThemeAdmin.module.css';

interface DesignToken {
  category: string;
  name: string;
  value: string;
  description: string;
  type: 'color' | 'font' | 'spacing' | 'shadow' | 'border' | 'transition';
}

interface ThemeVariant {
  name: string;
  description: string;
  tokens: Record<string, string>;
}

export default function ThemeAdminPage() {
  const { theme, toggleTheme } = useTheme();
  const [activeTab, setActiveTab] = useState('colors');
  const [previewMode, setPreviewMode] = useState<'light' | 'dark'>('light');
  const [customTokens, setCustomTokens] = useState<Record<string, string>>({});

  // Design tokens organized by category
  const designTokens: Record<string, DesignToken[]> = {
    colors: [
      { category: 'Primary', name: '--color-primary', value: '#4f46e5', description: 'Main brand color', type: 'color' },
      { category: 'Primary', name: '--color-primary-light', value: '#818cf8', description: 'Light variant', type: 'color' },
      { category: 'Primary', name: '--color-primary-dark', value: '#3730a3', description: 'Dark variant', type: 'color' },
      { category: 'Secondary', name: '--color-secondary', value: '#059669', description: 'Secondary brand color', type: 'color' },
      { category: 'Secondary', name: '--color-secondary-light', value: '#34d399', description: 'Light variant', type: 'color' },
      { category: 'Secondary', name: '--color-secondary-dark', value: '#065f46', description: 'Dark variant', type: 'color' },
      { category: 'Neutral', name: '--color-neutral-50', value: '#f8fafc', description: 'Lightest neutral', type: 'color' },
      { category: 'Neutral', name: '--color-neutral-100', value: '#f1f5f9', description: 'Very light neutral', type: 'color' },
      { category: 'Neutral', name: '--color-neutral-200', value: '#e2e8f0', description: 'Light neutral', type: 'color' },
      { category: 'Neutral', name: '--color-neutral-300', value: '#cbd5e1', description: 'Medium light neutral', type: 'color' },
      { category: 'Neutral', name: '--color-neutral-400', value: '#94a3b8', description: 'Medium neutral', type: 'color' },
      { category: 'Neutral', name: '--color-neutral-500', value: '#64748b', description: 'True neutral', type: 'color' },
      { category: 'Neutral', name: '--color-neutral-600', value: '#475569', description: 'Medium dark neutral', type: 'color' },
      { category: 'Neutral', name: '--color-neutral-700', value: '#334155', description: 'Dark neutral', type: 'color' },
      { category: 'Neutral', name: '--color-neutral-800', value: '#1e293b', description: 'Very dark neutral', type: 'color' },
      { category: 'Neutral', name: '--color-neutral-900', value: '#0f172a', description: 'Darkest neutral', type: 'color' },
      { category: 'Semantic', name: '--color-success', value: '#059669', description: 'Success state', type: 'color' },
      { category: 'Semantic', name: '--color-error', value: '#dc2626', description: 'Error state', type: 'color' },
      { category: 'Semantic', name: '--color-warning', value: '#ea580c', description: 'Warning state', type: 'color' },
      { category: 'Semantic', name: '--color-info', value: '#2563eb', description: 'Info state', type: 'color' },
    ],
    typography: [
      { category: 'Font Sizes', name: '--font-size-xs', value: '0.75rem', description: 'Extra small text', type: 'font' },
      { category: 'Font Sizes', name: '--font-size-sm', value: '0.875rem', description: 'Small text', type: 'font' },
      { category: 'Font Sizes', name: '--font-size-base', value: '1rem', description: 'Base text size', type: 'font' },
      { category: 'Font Sizes', name: '--font-size-lg', value: '1.125rem', description: 'Large text', type: 'font' },
      { category: 'Font Sizes', name: '--font-size-xl', value: '1.25rem', description: 'Extra large text', type: 'font' },
      { category: 'Font Sizes', name: '--font-size-2xl', value: '1.5rem', description: '2x large text', type: 'font' },
      { category: 'Font Sizes', name: '--font-size-3xl', value: '1.875rem', description: '3x large text', type: 'font' },
      { category: 'Font Sizes', name: '--font-size-4xl', value: '2.25rem', description: '4x large text', type: 'font' },
      { category: 'Font Weights', name: '--font-weight-light', value: '300', description: 'Light weight', type: 'font' },
      { category: 'Font Weights', name: '--font-weight-normal', value: '400', description: 'Normal weight', type: 'font' },
      { category: 'Font Weights', name: '--font-weight-medium', value: '500', description: 'Medium weight', type: 'font' },
      { category: 'Font Weights', name: '--font-weight-semibold', value: '600', description: 'Semibold weight', type: 'font' },
      { category: 'Font Weights', name: '--font-weight-bold', value: '700', description: 'Bold weight', type: 'font' },
      { category: 'Line Heights', name: '--line-height-tight', value: '1.25', description: 'Tight line height', type: 'font' },
      { category: 'Line Heights', name: '--line-height-normal', value: '1.5', description: 'Normal line height', type: 'font' },
      { category: 'Line Heights', name: '--line-height-relaxed', value: '1.75', description: 'Relaxed line height', type: 'font' },
    ],
    spacing: [
      { category: 'Scale', name: '--spacing-xs', value: '0.25rem', description: 'Extra small spacing', type: 'spacing' },
      { category: 'Scale', name: '--spacing-sm', value: '0.5rem', description: 'Small spacing', type: 'spacing' },
      { category: 'Scale', name: '--spacing-md', value: '1rem', description: 'Medium spacing', type: 'spacing' },
      { category: 'Scale', name: '--spacing-lg', value: '1.5rem', description: 'Large spacing', type: 'spacing' },
      { category: 'Scale', name: '--spacing-xl', value: '2rem', description: 'Extra large spacing', type: 'spacing' },
      { category: 'Scale', name: '--spacing-2xl', value: '3rem', description: '2x large spacing', type: 'spacing' },
      { category: 'Scale', name: '--spacing-3xl', value: '4rem', description: '3x large spacing', type: 'spacing' },
    ],
    effects: [
      { category: 'Shadows', name: '--shadow-sm', value: '0 1px 2px 0 rgb(0 0 0 / 0.05)', description: 'Small shadow', type: 'shadow' },
      { category: 'Shadows', name: '--shadow-md', value: '0 4px 6px -1px rgb(0 0 0 / 0.1)', description: 'Medium shadow', type: 'shadow' },
      { category: 'Shadows', name: '--shadow-lg', value: '0 10px 15px -3px rgb(0 0 0 / 0.1)', description: 'Large shadow', type: 'shadow' },
      { category: 'Borders', name: '--border-radius-sm', value: '0.25rem', description: 'Small border radius', type: 'border' },
      { category: 'Borders', name: '--border-radius-md', value: '0.5rem', description: 'Medium border radius', type: 'border' },
      { category: 'Borders', name: '--border-radius-lg', value: '0.75rem', description: 'Large border radius', type: 'border' },
      { category: 'Borders', name: '--border-radius-xl', value: '1rem', description: 'Extra large border radius', type: 'border' },
    ],
  };

  // Predefined theme variants
  const themeVariants: ThemeVariant[] = [
    {
      name: 'MSN Classic',
      description: 'Inspired by MSN.com with clean, professional design',
      tokens: {
        '--color-primary': '#0078d4',
        '--color-secondary': '#107c10',
        '--color-accent': '#ff6b35',
        '--font-family-primary': '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        '--border-radius-md': '0.375rem',
        '--shadow-md': '0 2px 8px rgba(0, 0, 0, 0.1)',
      }
    },
    {
      name: 'YouTube Modern',
      description: 'Clean, modern design inspired by YouTube',
      tokens: {
        '--color-primary': '#ff0000',
        '--color-secondary': '#606060',
        '--color-accent': '#065fd4',
        '--font-family-primary': 'Roboto, Arial, sans-serif',
        '--border-radius-md': '0.5rem',
        '--shadow-md': '0 1px 3px rgba(0, 0, 0, 0.12)',
      }
    },
    {
      name: 'Twitter/X',
      description: 'Minimalist design inspired by Twitter/X',
      tokens: {
        '--color-primary': '#1da1f2',
        '--color-secondary': '#657786',
        '--color-accent': '#794bc4',
        '--font-family-primary': '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        '--border-radius-md': '9999px',
        '--shadow-md': '0 0 0 1px rgba(0, 0, 0, 0.1)',
      }
    },
  ];

  const handleTokenChange = (tokenName: string, value: string) => {
    setCustomTokens(prev => ({
      ...prev,
      [tokenName]: value
    }));
    
    // Apply to document root for live preview
    document.documentElement.style.setProperty(tokenName, value);
  };

  const applyThemeVariant = (variant: ThemeVariant) => {
    setCustomTokens(variant.tokens);
    
    // Apply all tokens to document root
    Object.entries(variant.tokens).forEach(([key, value]) => {
      document.documentElement.style.setProperty(key, value);
    });
  };

  const resetToDefault = () => {
    setCustomTokens({});
    
    // Remove custom properties
    Object.keys(customTokens).forEach(key => {
      document.documentElement.style.removeProperty(key);
    });
  };

  const exportTheme = () => {
    const themeData = {
      name: 'Custom Theme',
      tokens: customTokens,
      timestamp: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(themeData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'custom-theme.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Theme Administration</h1>
        <p>Design system configuration and testing interface</p>
      </div>

      <div className={styles.controls}>
        <div className={styles.themeToggle}>
          <label>Current Theme:</label>
          <button onClick={toggleTheme} className={styles.themeButton}>
            {theme === 'light' ? '🌙 Dark' : '☀️ Light'}
          </button>
        </div>
        
        <div className={styles.previewToggle}>
          <label>Preview Mode:</label>
          <select 
            value={previewMode} 
            onChange={(e) => setPreviewMode(e.target.value as 'light' | 'dark')}
            className={styles.select}
          >
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
        </div>
      </div>

      <div className={styles.mainContent}>
        <div className={styles.sidebar}>
          <div className={styles.tabs}>
            <button 
              className={`${styles.tab} ${activeTab === 'colors' ? styles.active : ''}`}
              onClick={() => setActiveTab('colors')}
            >
              Colors
            </button>
            <button 
              className={`${styles.tab} ${activeTab === 'typography' ? styles.active : ''}`}
              onClick={() => setActiveTab('typography')}
            >
              Typography
            </button>
            <button 
              className={`${styles.tab} ${activeTab === 'spacing' ? styles.active : ''}`}
              onClick={() => setActiveTab('spacing')}
            >
              Spacing
            </button>
            <button 
              className={`${styles.tab} ${activeTab === 'effects' ? styles.active : ''}`}
              onClick={() => setActiveTab('effects')}
            >
              Effects
            </button>
            <button 
              className={`${styles.tab} ${activeTab === 'presets' ? styles.active : ''}`}
              onClick={() => setActiveTab('presets')}
            >
              Presets
            </button>
          </div>

          <div className={styles.actions}>
            <button onClick={resetToDefault} className={styles.actionButton}>
              Reset to Default
            </button>
            <button onClick={exportTheme} className={styles.actionButton}>
              Export Theme
            </button>
          </div>
        </div>

        <div className={styles.content}>
          {activeTab === 'presets' && (
            <div className={styles.presetsSection}>
              <h2>Theme Presets</h2>
              <div className={styles.presetGrid}>
                {themeVariants.map((variant) => (
                  <div key={variant.name} className={styles.presetCard}>
                    <h3>{variant.name}</h3>
                    <p>{variant.description}</p>
                    <button 
                      onClick={() => applyThemeVariant(variant)}
                      className={styles.presetButton}
                    >
                      Apply Preset
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab !== 'presets' && (
            <div className={styles.tokensSection}>
              <h2>{activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Tokens</h2>
              <div className={styles.tokensGrid}>
                {designTokens[activeTab]?.map((token) => (
                  <div key={token.name} className={styles.tokenCard}>
                    <div className={styles.tokenHeader}>
                      <h4>{token.name}</h4>
                      <span className={styles.tokenCategory}>{token.category}</span>
                    </div>
                    <p className={styles.tokenDescription}>{token.description}</p>
                    
                    {token.type === 'color' && (
                      <div className={styles.colorInput}>
                        <input
                          type="color"
                          value={customTokens[token.name] || token.value}
                          onChange={(e) => handleTokenChange(token.name, e.target.value)}
                          className={styles.colorPicker}
                        />
                        <input
                          type="text"
                          value={customTokens[token.name] || token.value}
                          onChange={(e) => handleTokenChange(token.name, e.target.value)}
                          className={styles.colorText}
                          placeholder={token.value}
                        />
                      </div>
                    )}
                    
                    {token.type !== 'color' && (
                      <input
                        type="text"
                        value={customTokens[token.name] || token.value}
                        onChange={(e) => handleTokenChange(token.name, e.target.value)}
                        className={styles.tokenInput}
                        placeholder={token.value}
                      />
                    )}
                    
                    <div className={styles.tokenPreview}>
                      <div 
                        className={styles.previewBox}
                        style={{ 
                          backgroundColor: token.type === 'color' ? (customTokens[token.name] || token.value) : undefined,
                          fontSize: token.type === 'font' && token.name.includes('size') ? (customTokens[token.name] || token.value) : undefined,
                          padding: token.type === 'spacing' ? (customTokens[token.name] || token.value) : undefined,
                          boxShadow: token.type === 'shadow' ? (customTokens[token.name] || token.value) : undefined,
                          borderRadius: token.type === 'border' ? (customTokens[token.name] || token.value) : undefined,
                        }}
                      >
                        {token.type === 'color' && 'Color Preview'}
                        {token.type === 'font' && 'Typography Preview'}
                        {token.type === 'spacing' && 'Spacing'}
                        {token.type === 'shadow' && 'Shadow'}
                        {token.type === 'border' && 'Border'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className={styles.preview}>
        <h2>Live Preview</h2>
        <div className={`${styles.previewContainer} ${styles[previewMode]}`}>
          <div className={styles.previewCard}>
            <h3>Sample Card</h3>
            <p>This is a sample card to preview your theme changes in real-time.</p>
            <div className={styles.previewButtons}>
              <button className={styles.primaryButton}>Primary Button</button>
              <button className={styles.secondaryButton}>Secondary Button</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 