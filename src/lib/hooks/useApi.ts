import { useState, useCallback, useRef, useEffect } from 'react';
import { AppError, ErrorCode, isAppError } from '@/lib/types/error';

interface ApiState<T> {
  data: T | null;
  error: AppError | null;
  isLoading: boolean;
  isValidating: boolean;
}

interface ApiOptions<T> {
  onSuccess?: (data: T) => void;
  onError?: (error: AppError) => void;
  onSettled?: () => void;
  transform?: (data: any) => T;
  // Retry options
  retry?: number | boolean;
  retryDelay?: number;
  // Cache options
  cacheTime?: number;
  staleTime?: number;
}

interface ApiCache<T> {
  data: T;
  lastUpdated: number;
}

const defaultOptions: Partial<ApiOptions<any>> = {
  retry: 1,
  retryDelay: 1000,
  cacheTime: 5 * 60 * 1000, // 5 minutes
  staleTime: 30 * 1000, // 30 seconds
};

// Global cache for API responses
const apiCache = new Map<string, ApiCache<any>>();

/**
 * Custom hook for making API calls with standardized error handling.
 * Provides caching, retries, and type-safe responses.
 */
export function useApi<T>(key?: string, initialData: T | null = null) {
  const [state, setState] = useState<ApiState<T>>({
    data: initialData,
    error: null,
    isLoading: false,
    isValidating: false
  });

  const retryCountRef = useRef(0);
  const activeRequestRef = useRef<AbortController | null>(null);

  // Clear previous request if component unmounts
  useEffect(() => {
    return () => {
      activeRequestRef.current?.abort();
    };
  }, []);

  const execute = useCallback(async <R = T>(
    promise: Promise<R>,
    options: ApiOptions<R> = {}
  ) => {
    const mergedOptions = { ...defaultOptions, ...options };
    const cacheKey = key || '';

    // Abort previous request if exists
    activeRequestRef.current?.abort();
    const abortController = new AbortController();
    activeRequestRef.current = abortController;

    setState(prev => ({ 
      ...prev, 
      isLoading: !prev.data, 
      isValidating: !!prev.data,
      error: null 
    }));

    try {
      // Check cache first
      if (cacheKey && mergedOptions.cacheTime) {
        const cached = apiCache.get(cacheKey);
        if (cached && Date.now() - cached.lastUpdated < mergedOptions.staleTime!) {
          setState(prev => ({ 
            ...prev, 
            data: cached.data as unknown as T,
            isLoading: false,
            isValidating: false
          }));
          mergedOptions.onSuccess?.(cached.data);
          return cached.data;
        }
      }

      const response = await promise;
      const data = mergedOptions.transform ? mergedOptions.transform(response) : response;

      // Update cache
      if (cacheKey && mergedOptions.cacheTime) {
        apiCache.set(cacheKey, {
          data,
          lastUpdated: Date.now()
        });

        // Set cache cleanup
        setTimeout(() => {
          apiCache.delete(cacheKey);
        }, mergedOptions.cacheTime);
      }

      setState({ 
        data: data as unknown as T, 
        error: null, 
        isLoading: false,
        isValidating: false
      });
      
      mergedOptions.onSuccess?.(data);
      return data;
    } catch (error) {
      // Don't handle if request was aborted
      if (error instanceof Error && error.name === 'AbortError') {
        return;
      }

      const appError = isAppError(error)
        ? error
        : new AppError(
            ErrorCode.INTERNAL_ERROR,
            error instanceof Error ? error.message : 'An unexpected error occurred'
          );

      // Handle retries
      if (
        mergedOptions.retry &&
        retryCountRef.current < (typeof mergedOptions.retry === 'number' ? mergedOptions.retry : 1)
      ) {
        retryCountRef.current++;
        await new Promise(resolve => setTimeout(resolve, mergedOptions.retryDelay));
        return execute(promise, options);
      }

      setState({ 
        data: null, 
        error: appError, 
        isLoading: false,
        isValidating: false
      });
      
      mergedOptions.onError?.(appError);
      throw appError;
    } finally {
      mergedOptions.onSettled?.();
      activeRequestRef.current = null;
      retryCountRef.current = 0;
    }
  }, [key]);

  const reset = useCallback(() => {
    setState({ 
      data: initialData, 
      error: null, 
      isLoading: false,
      isValidating: false
    });
  }, [initialData]);

  const invalidate = useCallback(() => {
    if (key) {
      apiCache.delete(key);
    }
  }, [key]);

  return {
    ...state,
    execute,
    reset,
    invalidate
  };
}

/**
 * Helper function to create a type-safe API request function.
 * Can be used to gradually migrate existing API calls.
 */
export function createApiRequest<T, P extends any[]>(
  requestFn: (...args: P) => Promise<T>,
  options: Omit<ApiOptions<T>, 'onSettled'> = {}
) {
  return async (...args: P): Promise<T> => {
    try {
      const response = await requestFn(...args);
      const data = options.transform ? options.transform(response) : response;
      options.onSuccess?.(data);
      return data;
    } catch (error) {
      const appError = isAppError(error)
        ? error
        : new AppError(
            ErrorCode.INTERNAL_ERROR,
            error instanceof Error ? error.message : 'An unexpected error occurred'
          );
      
      options.onError?.(appError);
      throw appError;
    }
  };
} 