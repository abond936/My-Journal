import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { z } from 'zod';
import { authOptions } from '@/lib/auth/authOptions';
import { isAdminSession } from '@/lib/auth/readerAccess';
import { transitionCollectionAuthority } from '@/lib/services/collections/collectionAuthorityService';
import { collectionRecordStateSchema } from '@/lib/types/collection';
import { CollectionAuthorityTransitionError } from '@/lib/utils/collectionAuthorityTransition';

const requestSchema = z.object({
  desiredState: collectionRecordStateSchema,
  expectedStructureRevision: z.number().int().nonnegative(),
  expectedAuthorityRevision: z.number().int().nonnegative(),
  confirmCollectionId: z.string().min(1),
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!isAdminSession(session)) {
    return NextResponse.json({ ok: false, code: 'AUTH_FORBIDDEN', message: 'Forbidden.' }, { status: 403 });
  }
  const { id } = await params;
  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success || parsed.data.confirmCollectionId !== id) {
    return NextResponse.json({
      ok: false,
      code: 'INVALID_REQUEST',
      message: 'The Collection authority request is invalid.',
    }, { status: 400 });
  }
  try {
    const result = await transitionCollectionAuthority({
      collectionId: id,
      desiredState: parsed.data.desiredState,
      expectedStructureRevision: parsed.data.expectedStructureRevision,
      expectedAuthorityRevision: parsed.data.expectedAuthorityRevision,
    });
    return NextResponse.json({
      ok: true,
      changed: result.changed,
      authorityRevision: result.nextAuthorityRevision,
      operationId: result.operation?.docId ?? null,
    });
  } catch (error) {
    if (error instanceof CollectionAuthorityTransitionError) {
      const status = error.code === 'COLLECTION_AUTHORITY_CONFLICT' ? 409 : 422;
      return NextResponse.json({
        ok: false,
        code: error.code,
        message: error.message,
        details: error.details,
      }, { status });
    }
    if (error instanceof Error && error.message.includes('was not found')) {
      return NextResponse.json({ ok: false, code: 'COLLECTION_NOT_FOUND', message: error.message }, { status: 404 });
    }
    console.error('[/api/admin/collections/[id]/authority POST]', error);
    return NextResponse.json({
      ok: false,
      code: 'COLLECTION_AUTHORITY_CHANGE_FAILED',
      message: 'The Collection authority could not be changed.',
    }, { status: 500 });
  }
}
