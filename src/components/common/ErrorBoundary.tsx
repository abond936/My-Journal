import React from 'react';
import { AppError, isAppError } from '@/lib/types/error';
import styles from './ErrorBoundary.module.css';

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode | ((error: Error, reset: () => void) => React.ReactNode);
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  onReset?: () => void;
  // Optional className for styling the error container
  className?: string;
}

interface State {
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

/**
 * Default error fallback component
 */
function DefaultErrorFallback({ 
  error, 
  reset 
}: { 
  error: Error; 
  reset: () => void;
}) {
  const isDev = process.env.NODE_ENV === 'development';
  const isAppErr = isAppError(error);

  return (
    <div className={styles.errorContainer} role="alert">
      <div className={styles.errorContent}>
        <h3 className={styles.errorTitle}>
          {isAppErr ? error.message : 'Something went wrong'}
        </h3>
        
        {isDev && (
          <details className={styles.errorDetails}>
            <summary>Technical Details</summary>
            <pre className={styles.errorStack}>
              {error.message}
              {error.stack}
              {isAppErr && JSON.stringify(error.details, null, 2)}
            </pre>
          </details>
        )}

        <button 
          onClick={reset}
          className={styles.retryButton}
        >
          Try Again
        </button>
      </div>
    </div>
  );
}

/**
 * A React error boundary component that can be gradually adopted.
 * Provides fallback UI and error reporting without affecting existing components.
 */
export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { 
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return { 
      error,
      errorInfo: null
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({ errorInfo });

    // Log error with context
    console.error('[ErrorBoundary] Caught error:', {
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
        ...(isAppError(error) ? { 
          code: error.code, 
          details: error.details 
        } : {})
      },
      componentStack: errorInfo.componentStack
    });

    // Call error handler if provided
    this.props.onError?.(error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ error: null, errorInfo: null });
    this.props.onReset?.();
  };

  render() {
    const { error } = this.state;
    const { fallback, children, className } = this.props;

    if (error) {
      // Use custom fallback if provided
      if (fallback) {
        if (typeof fallback === 'function') {
          return fallback(error, this.handleReset);
        }
        return fallback;
      }

      // Use default fallback
      return (
        <div className={className}>
          <DefaultErrorFallback 
            error={error} 
            reset={this.handleReset} 
          />
        </div>
      );
    }

    return children;
  }
}

/**
 * HOC to wrap a component with an error boundary.
 * Allows gradual adoption without modifying existing components.
 */
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  options: Omit<Props, 'children'> = {}
) {
  return function WithErrorBoundary(props: P) {
    return (
      <ErrorBoundary {...options}>
        <Component {...props} />
      </ErrorBoundary>
    );
  };
}

/**
 * Hook to create an error boundary wrapper for async operations
 * Useful for handling errors in event handlers and effects
 */
export function useErrorBoundary() {
  const [error, setError] = React.useState<Error | null>(null);

  const boundaryError = React.useMemo(() => {
    if (!error) return null;
    if (isAppError(error)) return error;
    return new AppError(
      'INTERNAL_ERROR',
      error.message,
      { originalError: error }
    );
  }, [error]);

  if (boundaryError) {
    throw boundaryError;
  }

  return setError;
} 