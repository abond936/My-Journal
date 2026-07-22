import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/authOptions';
import { isAdminSession } from '@/lib/auth/readerAccess';
import { runPairedBackup } from '@/lib/scripts/firebase/backup-run';
import {
  getBackupOperationsStatus,
  getBackupTriggerPolicy,
} from '@/lib/services/backupStatusService';
import { diagnoseTypesenseProjection } from '@/lib/services/typesenseReconciliation';

type ApiErrorPayload = {
  ok: false;
  code: string;
  message: string;
  severity: 'error' | 'warning';
  retryable: boolean;
};

function errorResponse(payload: ApiErrorPayload, status: number) {
  return NextResponse.json(payload, { status });
}

async function requireAdmin() {
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
  return null;
}

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

export async function GET() {
  const forbidden = await requireAdmin();
  if (forbidden) return forbidden;

  try {
    const [backup, index] = await Promise.all([
      Promise.resolve(getBackupOperationsStatus()),
      diagnoseTypesenseProjection({ sampleSize: 25 }),
    ]);
    return NextResponse.json({ ok: true, backup, index });
  } catch (error) {
    console.error('[/api/admin/settings/operations GET]', error);
    return errorResponse(
      {
        ok: false,
        code: 'SETTINGS_OPERATIONS_READ_FAILED',
        message: 'Failed to load operations status.',
        severity: 'error',
        retryable: true,
      },
      500
    );
  }
}

export async function POST() {
  const forbidden = await requireAdmin();
  if (forbidden) return forbidden;

  const trigger = getBackupTriggerPolicy();
  if (!trigger.allowed) {
    return errorResponse(
      {
        ok: false,
        code: 'BACKUP_TRIGGER_UNAVAILABLE',
        message: trigger.reason ?? 'Backup cannot be started from this environment.',
        severity: 'warning',
        retryable: false,
      },
      503
    );
  }

  try {
    const manifest = await runPairedBackup(['--apply']);
    const backup = getBackupOperationsStatus();
    return NextResponse.json({
      ok: true,
      manifest: {
        runId: manifest.runId,
        timestamp: manifest.timestamp,
        runDir: manifest.runDir,
        complete: manifest.complete,
        firestoreDocCount: manifest.firestore.docCount,
        storageObjectCount: manifest.storage.objectCount,
      },
      backup,
    });
  } catch (error) {
    console.error('[/api/admin/settings/operations POST]', error);
    return errorResponse(
      {
        ok: false,
        code: 'BACKUP_RUN_FAILED',
        message: error instanceof Error ? error.message : 'Backup run failed.',
        severity: 'error',
        retryable: true,
      },
      500
    );
  }
}
