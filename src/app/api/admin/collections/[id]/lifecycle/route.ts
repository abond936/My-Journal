import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { z } from 'zod';
import { authOptions } from '@/lib/auth/authOptions';
import { isAdminSession } from '@/lib/auth/readerAccess';
import { updateCollectionLifecycle } from '@/lib/services/collections/collectionLifecycleService';
import { getStatusCodeForError, isAppError } from '@/lib/types/error';
import { collectionLifecycleSchema } from '@/lib/types/collection';

const requestSchema = z.object({ lifecycle: collectionLifecycleSchema });

function error(message: string, status: number, code?: string, details?: Record<string, unknown>) {
  return NextResponse.json({ ok: false, code, message, details }, { status });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!isAdminSession(session)) return error('Forbidden.', 403, 'AUTH_FORBIDDEN');
  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return error('Choose Draft or Published.', 400, 'INVALID_REQUEST');
  const { id } = await params;
  try {
    const collection = await updateCollectionLifecycle({
      collectionId: id,
      lifecycle: parsed.data.lifecycle,
    });
    return NextResponse.json({ ok: true, collection });
  } catch (cause) {
    if (isAppError(cause)) {
      return error(cause.message, getStatusCodeForError(cause.code), cause.code, cause.details);
    }
    console.error('[/api/admin/collections/[id]/lifecycle PATCH]', cause);
    return error('Collection lifecycle could not be saved.', 500, 'COLLECTION_LIFECYCLE_SAVE_FAILED');
  }
}
