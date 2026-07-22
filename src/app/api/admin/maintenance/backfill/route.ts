import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/authOptions';
import { isAdminSession } from '@/lib/auth/readerAccess';
import { backfillMediaMetadata } from '@/lib/scripts/firebase/backfill-media-metadata';
import { safeMaintenanceErrorMessage } from '@/lib/scripts/utils/safeMaintenanceLog';

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
  if (!isAdminSession(session)) {
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

    const report = await backfillMediaMetadata(dryRun);
    return NextResponse.json({ report });
  } catch (error) {
    console.error('[/api/admin/maintenance/backfill] Error:', safeMaintenanceErrorMessage(error));
    return errorResponse(
      {
        ok: false,
        code: 'MAINTENANCE_BACKFILL_FAILED',
        message: 'Backfill failed.',
        severity: 'error',
        retryable: true,
        error: safeMaintenanceErrorMessage(error),
      },
      500
    );
  }
}
