import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/authOptions';
import { importFolderAsCard, importFolderAsMediaOnly } from '@/lib/services/importFolderAsCard';

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
    const folderPath = body.folderPath as string | undefined;
    const overwriteCardId = body.overwriteCardId as string | undefined;
    const mediaOnly = body.mediaOnly === true;

    if (!folderPath || typeof folderPath !== 'string') {
      return errorResponse(
        {
          ok: false,
          code: 'IMPORT_FOLDER_PATH_REQUIRED',
          message: 'folderPath is required.',
          severity: 'error',
          retryable: false,
        },
        400
      );
    }

    if (mediaOnly) {
      const result = await importFolderAsMediaOnly(folderPath);
      return NextResponse.json(result);
    }

    const result = await importFolderAsCard(folderPath, {
      overwriteCardId: overwriteCardId || undefined,
    });

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'An unknown error occurred';
    console.error('[/api/import/folder] Error:', error);
    return errorResponse(
      {
        ok: false,
        code: 'IMPORT_FOLDER_FAILED',
        message: 'Error importing folder.',
        severity: 'error',
        retryable: true,
        error: message,
      },
      500
    );
  }
}
