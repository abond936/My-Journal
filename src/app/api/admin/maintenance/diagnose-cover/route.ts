import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/authOptions';
import { isAdminSession } from '@/lib/auth/readerAccess';
import { diagnoseCoverImage } from '@/lib/scripts/dev/diagnose-cover-image';
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
    const cardTitle = typeof body.cardTitle === 'string' ? body.cardTitle.trim() : undefined;

    if (!cardTitle) {
      return errorResponse(
        {
          ok: false,
          code: 'MAINTENANCE_DIAGNOSE_CARD_TITLE_REQUIRED',
          message: 'cardTitle is required.',
          severity: 'error',
          retryable: false,
        },
        400
      );
    }

    const result = await diagnoseCoverImage(cardTitle);
    return NextResponse.json({ result });
  } catch (error) {
    console.error('[/api/admin/maintenance/diagnose-cover] Error:', safeMaintenanceErrorMessage(error));
    return errorResponse(
      {
        ok: false,
        code: 'MAINTENANCE_DIAGNOSE_FAILED',
        message: 'Diagnose cover failed.',
        severity: 'error',
        retryable: true,
        error: safeMaintenanceErrorMessage(error),
      },
      500
    );
  }
}
