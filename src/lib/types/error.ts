// Error codes enum for standardized error identification
export enum ErrorCode {
  // Client-side errors (400 range)
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  NOT_FOUND = 'NOT_FOUND',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  CONFLICT = 'CONFLICT',
  
  // Server-side errors (500 range)
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  EXTERNAL_SERVICE_ERROR = 'EXTERNAL_SERVICE_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  
  // Custom application errors
  MEDIA_PROCESSING_ERROR = 'MEDIA_PROCESSING_ERROR',
  TAG_OPERATION_ERROR = 'TAG_OPERATION_ERROR',

  /** Curated collection `childrenIds` would create a parent/child cycle. */
  CURATED_COLLECTION_CYCLE = 'CURATED_COLLECTION_CYCLE',
  /** A new `childrenIds` entry references a missing card document. */
  CURATED_COLLECTION_CHILD_NOT_FOUND = 'CURATED_COLLECTION_CHILD_NOT_FOUND',
}

// Standard API error response interface
export interface ApiError {
  code: ErrorCode;
  message: string;
  details?: Record<string, any>;
  stack?: string; // Only included in development
  
  // Legacy fields for backward compatibility
  error?: string;
  detailedError?: string;
}

// Custom error class that maintains compatibility with standard Error
export class AppError extends Error {
  constructor(
    public code: ErrorCode,
    message: string,
    public details?: Record<string, any>
  ) {
    super(message);
    this.name = 'AppError';
  }

  // Convert to standard API error response
  toApiResponse(): ApiError {
    return {
      code: this.code,
      message: this.message,
      details: this.details,
      // Legacy fields for backward compatibility
      error: this.message,
      detailedError: this.details ? JSON.stringify(this.details) : undefined,
      // Only include stack in development
      ...(process.env.NODE_ENV === 'development' ? { stack: this.stack } : {})
    };
  }

  // Helper to create error from existing Error object
  static fromError(error: Error, code: ErrorCode = ErrorCode.INTERNAL_ERROR): AppError {
    return new AppError(
      code,
      error.message,
      { originalError: error.name }
    );
  }
}

// Type guard to check if an error is an AppError
export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

// Helper to get HTTP status code for error codes
export function getStatusCodeForError(code: ErrorCode): number {
  switch (code) {
    case ErrorCode.VALIDATION_ERROR:
      return 400;
    case ErrorCode.NOT_FOUND:
    case ErrorCode.CURATED_COLLECTION_CHILD_NOT_FOUND:
      return 404;
    case ErrorCode.UNAUTHORIZED:
      return 401;
    case ErrorCode.FORBIDDEN:
      return 403;
    case ErrorCode.CONFLICT:
    case ErrorCode.CURATED_COLLECTION_CYCLE:
      return 409;
    case ErrorCode.EXTERNAL_SERVICE_ERROR:
    case ErrorCode.MEDIA_PROCESSING_ERROR:
      return 502;
    case ErrorCode.DATABASE_ERROR:
    case ErrorCode.TAG_OPERATION_ERROR:
    case ErrorCode.INTERNAL_ERROR:
    default:
      return 500;
  }
} 