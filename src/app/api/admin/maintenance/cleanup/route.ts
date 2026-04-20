import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/authOptions';
import { cleanupMediaCollection } from '@/lib/scripts/firebase/cleanup-media-collection';

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
    const body = await request.json().catch(() => ({}));
    const dryRun = body.dryRun === true;

    const report = await cleanupMediaCollection(dryRun);
    return NextResponse.json({ report });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'An unknown error occurred';
    console.error('[/api/admin/maintenance/cleanup] Error:', error);
    return errorResponse(
      {
        ok: false,
        code: 'MAINTENANCE_CLEANUP_FAILED',
        message: 'Cleanup failed.',
        severity: 'error',
        retryable: true,
        error: message,
      },
      500
    );
  }
}
