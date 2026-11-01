import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { z } from 'zod';
import { authOptions } from '@/lib/auth/authOptions';
import { isAdminSession } from '@/lib/auth/readerAccess';
import { CollectionTitleConflictError } from '@/lib/services/collections/collectionCreationService';
import { promoteCollectionStructure } from '@/lib/services/collections/collectionStructurePromotionService';
import { CollectionStructurePromotionError } from '@/lib/utils/collectionStructurePromotion';

const requestSchema = z.object({
  sourcePlacementId: z.string().min(1),
  expectedStructureRevision: z.number().int().nonnegative(),
  title: z.string().trim().min(1).max(120),
});

function errorResponse(code: string, message: string, status: number, details?: unknown) {
  return NextResponse.json({ ok: false, code, message, details }, { status });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!isAdminSession(session)) return errorResponse('AUTH_FORBIDDEN', 'Forbidden.', 403);
  const { id } = await params;
  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return errorResponse('INVALID_REQUEST', 'Choose a structural destination and enter a Collection title.', 400);
  }
  try {
    const result = await promoteCollectionStructure({
      sourceCollectionId: id,
      sourcePlacementId: parsed.data.sourcePlacementId,
      expectedStructureRevision: parsed.data.expectedStructureRevision,
      title: parsed.data.title,
    });
    return NextResponse.json({
      ok: true,
      collection: result.collection,
      placementCount: result.placements.length,
      operationId: result.operation.docId,
    }, { status: 201 });
  } catch (error) {
    if (error instanceof CollectionTitleConflictError) {
      return errorResponse('COLLECTION_TITLE_CONFLICT', error.message, 409);
    }
    if (error instanceof CollectionStructurePromotionError) {
      const status = error.code === 'SOURCE_COLLECTION_REVISION_CONFLICT'
        || error.code === 'SOURCE_COLLECTION_NOT_ACTIVE'
        ? 409
        : error.code === 'SOURCE_PLACEMENT_NOT_FOUND'
          ? 404
          : 422;
      return errorResponse(error.code, error.message, status, error.details);
    }
    if (error instanceof Error && error.message.includes('was not found')) {
      return errorResponse('COLLECTION_NOT_FOUND', error.message, 404);
    }
    console.error('[/api/admin/collections/[id]/promote POST]', error);
    return errorResponse('COLLECTION_PROMOTION_FAILED', 'The new Collection could not be created.', 500);
  }
}
