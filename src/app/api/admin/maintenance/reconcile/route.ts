import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/authOptions';
import { runDiagnostics, runReconciliation } from '@/lib/scripts/firebase/reconcile-media-cards';

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
    const action = body.action as 'diagnose' | 'fix' | undefined;
    const dryRun = body.dryRun === true;
    const cardTitleFilter = typeof body.cardTitleFilter === 'string' ? body.cardTitleFilter : undefined;
    const checkStorage = body.checkStorage === true;

    if (!action || !['diagnose', 'fix'].includes(action)) {
      return errorResponse(
        {
          ok: false,
          code: 'MAINTENANCE_RECONCILE_ACTION_INVALID',
          message: 'action is required and must be "diagnose" or "fix".',
          severity: 'error',
          retryable: false,
        },
        400
      );
    }

    const report = await runDiagnostics({ cardTitleFilter, checkStorage });

    if (action === 'diagnose') {
      return NextResponse.json({ report });
    }

    const after = await runReconciliation(report, dryRun);
    return NextResponse.json({ report, after });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'An unknown error occurred';
    console.error('[/api/admin/maintenance/reconcile] Error:', error);
    return errorResponse(
      {
        ok: false,
        code: 'MAINTENANCE_RECONCILE_FAILED',
        message: 'Reconcile failed.',
        severity: 'error',
        retryable: true,
        error: message,
      },
      500
    );
  }
}
