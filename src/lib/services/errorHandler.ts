import { AppError, ErrorCode, isAppError } from '@/lib/types/error';
import { ZodError } from 'zod';
import { FirebaseError } from 'firebase/app';

interface ErrorHandlerOptions {
  context: string;
  transformError?: (error: unknown) => AppError;
  shouldRethrow?: boolean;
}

interface ErrorLogContext {
  service: string;
  operation: string;
  input?: unknown;
}

/**
 * Maps Firebase error codes to our application error codes
 */
function mapFirebaseError(error: FirebaseError): AppError {
  let errorCode = ErrorCode.INTERNAL_ERROR;
  
  switch (error.code) {
    case 'permission-denied':
      errorCode = ErrorCode.FORBIDDEN;
      break;
    case 'not-found':
      errorCode = ErrorCode.NOT_FOUND;
      break;
    case 'already-exists':
      errorCode = ErrorCode.CONFLICT;
      break;
    case 'failed-precondition':
      errorCode = ErrorCode.VALIDATION_ERROR;
      break;
    case 'unavailable':
      errorCode = ErrorCode.DATABASE_ERROR;
      break;
  }

  return new AppError(
    errorCode,
    error.message,
    { originalError: error.code }
  );
}

/**
 * Wraps a service operation with standardized error handling.
 * Can be used gradually without affecting existing service methods.
 */
export async function withErrorHandling<T>(
  operation: () => Promise<T>,
  options: ErrorHandlerOptions
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    // If it's already an AppError, just re-throw it
    if (isAppError(error)) {
      throw error;
    }

    const errorContext: ErrorLogContext = {
      service: options.context.split('/')[0],
      operation: options.context.split('/')[1] || 'unknown',
    };

    // Log the error with context
    console.error(`[Service Error] ${options.context}:`, {
      ...errorContext,
      error: error instanceof Error ? {
        name: error.name,
        message: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      } : error
    });

    // Use custom error transformer if provided
    if (options.transformError) {
      throw options.transformError(error);
    }

    // Handle specific error types
    let appError: AppError;

    if (error instanceof FirebaseError) {
      appError = mapFirebaseError(error);
    } else if (error instanceof ZodError) {
      appError = new AppError(
        ErrorCode.VALIDATION_ERROR,
        'Validation failed',
        { issues: error.issues }
      );
    } else if (error instanceof Error) {
      appError = AppError.fromError(error);
    } else {
      appError = new AppError(
        ErrorCode.INTERNAL_ERROR,
        'An unexpected error occurred',
        { context: options.context }
      );
    }

    throw appError;
  }
}

/**
 * Creates a wrapped version of a service function with error handling.
 * Useful for gradually migrating existing service functions.
 */
export function withServiceErrorHandling<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  context: string,
  options: Omit<ErrorHandlerOptions, 'context'> = {}
): T {
  return (async (...args: Parameters<T>) => {
    return withErrorHandling(
      () => fn(...args),
      { ...options, context }
    );
  }) as T;
}

/**
 * Helper to create error responses for service operations.
 * Can be used directly without the wrapper for gradual adoption.
 */
export function createServiceError(
  error: unknown,
  context: string
): AppError {
  if (isAppError(error)) {
    return error;
  }

  if (error instanceof FirebaseError) {
    return mapFirebaseError(error);
  }

  if (error instanceof ZodError) {
    return new AppError(
      ErrorCode.VALIDATION_ERROR,
      'Validation failed',
      { issues: error.issues }
    );
  }

  if (error instanceof Error) {
    return AppError.fromError(error);
  }

  return new AppError(
    ErrorCode.INTERNAL_ERROR,
    'An unexpected error occurred',
    { context }
  );
} 