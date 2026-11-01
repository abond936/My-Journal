import { createHash } from 'crypto';
import { FieldValue } from 'firebase-admin/firestore';
import { getAdminApp } from '@/lib/config/firebase/admin';

export type MediaImportOperationProgress = {
  processed: number;
  succeeded: number;
  skipped: number;
  failed: number;
};

function operationRef(importBatchId: string) {
  const id = createHash('sha256').update(importBatchId).digest('hex');
  return getAdminApp().firestore().collection('media_import_operations').doc(id);
}

export async function startMediaImportOperation(importBatchId: string, total: number): Promise<void> {
  await operationRef(importBatchId).set({
    importBatchId,
    status: 'running',
    total,
    processed: 0,
    succeeded: 0,
    skipped: 0,
    failed: 0,
    startedAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
}

export async function updateMediaImportOperation(
  importBatchId: string,
  total: number,
  progress: MediaImportOperationProgress,
  completed = false
): Promise<void> {
  await operationRef(importBatchId).update({
    ...progress,
    total,
    status: completed ? (progress.failed > 0 ? 'completed_with_errors' : 'completed') : 'running',
    ...(completed ? { completedAt: FieldValue.serverTimestamp() } : {}),
    updatedAt: FieldValue.serverTimestamp(),
  });
}

export async function failMediaImportOperation(importBatchId: string, message: string): Promise<void> {
  await operationRef(importBatchId).update({
    status: 'failed',
    error: message,
    updatedAt: FieldValue.serverTimestamp(),
  });
}
