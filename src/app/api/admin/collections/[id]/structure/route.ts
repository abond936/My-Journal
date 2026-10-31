import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { z } from 'zod';
import { authOptions } from '@/lib/auth/authOptions';
import { isAdminSession } from '@/lib/auth/readerAccess';
import { replaceCollectionPlacementStructure } from '@/lib/services/collections/collectionPlacementMutationService';
import { getActiveCollectionStructure } from '@/lib/services/collections/collectionProjectionReadService';
import { collectionPlacementStructureInputSchema } from '@/lib/types/collection';
import { CollectionPlacementMutationError } from '@/lib/utils/collectionPlacementMutation';

const requestSchema = z.object({
  expectedStructureRevision: z.number().int().nonnegative(),
  placements: z.array(collectionPlacementStructureInputSchema).max(440),
});

function errorResponse(code: string, message: string, status: number, details?: unknown) {
  return NextResponse.json({ ok: false, code, message, details }, { status });
}

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  return isAdminSession(session);
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireAdmin())) return errorResponse('AUTH_FORBIDDEN', 'Forbidden.', 403);
  const { id } = await params;
  try {
    const structure = await getActiveCollectionStructure(id);
    if (!structure) return errorResponse('COLLECTION_NOT_FOUND', 'Active Collection not found.', 404);
    return NextResponse.json({ ok: true, ...structure });
  } catch (error) {
    console.error('[/api/admin/collections/[id]/structure GET]', error);
    return errorResponse('COLLECTION_STRUCTURE_READ_FAILED', 'The Collection structure could not be loaded.', 500);
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireAdmin())) return errorResponse('AUTH_FORBIDDEN', 'Forbidden.', 403);
  const { id } = await params;
  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return errorResponse('INVALID_REQUEST', 'The Collection structure request is invalid.', 400, parsed.error.flatten());
  }
  try {
    const result = await replaceCollectionPlacementStructure({
      collectionId: id,
      expectedStructureRevision: parsed.data.expectedStructureRevision,
      placements: parsed.data.placements,
    });
    return NextResponse.json({
      ok: true,
      changed: result.changed,
      structureRevision: result.nextRevision,
      operationId: result.operation?.docId ?? null,
    });
  } catch (error) {
    if (error instanceof CollectionPlacementMutationError) {
      const status = error.code === 'COLLECTION_REVISION_CONFLICT'
        || error.code === 'COLLECTION_NOT_ACTIVE'
        || error.code === 'COLLECTION_PUBLISHED_LOCKED'
        ? 409
        : 422;
      return errorResponse(error.code, error.message, status, error.details);
    }
    if (error instanceof Error && error.message.includes('was not found')) {
      return errorResponse('COLLECTION_NOT_FOUND', error.message, 404);
    }
    console.error('[/api/admin/collections/[id]/structure PUT]', error);
    return errorResponse('COLLECTION_STRUCTURE_SAVE_FAILED', 'The Collection structure could not be saved.', 500);
  }
}
