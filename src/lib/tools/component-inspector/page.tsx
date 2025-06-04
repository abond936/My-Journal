'use client';

import React, { useState, useEffect } from 'react';
import styles from './ComponentInspector.module.css';

interface ComponentInfo {
  path: string;
  name: string;
  hasStyles: boolean;
  hasTests: boolean;
}

interface ComponentError {
  componentPath: string;
  error: string;
  stack?: string;
}

// Helper function to normalize paths
const normalizePath = (path: string) => path.replace(/\\/g, '/');

// Helper function to map old paths to new paths
const mapComponentPath = (path: string) => {
  const normalizedPath = normalizePath(path);
  
  // Map old paths to new paths
  const pathMappings: { [key: string]: string } = {
    'cards/CardGrid': 'view/CardGrid',
    'common/ContentCard': 'view/ContentCard',
    'common/editor/ImageUploadDialog': 'common/ImageUploadDialog',
    'common/editor/RichTextEditor': 'common/RichTextEditor',
    'features/album/AlbumView': 'view/album-view/AlbumView',
    'features/entry/EntryForm': 'admin/entry-admin/EntryForm',
    'features/entry/EntryTemplate': 'view/entry-view/EntryTemplate',
    'features/entry/EntryPage': 'view/entry-view/EntryPage',
    'features/entry/EntryCard': 'view/entry-view/EntryCard',
    'features/tags/TagNavigation': 'common/TagNavigation',
    'features/tags/TagBox': 'common/TagBox',
    'features/tags/TagBoxGrid': 'common/TagBoxGrid',
    'navigation/Navigation': 'common/Navigation',
    'navigation/SlideOutNavigation': 'view/SlideOutNavigation',
    'navigation/AdminSidebar': 'admin/AdminSidebar',
    'navigation/AdminFAB': 'admin/AdminFAB',
    'navigation/LifeStagesSidebar': 'common/TagTree'
  };

  return pathMappings[normalizedPath] || normalizedPath;
};

class ErrorBoundary extends React.Component<
  { children: React.ReactNode; onError: (error: Error) => void },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode; onError: (error: Error) => void }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    this.props.onError(error);
  }

  render() {
    if (this.state.hasError) {
      return null;
    }
    return this.props.children;
  }
}

export default function ComponentInspector() {
  const [components, setComponents] = useState<ComponentInfo[]>([]);
  const [selectedComponent, setSelectedComponent] = useState<string | null>(null);
  const [componentModule, setComponentModule] = useState<any>(null);
  const [errors, setErrors] = useState<ComponentError[]>([]);

  useEffect(() => {
    // Load component list
    const loadComponents = async () => {
      const response = await fetch('/api/components');
      const data = await response.json();
      // Normalize paths in component list
      setComponents(data.map((comp: ComponentInfo) => ({
        ...comp,
        path: normalizePath(comp.path)
      })));
    };
    loadComponents();

    // Check for errors every 5 seconds
    const errorCheckInterval = setInterval(async () => {
      try {
        const response = await fetch('/api/component-errors');
        const loggedErrors = await response.json();
        // Normalize paths in errors
        setErrors(loggedErrors.map((err: ComponentError) => ({
          ...err,
          componentPath: normalizePath(err.componentPath)
        })));
      } catch (e) {
        console.error('Failed to fetch errors:', e);
      }
    }, 5000);

    return () => clearInterval(errorCheckInterval);
  }, []);

  const logError = async (error: ComponentError) => {
    try {
      await fetch('/api/component-errors', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...error,
          componentPath: normalizePath(error.componentPath)
        }),
      });
    } catch (e) {
      console.error('Failed to log error:', e);
    }
  };

  const handleError = (error: Error) => {
    if (selectedComponent) {
      const componentError = {
        componentPath: normalizePath(selectedComponent),
        error: error.message,
        stack: error.stack
      };
      setErrors(prev => [...prev, componentError]);
      logError(componentError);
    }
  };

  const loadComponent = async (path: string) => {
    const normalizedPath = normalizePath(path);
    const mappedPath = mapComponentPath(normalizedPath);
    
    try {
      setErrors(prev => prev.filter(e => normalizePath(e.componentPath) !== normalizedPath));
      console.log('Loading component from:', `@/components/${mappedPath}`);
      const module = await import(`@/components/${mappedPath}`);
      console.log('Loaded module:', module);
      
      // Check for both default and named exports
      const Component = module.default || module[Object.keys(module)[0]];
      
      if (!Component) {
        throw new Error(`Component not found or not properly exported: ${mappedPath}`);
      }
      
      setComponentModule({ default: Component });
      setSelectedComponent(normalizedPath);
    } catch (error) {
      console.error('Failed to load component:', error);
      if (error instanceof Error) {
        const componentError = {
          componentPath: normalizedPath,
          error: error.message,
          stack: error.stack
        };
        setErrors(prev => [...prev, componentError]);
        logError(componentError);
      }
      setComponentModule(null);
      setSelectedComponent(normalizedPath);
    }
  };

  const componentErrors = errors.filter(e => normalizePath(e.componentPath) === selectedComponent);

  return (
    <div className={styles.container}>
      <div className={styles.sidebar}>
        <h2>Components</h2>
        <div className={styles.componentList}>
          {components.map((comp) => (
            <div
              key={comp.path}
              className={`${styles.componentItem} ${
                selectedComponent === comp.path ? styles.selected : ''
              } ${errors.some(e => normalizePath(e.componentPath) === comp.path) ? styles.hasError : ''}`}
              onClick={() => loadComponent(comp.path)}
            >
              <div className={styles.componentName}>{comp.name}</div>
              <div className={styles.componentPath}>{comp.path}</div>
              {comp.hasStyles && <span className={styles.badge}>CSS</span>}
              {comp.hasTests && <span className={styles.badge}>Tests</span>}
              {errors.some(e => normalizePath(e.componentPath) === comp.path) && (
                <span className={styles.errorBadge}>Error</span>
              )}
            </div>
          ))}
        </div>
      </div>
      <div className={styles.preview}>
        {selectedComponent ? (
          <div>
            <h3>Component: {selectedComponent}</h3>
            {componentErrors.length > 0 ? (
              <div className={styles.error}>
                <h4>Component Errors:</h4>
                {componentErrors.map((err, index) => (
                  <div key={index} className={styles.errorItem}>
                    <pre>{err.error}</pre>
                    {err.stack && (
                      <details>
                        <summary>Stack Trace</summary>
                        <pre>{err.stack}</pre>
                      </details>
                    )}
                  </div>
                ))}
              </div>
            ) : componentModule?.default ? (
              <div className={styles.componentPreview}>
                <ErrorBoundary onError={handleError}>
                  {React.createElement(componentModule.default, {
                    id: 'preview',
                    title: 'Preview Card',
                    href: '#',
                    type: 'entry',
                    description: 'This is a preview card in the component inspector'
                  })}
                </ErrorBoundary>
              </div>
            ) : (
              <div className={styles.error}>Failed to load component</div>
            )}
          </div>
        ) : (
          <div className={styles.noSelection}>Select a component to preview</div>
        )}
      </div>
    </div>
  );
} 