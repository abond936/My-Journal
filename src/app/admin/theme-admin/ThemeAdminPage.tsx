'use client';

import React, { useState, useEffect } from 'react';
import { useTheme } from '@/components/providers/ThemeProvider';
import styles from './ThemeAdmin.module.css';

interface ThemeVariable {
  name: string;
  darkValue: string;
  lightValue: string;
  description: string;
  type: 'color' | 'font' | 'spacing' | 'border' | 'effect' | 'layout' | 'intent';
}

// Sample card data for preview
const sampleCard = {
  title: "Sample Card Title",
  excerpt: "This is a sample card with some content to demonstrate how the theme variables affect the appearance of cards throughout the application.",
  tags: ["Sample", "Theme", "Preview"]
};

// Card examples for preview
const cardExamples = [
  { id: 1, title: 'Story Card', hasImage: true },
  { id: 2, title: 'Quote Card', hasImage: false },
  { id: 3, title: 'Gallery Card', hasImage: true },
  { id: 4, title: 'Collection Card', hasImage: false },
];

export default function ThemeAdminPage() {
  const { theme, toggleTheme } = useTheme();
  const [customTokens, setCustomTokens] = useState<Record<string, string>>({});
  const [standardFontFamily, setStandardFontFamily] = useState('-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif');
  const [handwritingFontFamily, setHandwritingFontFamily] = useState('Ink Free, cursive');
  const [handwritingSlant, setHandwritingSlant] = useState(12);

  // Theme variables organized by category
  const themeVariables: ThemeVariable[] = [
    // Core Colors
    { name: '--background-primary', darkValue: '#1a1a1a', lightValue: '#ffffff', description: 'Main page background', type: 'color' },
    { name: '--background-secondary', darkValue: '#2d2d2d', lightValue: '#f5f5f5', description: 'Card background', type: 'color' },
    { name: '--text-primary', darkValue: '#ffffff', lightValue: '#1a1a1a', description: 'Primary text', type: 'color' },
    { name: '--text-secondary', darkValue: '#cccccc', lightValue: '#666666', description: 'Secondary text', type: 'color' },
    { name: '--accent', darkValue: '#ff6b35', lightValue: '#ff6b35', description: 'Accent color', type: 'color' },
    
    // UI Colors
    { name: '--border', darkValue: '#404040', lightValue: '#e0e0e0', description: 'Border color', type: 'color' },
    { name: '--input-background', darkValue: '#333333', lightValue: '#ffffff', description: 'Input background', type: 'color' },
    { name: '--input-border', darkValue: '#ff6b35', lightValue: '#ff6b35', description: 'Input focus border', type: 'color' },
    { name: '--divider', darkValue: '#404040', lightValue: '#e0e0e0', description: 'Divider color', type: 'color' },
    { name: '--hover', darkValue: '#404040', lightValue: '#f0f0f0', description: 'Hover state', type: 'color' },
    
    // Image Overlays
    { name: '--overlay-dark', darkValue: 'rgba(0,0,0,0.7)', lightValue: 'rgba(0,0,0,0.7)', description: 'Dark image overlay', type: 'color' },
    { name: '--overlay-light', darkValue: 'rgba(255,255,255,0.1)', lightValue: 'rgba(255,255,255,0.1)', description: 'Light image overlay', type: 'color' },
    
    // Semantic Colors (Admin)
    { name: '--success', darkValue: '#10b981', lightValue: '#059669', description: 'Success color', type: 'color' },
    { name: '--error', darkValue: '#ef4444', lightValue: '#dc2626', description: 'Error color', type: 'color' },
    { name: '--warning', darkValue: '#f59e0b', lightValue: '#d97706', description: 'Warning color', type: 'color' },
    { name: '--info', darkValue: '#3b82f6', lightValue: '#2563eb', description: 'Info color', type: 'color' },
    
    // Alternate Colors (Light versions)
    { name: '--alt1-light', darkValue: '#C45A1A', lightValue: '#C45A1A', description: 'Alt 1 Light', type: 'color' },
    { name: '--alt2-light', darkValue: '#1A6B8A', lightValue: '#1A6B8A', description: 'Alt 2 Light', type: 'color' },
    { name: '--alt3-light', darkValue: '#4A8F32', lightValue: '#4A8F32', description: 'Alt 3 Light', type: 'color' },
    { name: '--alt4-light', darkValue: '#8A327A', lightValue: '#8A327A', description: 'Alt 4 Light', type: 'color' },
    { name: '--alt5-light', darkValue: '#9A7A3E', lightValue: '#9A7A3E', description: 'Alt 5 Light', type: 'color' },
    { name: '--alt6-light', darkValue: '#E6B85A', lightValue: '#E6B85A', description: 'Alt 6 Light', type: 'color' },
    
    // Alternate Colors (Dark versions)
    { name: '--alt1-dark', darkValue: '#8A3A0E', lightValue: '#8A3A0E', description: 'Alt 1 Dark', type: 'color' },
    { name: '--alt2-dark', darkValue: '#0E3A4A', lightValue: '#0E3A4A', description: 'Alt 2 Dark', type: 'color' },
    { name: '--alt3-dark', darkValue: '#2C5A1F', lightValue: '#2C5A1F', description: 'Alt 3 Dark', type: 'color' },
    { name: '--alt4-dark', darkValue: '#5A1F4F', lightValue: '#5A1F4F', description: 'Alt 4 Dark', type: 'color' },
    { name: '--alt5-dark', darkValue: '#6A4F29', lightValue: '#6A4F29', description: 'Alt 5 Dark', type: 'color' },
    { name: '--alt6-dark', darkValue: '#B08A3E', lightValue: '#B08A3E', description: 'Alt 6 Dark', type: 'color' },
  ];

  // Typography Variables
  const typographyVariables = [
    { name: '--font-size-xs', value: '0.75rem', description: 'Extra small text (labels, timestamps)', type: 'font' },
    { name: '--font-size-sm', value: '0.875rem', description: 'Small text (captions, metadata)', type: 'font' },
    { name: '--font-size-base', value: '1rem', description: 'Base text size', type: 'font' },
    { name: '--font-size-lg', value: '1.125rem', description: 'Large text (important body)', type: 'font' },
    { name: '--font-size-xl', value: '1.25rem', description: 'Extra large text (subsection headers)', type: 'font' },
    { name: '--font-size-2xl', value: '1.5rem', description: '2XL text (section headers)', type: 'font' },
    { name: '--font-size-3xl', value: '1.875rem', description: '3XL text (page titles)', type: 'font' },
    { name: '--font-size-4xl', value: '2.25rem', description: '4XL text (hero titles)', type: 'font' },
    { name: '--line-height-tight', value: '1.25', description: 'Tight line height', type: 'font' },
    { name: '--line-height-normal', value: '1.5', description: 'Normal line height', type: 'font' },
    { name: '--line-height-relaxed', value: '1.75', description: 'Relaxed line height', type: 'font' },
    { name: '--font-weight-normal', value: '400', description: 'Normal font weight', type: 'font' },
    { name: '--font-weight-medium', value: '500', description: 'Medium font weight', type: 'font' },
    { name: '--font-weight-semibold', value: '600', description: 'Semibold font weight', type: 'font' },
    { name: '--font-weight-bold', value: '700', description: 'Bold font weight', type: 'font' },
  ];

  // Spacing Variables
  const spacingVariables = [
    { name: '--spacing-xs', value: '0.25rem', description: 'Extra small spacing (4px)', type: 'spacing' },
    { name: '--spacing-sm', value: '0.5rem', description: 'Small spacing (8px)', type: 'spacing' },
    { name: '--spacing-md', value: '1rem', description: 'Medium spacing (16px)', type: 'spacing' },
    { name: '--spacing-lg', value: '1.5rem', description: 'Large spacing (24px)', type: 'spacing' },
    { name: '--spacing-xl', value: '2rem', description: 'Extra large spacing (32px)', type: 'spacing' },
    { name: '--spacing-2xl', value: '3rem', description: '2XL spacing (48px)', type: 'spacing' },
    { name: '--spacing-3xl', value: '4rem', description: '3XL spacing (64px)', type: 'spacing' },
    { name: '--spacing-4xl', value: '6rem', description: '4XL spacing (96px)', type: 'spacing' },
  ];

  // Border & Effect Variables
  const borderEffectVariables = [
    { name: '--border-radius-xs', value: '0.25rem', description: 'Extra small border radius', type: 'border' },
    { name: '--border-radius-sm', value: '0.375rem', description: 'Small border radius', type: 'border' },
    { name: '--border-radius-md', value: '0.5rem', description: 'Medium border radius', type: 'border' },
    { name: '--border-radius-lg', value: '0.75rem', description: 'Large border radius', type: 'border' },
    { name: '--border-radius-xl', value: '1rem', description: 'Extra large border radius', type: 'border' },
    { name: '--border-radius-full', value: '9999px', description: 'Full border radius (circle)', type: 'border' },
    { name: '--border-width-thin', value: '1px', description: 'Thin border width', type: 'border' },
    { name: '--border-width-medium', value: '2px', description: 'Medium border width', type: 'border' },
    { name: '--border-width-thick', value: '3px', description: 'Thick border width', type: 'border' },
    { name: '--shadow-sm', value: '0 1px 2px 0 rgb(0 0 0 / 0.05)', description: 'Small shadow', type: 'effect' },
    { name: '--shadow-md', value: '0 4px 6px -1px rgb(0 0 0 / 0.1)', description: 'Medium shadow', type: 'effect' },
    { name: '--shadow-lg', value: '0 10px 15px -3px rgb(0 0 0 / 0.1)', description: 'Large shadow', type: 'effect' },
    { name: '--shadow-xl', value: '0 20px 25px -5px rgb(0 0 0 / 0.1)', description: 'Extra large shadow', type: 'effect' },
  ];

  // Layout Variables
  const layoutVariables = [
    { name: '--container-sm', value: '640px', description: 'Small container width', type: 'layout' },
    { name: '--container-md', value: '768px', description: 'Medium container width', type: 'layout' },
    { name: '--container-lg', value: '1024px', description: 'Large container width', type: 'layout' },
    { name: '--container-xl', value: '1280px', description: 'Extra large container width', type: 'layout' },
    { name: '--breakpoint-sm', value: '640px', description: 'Small breakpoint', type: 'layout' },
    { name: '--breakpoint-md', value: '768px', description: 'Medium breakpoint', type: 'layout' },
    { name: '--breakpoint-lg', value: '1024px', description: 'Large breakpoint', type: 'layout' },
    { name: '--breakpoint-xl', value: '1280px', description: 'Extra large breakpoint', type: 'layout' },
  ];

  // Design Intent Variables - Semantic mappings
  const designIntentVariables = [
    // Typography Intent - Maps base font sizes to semantic purposes
    { name: '--heading-1-size', value: 'var(--font-size-3xl)', description: 'Page titles (h1) - 1.875rem', type: 'intent' },
    { name: '--heading-2-size', value: 'var(--font-size-2xl)', description: 'Section headers (h2) - 1.5rem', type: 'intent' },
    { name: '--heading-3-size', value: 'var(--font-size-xl)', description: 'Subsection headers (h3) - 1.25rem', type: 'intent' },
    { name: '--heading-4-size', value: 'var(--font-size-lg)', description: 'Card titles (h4) - 1.125rem', type: 'intent' },
    { name: '--heading-5-size', value: 'var(--font-size-base)', description: 'Small headings (h5) - 1rem', type: 'intent' },
    { name: '--heading-6-size', value: 'var(--font-size-sm)', description: 'Smallest headings (h6) - 0.875rem', type: 'intent' },
    { name: '--body-text-size', value: 'var(--font-size-base)', description: 'Regular body text - 1rem', type: 'intent' },
    { name: '--body-text-small-size', value: 'var(--font-size-sm)', description: 'Small body text - 0.875rem', type: 'intent' },
    { name: '--caption-text-size', value: 'var(--font-size-xs)', description: 'Captions, metadata - 0.75rem', type: 'intent' },
    
    // Typography Weight Intent
    { name: '--heading-1-weight', value: 'var(--font-weight-bold)', description: 'Page title weight - 700', type: 'intent' },
    { name: '--heading-2-weight', value: 'var(--font-weight-semibold)', description: 'Section header weight - 600', type: 'intent' },
    { name: '--heading-3-weight', value: 'var(--font-weight-semibold)', description: 'Subsection header weight - 600', type: 'intent' },
    { name: '--heading-4-weight', value: 'var(--font-weight-medium)', description: 'Card title weight - 500', type: 'intent' },
    { name: '--heading-5-weight', value: 'var(--font-weight-medium)', description: 'Small heading weight - 500', type: 'intent' },
    { name: '--heading-6-weight', value: 'var(--font-weight-medium)', description: 'Smallest heading weight - 500', type: 'intent' },
    { name: '--body-text-weight', value: 'var(--font-weight-normal)', description: 'Body text weight - 400', type: 'intent' },
    
    // Line Height Intent
    { name: '--heading-line-height', value: 'var(--line-height-tight)', description: 'Heading line height - 1.25', type: 'intent' },
    { name: '--body-line-height', value: 'var(--line-height-normal)', description: 'Body text line height - 1.5', type: 'intent' },
    
    // Component Intent - Maps base values to component purposes
    { name: '--card-background', value: 'var(--background-secondary)', description: 'Card background color', type: 'intent' },
    { name: '--card-border-color', value: 'var(--border)', description: 'Card border color', type: 'intent' },
    { name: '--card-border-radius', value: 'var(--border-radius-lg)', description: 'Card border radius - 0.75rem', type: 'intent' },
    { name: '--card-shadow', value: 'var(--shadow-md)', description: 'Card shadow', type: 'intent' },
    { name: '--card-padding', value: 'var(--spacing-lg)', description: 'Card padding - 1.5rem', type: 'intent' },
    
    { name: '--button-primary-background', value: 'var(--accent)', description: 'Primary button background', type: 'intent' },
    { name: '--button-primary-text-color', value: 'white', description: 'Primary button text color', type: 'intent' },
    { name: '--button-primary-padding', value: 'var(--spacing-sm) var(--spacing-md)', description: 'Primary button padding - 0.5rem 1rem', type: 'intent' },
    { name: '--button-primary-border-radius', value: 'var(--border-radius-md)', description: 'Primary button border radius - 0.5rem', type: 'intent' },
    
    { name: '--button-secondary-background', value: 'transparent', description: 'Secondary button background', type: 'intent' },
    { name: '--button-secondary-text-color', value: 'var(--accent)', description: 'Secondary button text color', type: 'intent' },
    { name: '--button-secondary-border-color', value: 'var(--accent)', description: 'Secondary button border color', type: 'intent' },
    { name: '--button-secondary-padding', value: 'var(--spacing-sm) var(--spacing-md)', description: 'Secondary button padding - 0.5rem 1rem', type: 'intent' },
    
    { name: '--input-background', value: 'var(--input-background)', description: 'Input background color', type: 'intent' },
    { name: '--input-border-color', value: 'var(--border)', description: 'Input border color', type: 'intent' },
    { name: '--input-border-radius', value: 'var(--border-radius-md)', description: 'Input border radius - 0.5rem', type: 'intent' },
    { name: '--input-padding', value: 'var(--spacing-sm) var(--spacing-md)', description: 'Input padding - 0.5rem 1rem', type: 'intent' },
    
    { name: '--tag-background', value: 'var(--accent)', description: 'Tag background color', type: 'intent' },
    { name: '--tag-text-color', value: 'white', description: 'Tag text color', type: 'intent' },
    { name: '--tag-border-radius', value: 'var(--border-radius-full)', description: 'Tag border radius - 9999px', type: 'intent' },
    { name: '--tag-padding', value: 'var(--spacing-xs) var(--spacing-sm)', description: 'Tag padding - 0.25rem 0.5rem', type: 'intent' },
    { name: '--tag-font-size', value: 'var(--font-size-sm)', description: 'Tag font size - 0.875rem', type: 'intent' },
    
    // Border width intent tokens
    { name: '--card-border-width', value: 'var(--border-width-thin)', description: 'Card border width - 1px', type: 'intent' },
    { name: '--button-border-width', value: 'var(--border-width-medium)', description: 'Button border width - 2px', type: 'intent' },
    { name: '--input-border-width', value: 'var(--border-width-thin)', description: 'Input border width - 1px', type: 'intent' },
    { name: '--divider-border-width', value: 'var(--border-width-thin)', description: 'Divider border width - 1px', type: 'intent' },
    
    // Layout intent tokens
    { name: '--sidebar-width', value: 'var(--spacing-4xl)', description: 'Sidebar width - 6rem', type: 'intent' },
    { name: '--header-height', value: 'var(--spacing-2xl)', description: 'Header height - 3rem', type: 'intent' },
    { name: '--footer-height', value: 'var(--spacing-xl)', description: 'Footer height - 2rem', type: 'intent' },
    { name: '--modal-padding', value: 'var(--spacing-lg)', description: 'Modal padding - 1.5rem', type: 'intent' },
    { name: '--tooltip-padding', value: 'var(--spacing-sm)', description: 'Tooltip padding - 0.5rem', type: 'intent' },
    
    // Spacing Intent - Maps base spacing to semantic purposes
    { name: '--section-margin', value: 'var(--spacing-2xl)', description: 'Section margin - 3rem', type: 'intent' },
    { name: '--component-margin', value: 'var(--spacing-lg)', description: 'Component margin - 1.5rem', type: 'intent' },
    { name: '--element-margin', value: 'var(--spacing-md)', description: 'Element margin - 1rem', type: 'intent' },
    { name: '--text-margin', value: 'var(--spacing-sm)', description: 'Text margin - 0.5rem', type: 'intent' },
    
    // Color Intent - Maps base colors to semantic purposes
    { name: '--text-primary-color', value: 'var(--text-primary)', description: 'Primary text color', type: 'intent' },
    { name: '--text-secondary-color', value: 'var(--text-secondary)', description: 'Secondary text color', type: 'intent' },
    { name: '--background-primary-color', value: 'var(--background-primary)', description: 'Primary background color', type: 'intent' },
    { name: '--background-secondary-color', value: 'var(--background-secondary)', description: 'Secondary background color', type: 'intent' },
    { name: '--accent-color', value: 'var(--accent)', description: 'Accent color', type: 'intent' },
  ];

  const handleTokenChange = (tokenName: string, value: string) => {
    setCustomTokens(prev => ({
      ...prev,
      [tokenName]: value
    }));
    
    // Apply to document root for live preview
    document.documentElement.style.setProperty(tokenName, value);
  };

  // Helper function to get dropdown options for design intent tokens
  const getDropdownOptions = (intentToken: any) => {
    const tokenName = intentToken.name;
    
    // Typography size options
    if (tokenName.includes('size')) {
      return typographyVariables
        .filter(v => v.name.includes('font-size'))
        .map(v => ({ value: v.name, label: `${v.name.replace('--font-size-', '').toUpperCase()} (${v.value})` }));
    }
    
    // Typography weight options
    if (tokenName.includes('weight')) {
      return typographyVariables
        .filter(v => v.name.includes('font-weight'))
        .map(v => ({ value: v.name, label: `${v.name.replace('--font-weight-', '').toUpperCase()} (${v.value})` }));
    }
    
    // Line height options
    if (tokenName.includes('line-height')) {
      return typographyVariables
        .filter(v => v.name.includes('line-height'))
        .map(v => ({ value: v.name, label: `${v.name.replace('--line-height-', '').toUpperCase()} (${v.value})` }));
    }
    
    // Spacing options
    if (tokenName.includes('margin') || tokenName.includes('padding')) {
      return spacingVariables
        .map(v => ({ value: v.name, label: `${v.name.replace('--spacing-', '').toUpperCase()} (${v.value})` }));
    }
    
    // Layout options
    if (tokenName.includes('sidebar-width') || tokenName.includes('header-height') || tokenName.includes('footer-height') || tokenName.includes('modal-padding') || tokenName.includes('tooltip-padding')) {
      return spacingVariables
        .map(v => ({ value: v.name, label: `${v.name.replace('--spacing-', '').toUpperCase()} (${v.value})` }));
    }
    
    // Border radius options
    if (tokenName.includes('border-radius')) {
      return borderEffectVariables
        .filter(v => v.name.includes('border-radius'))
        .map(v => ({ value: v.name, label: `${v.name.replace('--border-radius-', '').toUpperCase()} (${v.value})` }));
    }
    
    // Border width options
    if (tokenName.includes('border-width')) {
      return borderEffectVariables
        .filter(v => v.name.includes('border-width'))
        .map(v => ({ value: v.name, label: `${v.name.replace('--border-width-', '').toUpperCase()} (${v.value})` }));
    }
    
    // Shadow options
    if (tokenName.includes('shadow')) {
      return borderEffectVariables
        .filter(v => v.name.includes('shadow'))
        .map(v => ({ value: v.name, label: `${v.name.replace('--shadow-', '').toUpperCase()}` }));
    }
    
    // Color options
    if (tokenName.includes('color') || tokenName.includes('background')) {
      const colorOptions = [
        { value: 'var(--text-primary)', label: 'Text Primary' },
        { value: 'var(--text-secondary)', label: 'Text Secondary' },
        { value: 'var(--background-primary)', label: 'Background Primary' },
        { value: 'var(--background-secondary)', label: 'Background Secondary' },
        { value: 'var(--accent)', label: 'Accent' },
        { value: 'var(--border)', label: 'Border' },
        { value: 'var(--divider)', label: 'Divider' },
        { value: 'var(--success)', label: 'Success' },
        { value: 'var(--error)', label: 'Error' },
        { value: 'var(--warning)', label: 'Warning' },
        { value: 'var(--info)', label: 'Info' },
        { value: 'white', label: 'White' },
        { value: 'transparent', label: 'Transparent' },
      ];
      return colorOptions;
    }
    
    // Default: return the current value as an option
    return [{ value: intentToken.value, label: intentToken.value }];
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
        <p>Complete design system configuration with side-by-side light and dark themes</p>
      </div>

      <div className={styles.mainContent}>
        {/* Left Sidebar - Variable Controls */}
        <div className={styles.sidebar}>
          <div className={styles.sidebarHeader}>
            <h2>Theme Variables</h2>
            <div className={styles.sidebarActions}>
              <button onClick={resetToDefault} className={styles.resetButton}>
                Reset
              </button>
              <button onClick={exportTheme} className={styles.exportButton}>
                Export
              </button>
            </div>
          </div>

          {/* Colors Section */}
          <div className={styles.section}>
            <h3>Colors</h3>
            <div className={styles.variablesList}>
              {themeVariables.map((variable) => (
                <div key={variable.name} className={styles.variableGroup}>
                  <div className={styles.variableName}>
                    {variable.name}
                  </div>
                  
                  <div className={styles.variableControls}>
                    <div className={styles.darkControl}>
                      <input
                        type="color"
                        value={customTokens[`${variable.name}-dark`] || variable.darkValue}
                        onChange={(e) => handleTokenChange(`${variable.name}-dark`, e.target.value)}
                        className={styles.colorPicker}
                      />
                      <input
                        type="text"
                        value={customTokens[`${variable.name}-dark`] || variable.darkValue}
                        onChange={(e) => handleTokenChange(`${variable.name}-dark`, e.target.value)}
                        className={styles.hexInput}
                        placeholder={variable.darkValue}
                      />
                    </div>
                    
                    <div className={styles.lightControl}>
                      <input
                        type="color"
                        value={customTokens[`${variable.name}-light`] || variable.lightValue}
                        onChange={(e) => handleTokenChange(`${variable.name}-light`, e.target.value)}
                        className={styles.colorPicker}
                      />
                      <input
                        type="text"
                        value={customTokens[`${variable.name}-light`] || variable.lightValue}
                        onChange={(e) => handleTokenChange(`${variable.name}-light`, e.target.value)}
                        className={styles.hexInput}
                        placeholder={variable.lightValue}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Typography Section */}
          <div className={styles.section}>
            <h3>Typography</h3>
            
            <div className={styles.fontControl}>
              <label>Standard Font:</label>
              <input
                type="text"
                value={standardFontFamily}
                onChange={(e) => setStandardFontFamily(e.target.value)}
                className={styles.fontInput}
              />
            </div>
            
            <div className={styles.fontControl}>
              <label>Journal Font:</label>
              <input
                type="text"
                value={handwritingFontFamily}
                onChange={(e) => setHandwritingFontFamily(e.target.value)}
                className={styles.fontInput}
              />
            </div>
            
            <div className={styles.fontControl}>
              <label>Handwriting Slant: {handwritingSlant}°</label>
              <input
                type="range"
                min="0"
                max="30"
                value={handwritingSlant}
                onChange={(e) => setHandwritingSlant(Number(e.target.value))}
                className={styles.slantSlider}
              />
            </div>

            {/* Font Sizes */}
            <div className={styles.subsection}>
              <h4>Font Sizes</h4>
              <div className={styles.controlsGrid}>
                {typographyVariables.filter(v => v.name.includes('font-size')).map((variable) => (
                  <div key={variable.name} className={styles.control}>
                    <label>{variable.name.replace('--font-size-', '').toUpperCase()}:</label>
                    <input
                      type="text"
                      value={customTokens[variable.name] || variable.value}
                      onChange={(e) => handleTokenChange(variable.name, e.target.value)}
                      className={styles.valueInput}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Line Heights */}
            <div className={styles.subsection}>
              <h4>Line Heights</h4>
              <div className={styles.controlsGrid}>
                {typographyVariables.filter(v => v.name.includes('line-height')).map((variable) => (
                  <div key={variable.name} className={styles.control}>
                    <label>{variable.name.replace('--line-height-', '').toUpperCase()}:</label>
                    <input
                      type="text"
                      value={customTokens[variable.name] || variable.value}
                      onChange={(e) => handleTokenChange(variable.name, e.target.value)}
                      className={styles.valueInput}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Font Weights */}
            <div className={styles.subsection}>
              <h4>Font Weights</h4>
              <div className={styles.controlsGrid}>
                {typographyVariables.filter(v => v.name.includes('font-weight')).map((variable) => (
                  <div key={variable.name} className={styles.control}>
                    <label>{variable.name.replace('--font-weight-', '').toUpperCase()}:</label>
                    <input
                      type="text"
                      value={customTokens[variable.name] || variable.value}
                      onChange={(e) => handleTokenChange(variable.name, e.target.value)}
                      className={styles.valueInput}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Spacing Section */}
          <div className={styles.section}>
            <h3>Spacing</h3>
            <div className={styles.controlsGrid}>
              {spacingVariables.map((variable) => (
                <div key={variable.name} className={styles.control}>
                  <label>{variable.name.replace('--spacing-', '').toUpperCase()}:</label>
                  <input
                    type="text"
                    value={customTokens[variable.name] || variable.value}
                    onChange={(e) => handleTokenChange(variable.name, e.target.value)}
                    className={styles.valueInput}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Borders & Effects Section */}
          <div className={styles.section}>
            <h3>Borders & Effects</h3>
            
            {/* Border Radius */}
            <div className={styles.subsection}>
              <h4>Border Radius</h4>
              <div className={styles.controlsGrid}>
                {borderEffectVariables.filter(v => v.name.includes('border-radius')).map((variable) => (
                  <div key={variable.name} className={styles.control}>
                    <label>{variable.name.replace('--border-radius-', '').toUpperCase()}:</label>
                    <input
                      type="text"
                      value={customTokens[variable.name] || variable.value}
                      onChange={(e) => handleTokenChange(variable.name, e.target.value)}
                      className={styles.valueInput}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Border Width */}
            <div className={styles.subsection}>
              <h4>Border Width</h4>
              <div className={styles.controlsGrid}>
                {borderEffectVariables.filter(v => v.name.includes('border-width')).map((variable) => (
                  <div key={variable.name} className={styles.control}>
                    <label>{variable.name.replace('--border-width-', '').toUpperCase()}:</label>
                    <input
                      type="text"
                      value={customTokens[variable.name] || variable.value}
                      onChange={(e) => handleTokenChange(variable.name, e.target.value)}
                      className={styles.valueInput}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Shadows */}
            <div className={styles.subsection}>
              <h4>Shadows</h4>
              <div className={styles.controlsGrid}>
                {borderEffectVariables.filter(v => v.name.includes('shadow')).map((variable) => (
                  <div key={variable.name} className={styles.control}>
                    <label>{variable.name.replace('--shadow-', '').toUpperCase()}:</label>
                    <input
                      type="text"
                      value={customTokens[variable.name] || variable.value}
                      onChange={(e) => handleTokenChange(variable.name, e.target.value)}
                      className={styles.valueInput}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Layout Section */}
          <div className={styles.section}>
            <h3>Layout</h3>
            
            {/* Container Widths */}
            <div className={styles.subsection}>
              <h4>Container Widths</h4>
              <div className={styles.controlsGrid}>
                {layoutVariables.filter(v => v.name.includes('container')).map((variable) => (
                  <div key={variable.name} className={styles.control}>
                    <label>{variable.name.replace('--container-', '').toUpperCase()}:</label>
                    <input
                      type="text"
                      value={customTokens[variable.name] || variable.value}
                      onChange={(e) => handleTokenChange(variable.name, e.target.value)}
                      className={styles.valueInput}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Breakpoints */}
            <div className={styles.subsection}>
              <h4>Breakpoints</h4>
              <div className={styles.controlsGrid}>
                {layoutVariables.filter(v => v.name.includes('breakpoint')).map((variable) => (
                  <div key={variable.name} className={styles.control}>
                    <label>{variable.name.replace('--breakpoint-', '').toUpperCase()}:</label>
                    <input
                      type="text"
                      value={customTokens[variable.name] || variable.value}
                      onChange={(e) => handleTokenChange(variable.name, e.target.value)}
                      className={styles.valueInput}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Design Intent Section */}
          <div className={styles.section}>
            <h3>Design Intent</h3>
            <p className={styles.sectionDescription}>
              Semantic design tokens that map base variables to actual design elements
            </p>
            
            {/* Typography Intent */}
            <div className={styles.subsection}>
              <h4>Typography Intent</h4>
              <div className={styles.controlsGrid}>
                {designIntentVariables.filter(v => v.name.includes('heading-') || v.name.includes('body-text-') || v.name.includes('caption-text-')).map((variable) => (
                  <div key={variable.name} className={styles.control}>
                    <label>{variable.name.replace('--', '').replace(/-/g, ' ').toUpperCase()}:</label>
                    <select
                      value={customTokens[variable.name] || variable.value}
                      onChange={(e) => handleTokenChange(variable.name, e.target.value)}
                      className={styles.valueInput}
                    >
                      {getDropdownOptions(variable).map(option => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </div>

            {/* Typography Weight Intent */}
            <div className={styles.subsection}>
              <h4>Typography Weight Intent</h4>
              <div className={styles.controlsGrid}>
                {designIntentVariables.filter(v => v.name.includes('weight') || v.name.includes('line-height')).map((variable) => (
                  <div key={variable.name} className={styles.control}>
                    <label>{variable.name.replace('--', '').replace(/-/g, ' ').toUpperCase()}:</label>
                    <select
                      value={customTokens[variable.name] || variable.value}
                      onChange={(e) => handleTokenChange(variable.name, e.target.value)}
                      className={styles.valueInput}
                    >
                      {getDropdownOptions(variable).map(option => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </div>

            {/* Component Intent */}
            <div className={styles.subsection}>
              <h4>Component Intent</h4>
              <div className={styles.controlsGrid}>
                {designIntentVariables.filter(v => v.name.includes('card-') || v.name.includes('button-') || v.name.includes('input-') || v.name.includes('tag-')).map((variable) => (
                  <div key={variable.name} className={styles.control}>
                    <label>{variable.name.replace('--', '').replace(/-/g, ' ').toUpperCase()}:</label>
                    <select
                      value={customTokens[variable.name] || variable.value}
                      onChange={(e) => handleTokenChange(variable.name, e.target.value)}
                      className={styles.valueInput}
                    >
                      {getDropdownOptions(variable).map(option => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </div>

            {/* Spacing Intent */}
            <div className={styles.subsection}>
              <h4>Spacing Intent</h4>
              <div className={styles.controlsGrid}>
                {designIntentVariables.filter(v => v.name.includes('margin')).map((variable) => (
                  <div key={variable.name} className={styles.control}>
                    <label>{variable.name.replace('--', '').replace(/-/g, ' ').toUpperCase()}:</label>
                    <select
                      value={customTokens[variable.name] || variable.value}
                      onChange={(e) => handleTokenChange(variable.name, e.target.value)}
                      className={styles.valueInput}
                    >
                      {getDropdownOptions(variable).map(option => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </div>

            {/* Border Width Intent */}
            <div className={styles.subsection}>
              <h4>Border Width Intent</h4>
              <div className={styles.controlsGrid}>
                {designIntentVariables.filter(v => v.name.includes('border-width')).map((variable) => (
                  <div key={variable.name} className={styles.control}>
                    <label>{variable.name.replace('--', '').replace(/-/g, ' ').toUpperCase()}:</label>
                    <select
                      value={customTokens[variable.name] || variable.value}
                      onChange={(e) => handleTokenChange(variable.name, e.target.value)}
                      className={styles.valueInput}
                    >
                      {getDropdownOptions(variable).map(option => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </div>

            {/* Layout Intent */}
            <div className={styles.subsection}>
              <h4>Layout Intent</h4>
              <div className={styles.controlsGrid}>
                {designIntentVariables.filter(v => v.name.includes('sidebar-width') || v.name.includes('header-height') || v.name.includes('footer-height') || v.name.includes('modal-padding') || v.name.includes('tooltip-padding')).map((variable) => (
                  <div key={variable.name} className={styles.control}>
                    <label>{variable.name.replace('--', '').replace(/-/g, ' ').toUpperCase()}:</label>
                    <select
                      value={customTokens[variable.name] || variable.value}
                      onChange={(e) => handleTokenChange(variable.name, e.target.value)}
                      className={styles.valueInput}
                    >
                      {getDropdownOptions(variable).map(option => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </div>

            {/* Color Intent */}
            <div className={styles.subsection}>
              <h4>Color Intent</h4>
              <div className={styles.controlsGrid}>
                {designIntentVariables.filter(v => v.name.includes('color')).map((variable) => (
                  <div key={variable.name} className={styles.control}>
                    <label>{variable.name.replace('--', '').replace(/-/g, ' ').toUpperCase()}:</label>
                    <select
                      value={customTokens[variable.name] || variable.value}
                      onChange={(e) => handleTokenChange(variable.name, e.target.value)}
                      className={styles.valueInput}
                    >
                      {getDropdownOptions(variable).map(option => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right Side - Preview Cards */}
        <div className={styles.previewSection}>
          <div className={styles.previewHeader}>
            <h2>Preview Cards</h2>
            <p>Live preview of all card types in both themes</p>
          </div>

          <div className={styles.previewCards}>
            {/* Column Headers */}
            <div className={styles.previewHeaders}>
              <div className={styles.previewTitleHeader}>Card Type</div>
              <div className={styles.darkPreviewHeader}>Dark Theme</div>
              <div className={styles.lightPreviewHeader}>Light Theme</div>
            </div>
            
            {cardExamples.map((cardExample) => (
              <div key={cardExample.id} className={styles.previewGroup}>
                <div className={styles.previewTitle}>
                  {cardExample.title}
                </div>
                
                {/* Dark Theme Card */}
                <div 
                  className={styles.themePreview}
                  style={{
                    backgroundColor: customTokens['--background-primary-dark'] || '#1a1a1a',
                    padding: '1rem',
                    borderRadius: '0.5rem'
                  }}
                >
                  <div 
                    className={`${styles.previewCard} ${styles.darkTheme}`}
                    style={{
                      backgroundColor: customTokens['--background-secondary-dark'] || '#2d2d2d',
                      color: customTokens['--text-primary-dark'] || '#ffffff',
                      borderColor: customTokens['--border-dark'] || '#404040',
                      borderRadius: customTokens['--border-radius-md'] || '0.5rem',
                      boxShadow: customTokens['--shadow-md'] || '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                      fontSize: customTokens['--font-size-base'] || '1rem',
                      lineHeight: customTokens['--line-height-normal'] || '1.5'
                    }}
                  >
                    <div className={styles.cardHeader}>
                      <h4 style={{ 
                        color: customTokens['--text-primary-dark'] || '#ffffff',
                        fontSize: customTokens['--font-size-lg'] || '1.125rem'
                      }}>
                        {cardExample.title}
                      </h4>
                      {cardExample.hasImage && (
                        <div 
                          className={styles.cardImage}
                          style={{
                            backgroundColor: customTokens['--overlay-dark'] || 'rgba(0,0,0,0.7)'
                          }}
                        >
                          <div 
                            className={styles.imagePlaceholder}
                            style={{ color: customTokens['--text-secondary-dark'] || '#cccccc' }}
                          >
                            📷
                          </div>
                        </div>
                      )}
                    </div>
                    <div 
                      className={styles.cardContent}
                      style={{ color: customTokens['--text-primary-dark'] || '#ffffff' }}
                    >
                      <p>{sampleCard.excerpt}</p>
                    </div>
                    <div 
                      className={styles.cardFooter}
                      style={{ color: customTokens['--text-secondary-dark'] || '#cccccc' }}
                    >
                      <span className={styles.cardType}>Story</span>
                      <span className={styles.cardMode}>Dark</span>
                    </div>
                  </div>
                </div>

                {/* Light Theme Card */}
                <div 
                  className={styles.themePreview}
                  style={{
                    backgroundColor: customTokens['--background-primary-light'] || '#ffffff',
                    padding: '1rem',
                    borderRadius: '0.5rem'
                  }}
                >
                  <div 
                    className={`${styles.previewCard} ${styles.lightTheme}`}
                    style={{
                      backgroundColor: customTokens['--background-secondary-light'] || '#f5f5f5',
                      color: customTokens['--text-primary-light'] || '#1a1a1a',
                      borderColor: customTokens['--border-light'] || '#e0e0e0',
                      borderRadius: customTokens['--border-radius-md'] || '0.5rem',
                      boxShadow: customTokens['--shadow-md'] || '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                      fontSize: customTokens['--font-size-base'] || '1rem',
                      lineHeight: customTokens['--line-height-normal'] || '1.5'
                    }}
                  >
                    <div className={styles.cardHeader}>
                      <h4 style={{ 
                        color: customTokens['--text-primary-light'] || '#1a1a1a',
                        fontSize: customTokens['--font-size-lg'] || '1.125rem'
                      }}>
                        {cardExample.title}
                      </h4>
                      {cardExample.hasImage && (
                        <div 
                          className={styles.cardImage}
                          style={{
                            backgroundColor: customTokens['--overlay-dark'] || 'rgba(0,0,0,0.7)'
                          }}
                        >
                          <div 
                            className={styles.imagePlaceholder}
                            style={{ color: customTokens['--text-secondary-light'] || '#666666' }}
                          >
                            📷
                          </div>
                        </div>
                      )}
                    </div>
                    <div 
                      className={styles.cardContent}
                      style={{ color: customTokens['--text-primary-light'] || '#1a1a1a' }}
                    >
                      <p>{sampleCard.excerpt}</p>
                    </div>
                    <div 
                      className={styles.cardFooter}
                      style={{ color: customTokens['--text-secondary-light'] || '#666666' }}
                    >
                      <span className={styles.cardType}>Story</span>
                      <span className={styles.cardMode}>Light</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
} 