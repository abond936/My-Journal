import { NextRequest, NextResponse } from 'next/server';
import { AppError, ErrorCode, isAppError, getStatusCodeForError } from '@/lib/types/error';
import { ZodError } from 'zod';

interface ErrorContext {
  method: string;
  path: string;
  query?: Record<string, string>;
  body?: unknown;
}

/**
 * Wraps a route handler with standardized error handling.
 * This can be used optionally without affecting existing routes.
 */
export async function withErrorHandler(
  request: NextRequest,
  handler: (req: NextRequest) => Promise<NextResponse>
): Promise<NextResponse> {
  try {
    return await handler(request);
  } catch (error) {
    const errorContext: ErrorContext = {
      method: request.method,
      path: request.nextUrl.pathname,
      query: Object.fromEntries(request.nextUrl.searchParams),
    };

    // Try to parse body if it's JSON
    if (request.headers.get('content-type')?.includes('application/json')) {
      try {
        const clonedRequest = request.clone();
        errorContext.body = await clonedRequest.json();
      } catch {
        // Ignore body parsing errors
      }
    }

    // Log the error with context
    console.error('[API Error]:', {
      ...errorContext,
      error: error instanceof Error ? {
        name: error.name,
        message: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      } : error
    });

    // Handle AppError instances
    if (isAppError(error)) {
      return NextResponse.json(
        error.toApiResponse(),
        { status: getStatusCodeForError(error.code) }
      );
    }

    // Handle Zod validation errors
    if (error instanceof ZodError) {
      const validationError = new AppError(
        ErrorCode.VALIDATION_ERROR,
        'Validation failed',
        { issues: error.issues }
      );
      return NextResponse.json(
        validationError.toApiResponse(),
        { status: 400 }
      );
    }

    // Handle Firebase errors
    if (error?.name === 'FirebaseError') {
      // Map Firebase error codes to our error codes
      const firebaseError = error as { code: string; message: string };
      let errorCode = ErrorCode.INTERNAL_ERROR;
      
      switch (firebaseError.code) {
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

      const mappedError = new AppError(
        errorCode,
        firebaseError.message,
        { originalError: firebaseError.code }
      );

      return NextResponse.json(
        mappedError.toApiResponse(),
        { status: getStatusCodeForError(errorCode) }
      );
    }

    // Handle unexpected errors
    const internalError = new AppError(
      ErrorCode.INTERNAL_ERROR,
      error instanceof Error ? error.message : 'An unexpected error occurred',
      process.env.NODE_ENV === 'development' ? { originalError: error } : undefined
    );

    return NextResponse.json(
      internalError.toApiResponse(),
      { status: 500 }
    );
  }
}

/**
 * Creates a new response with error details.
 * Can be used directly without the middleware for gradual adoption.
 */
export function createErrorResponse(error: unknown): NextResponse {
  if (isAppError(error)) {
    return NextResponse.json(
      error.toApiResponse(),
      { status: getStatusCodeForError(error.code) }
    );
  }

  const internalError = new AppError(
    ErrorCode.INTERNAL_ERROR,
    error instanceof Error ? error.message : 'An unexpected error occurred'
  );

  return NextResponse.json(
    internalError.toApiResponse(),
    { status: 500 }
  );
} 