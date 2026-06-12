import { NextResponse } from 'next/server';
import type { Session } from 'next-auth';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/authOptions';
import type { InputCapError } from '@/lib/api/inputCaps';
import { AppError, ErrorCode, getStatusCodeForError, isAppError } from '@/lib/types/error';

/** Standard `{ ok: false, ... }` envelope used by admin/list routes and MediaProvider clients. */
export type ApiRouteErrorPayload = {
  ok: false;
  code: string;
  message: string;
  severity: 'error' | 'warning';
  retryable: boolean;
  error?: string;
  details?: string[];
};

export type ApiRouteAuthMode = 'admin' | 'authenticated';

type ApiRouteErrorInput = {
  code: string;
  message: string;
  status: number;
  severity?: 'error' | 'warning';
  retryable?: boolean;
  error?: string;
  details?: string[];
};

export function apiRouteError(input: ApiRouteErrorInput): NextResponse {
  const payload: ApiRouteErrorPayload = {
    ok: false,
    code: input.code,
    message: input.message,
    severity: input.severity ?? 'error',
    retryable: input.retryable ?? false,
    ...(input.error ? { error: input.error } : {}),
    ...(input.details?.length ? { details: input.details } : {}),
  };
  return NextResponse.json(payload, { status: input.status });
}

export function apiRouteSuccess<T>(data: T, status = 200): NextResponse {
  return NextResponse.json(data, { status });
}

export async function requireApiSession(
  mode: ApiRouteAuthMode
): Promise<{ session: Session } | { error: NextResponse }> {
  const session = await getServerSession(authOptions);

  if (mode === 'admin') {
    if (session?.user?.role !== 'admin') {
      return {
        error: apiRouteError({
          code: 'AUTH_FORBIDDEN',
          message: session ? 'Forbidden.' : 'Unauthorized.',
          status: 403,
          retryable: false,
        }),
      };
    }
    return { session };
  }

  if (!session) {
    return {
      error: apiRouteError({
        code: 'AUTH_UNAUTHORIZED',
        message: 'Authentication required.',
        status: 401,
        retryable: false,
      }),
    };
  }

  return { session };
}

export function apiRouteListLimitError(limitError: InputCapError): NextResponse {
  return apiRouteError({
    code: limitError.code,
    message: limitError.message,
    status: 400,
    retryable: false,
  });
}

export function apiRouteInputCapError(
  capError: InputCapError,
  opts: {
    code: string;
    status?: number;
    severity?: 'error' | 'warning';
    retryable?: boolean;
  }
): NextResponse {
  return apiRouteError({
    code: opts.code,
    message: capError.message,
    status: opts.status ?? 400,
    severity: opts.severity ?? 'error',
    retryable: opts.retryable ?? false,
  });
}

export function apiRouteInternalError(
  code: string,
  message: string,
  cause?: unknown
): NextResponse {
  const detail = cause instanceof Error ? cause.message : cause ? String(cause) : undefined;
  return apiRouteError({
    code,
    message,
    status: 500,
    retryable: true,
    ...(detail ? { error: detail } : {}),
  });
}

export async function withApiRouteHandler<TRequest extends Request>(
  request: TRequest,
  options: {
    auth: ApiRouteAuthMode;
    internalError?: { code: string; message: string };
  },
  handler: (ctx: { session: Session; request: TRequest }) => Promise<NextResponse>
): Promise<NextResponse> {
  const auth = await requireApiSession(options.auth);
  if ('error' in auth) {
    return auth.error;
  }

  try {
    return await handler({ session: auth.session, request });
  } catch (error) {
    console.error('[API route error]:', error);

    if (isAppError(error)) {
      return apiRouteError({
        code: error.code,
        message: error.message,
        status: getStatusCodeForError(error.code),
        retryable:
          error.code === ErrorCode.INTERNAL_ERROR ||
          error.code === ErrorCode.DATABASE_ERROR ||
          error.code === ErrorCode.EXTERNAL_SERVICE_ERROR,
        error: error.message,
      });
    }

    return apiRouteInternalError(
      options.internalError?.code ?? 'INTERNAL_ERROR',
      options.internalError?.message ?? 'Internal server error.',
      error
    );
  }
}
