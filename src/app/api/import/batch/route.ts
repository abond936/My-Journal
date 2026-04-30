import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/authOptions';
import { batchImportMediaOnly } from '@/lib/services/importFolderAsCard';

type ApiErrorPayload = {
  ok: false;
  code: string;
  message: string;
  severity: 'error' | 'warning';
  retryable: boolean;
  error?: string;
};

function errorResponse(payload: ApiErrorPayload, status: number) {
  return NextResponse.json(payload, { status });
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== 'admin') {
    return errorResponse(
      {
        ok: false,
        code: 'AUTH_FORBIDDEN',
        message: 'Forbidden.',
        severity: 'error',
        retryable: false,
      },
      403
    );
  }

  try {
    const body = await request.json();
    const rootPath = body.rootPath as string | undefined;

    if (!rootPath || typeof rootPath !== 'string') {
      return errorResponse(
        {
          ok: false,
          code: 'IMPORT_BATCH_ROOT_REQUIRED',
          message: 'rootPath is required.',
          severity: 'error',
          retryable: false,
        },
        400
      );
    }

    const result = await batchImportMediaOnly(rootPath);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'An unknown error occurred';
    console.error('[/api/import/batch] Error:', error);
    return errorResponse(
      {
        ok: false,
        code: 'IMPORT_BATCH_FAILED',
        message: 'Batch import failed.',
        severity: 'error',
        retryable: true,
        error: message,
      },
      500
    );
  }
}
