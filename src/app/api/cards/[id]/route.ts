import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/authOptions';
import { isAdminSession } from '@/lib/auth/readerAccess';
import { updateCard } from '@/lib/services/cards/cardBroadMutationService';
import { updateCardContent } from '@/lib/services/cards/cardContentMutationService';
import { updateCardCover } from '@/lib/services/cards/cardCoverMutationService';
import {
  updateCardGallery,
  updateCardGalleryInheritanceOverrides,
  updateCardGalleryOrder,
} from '@/lib/services/cards/cardGalleryMutationService';
import {
  updateCardChildren,
  updateCardChildrenOrder,
  updateCardCollectionRoot,
} from '@/lib/services/cards/cardHierarchyMutationService';
import { deleteCard } from '@/lib/services/cards/cardLifecycleService';
import { updateCardMetadata } from '@/lib/services/cards/cardMetadataMutationService';
import {
  isGalleryOnlyPayload,
  isGalleryReorderOnlyPayload,
  isCardMetadataOnlyPayload,
  isChildrenOnlyPayload,
  isChildrenReorderOnlyPayload,
  isCollectionRootOnlyPayload,
  isContentOnlyPayload,
  isTagsOnlyPayload,
  isGalleryInheritanceOverridesOnlyPayload,
  isStatusOnlyPayload,
} from '@/lib/services/cards/cardMutationClassifiers';
import { getCardById, getPaginatedCardsByIds } from '@/lib/services/cards/cardReadService';
import { updateCardStatus } from '@/lib/services/cards/cardStatusMutationService';
import { updateCardTags } from '@/lib/services/cards/cardTagMutationService';
import { Card, cardUpdateValidationSchema } from '@/lib/types/card';
import { PaginatedResult } from '@/lib/types/services';
import { withErrorHandler } from '@/lib/middleware/errorHandler';
import { AppError, ErrorCode } from '@/lib/types/error';
import { z } from 'zod';
import { canReadCard, filterReadableCards, isAuthenticatedSession } from '@/lib/auth/readerAccess';
import { getAdminApp } from '@/lib/config/firebase/admin';

export const dynamic = 'force-dynamic';

// Type for params to ensure consistency
type RouteParams = Promise<{ id: string }>;

// Use centralized validation schema for consistency
const cardUpdateSchema = cardUpdateValidationSchema;

function isCoverOnlyPatch(payload: Record<string, unknown>): boolean {
  const keys = Object.keys(payload).filter((key) => key !== 'coverImage');
  if (keys.length === 0) return false;
  return keys.every(
    (key) =>
      key === 'coverImageId' || key === 'coverImageFocalPoint' || key === 'coverImageMode'
  );
}

/**
 * GET a card by ID.
 * Demonstrates error handling with input validation and proper error responses.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: RouteParams }
) {
  return withErrorHandler(request, async () => {
    const session = await getServerSession(authOptions);
    if (!isAuthenticatedSession(session)) {
      throw new AppError(
        ErrorCode.UNAUTHORIZED,
        'Authentication required to access this resource'
      );
    }

    // Get ID from params
    const { id } = await params;

    // Firestore document IDs must not contain `/` (path segment); allow common id chars (incl. `_`, `.`).
    if (!id || id.length > 1500 || id.includes('/')) {
      throw new AppError(
        ErrorCode.VALIDATION_ERROR,
        'Invalid card ID format',
        { id }
      );
    }

    const card = await getCardById(id);
    if (!card) {
      throw new AppError(
        ErrorCode.NOT_FOUND,
        `Card with ID ${id} not found`
      );
    }
    if (!canReadCard(session, card)) {
      throw new AppError(
        ErrorCode.NOT_FOUND,
        `Card with ID ${id} not found`
      );
    }

    // Parse query parameters with validation
    const { searchParams } = new URL(request.url);
    const limitParam = searchParams.get('limit');
    const childrenMode = searchParams.get('children');

    // `?children=skip` lets callers that only need parent-card fields opt out of
    // child hydration. The parent's own `childrenIds` (just IDs, no extra reads)
    // still comes back for any caller that needs the count or list. See
    // docs/01-Vision-Architecture.md → Backend Principles (narrow read paths).
    const skipChildren = childrenMode === 'skip';

    // If limit is not provided or invalid, use default
    const limit = limitParam
      ? z.coerce
          .number()
          .min(1)
          .max(250)
          .catch(10) // Use 10 as fallback if parsing fails
          .parse(limitParam)
      : 10;

    const lastDocId = searchParams.get('lastDocId');

    const rawChildrenResult: PaginatedResult<Card> = skipChildren
      ? { items: [], hasMore: false, lastDocId: undefined }
      : await getPaginatedCardsByIds(card.childrenIds || [], { limit, lastDocId });
    const readableChildren = filterReadableCards(session, rawChildrenResult.items);
    const childrenResult: PaginatedResult<Card> = {
      ...rawChildrenResult,
      items: readableChildren,
    };

    const responseData = {
      ...card,
      children: childrenResult.items,
      hasMoreChildren: childrenResult.hasMore,
      lastChildId: childrenResult.lastDocId,
    };

    const response = NextResponse.json(responseData);

    // Set cache control headers
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');

    return response;
  });
}

/**
 * PUT/UPDATE a card by ID.
 * Demonstrates validation and error handling for update operations.
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: RouteParams }
) {
  return withErrorHandler(request, async () => {
    const session = await getServerSession(authOptions);
    if (!isAdminSession(session)) {
      throw new AppError(
        ErrorCode.FORBIDDEN,
        'Admin access required to update cards'
      );
    }

    // Get ID from params
    const { id } = await params;

    // Parse and validate the request body
    const body = await request.json();
    const validatedData = cardUpdateSchema.parse(body);

    const existingCard = await getCardById(id);
    if (!existingCard) {
      throw new AppError(
        ErrorCode.NOT_FOUND,
        `Cannot update: Card with ID ${id} not found`
      );
    }

    // Perform the update
    const updatedCard = await updateCard(id, validatedData);
    return NextResponse.json(updatedCard);
  });
}

/**
 * PATCH a card by ID.
 * Allows partial updates; identical validation and auth as PUT.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: RouteParams }
) {
  return withErrorHandler(request, async () => {
    const session = await getServerSession(authOptions);
    if (!isAdminSession(session)) {
      throw new AppError(
        ErrorCode.FORBIDDEN,
        'Admin access required to update cards'
      );
    }

    // Get ID from params
    const { id } = await params;

    // Parse and validate the request body
    const body = await request.json();
    const validatedData = cardUpdateSchema.parse(body);

    const existingCardSnap = await getAdminApp().firestore().collection('cards').doc(id).get();
    if (!existingCardSnap.exists) {
      throw new AppError(
        ErrorCode.NOT_FOUND,
        `Cannot update: Card with ID ${id} not found`
      );
    }
    const existingCard = { ...(existingCardSnap.data() as Card), docId: existingCardSnap.id } as Card;

    let updatedCard: Card;
    if (isCoverOnlyPatch(validatedData)) {
      updatedCard = await updateCardCover(id, {
        ...(Object.prototype.hasOwnProperty.call(validatedData, 'coverImageId')
          ? { coverImageId: validatedData.coverImageId ?? null }
          : {}),
        ...(Object.prototype.hasOwnProperty.call(validatedData, 'coverImageMode')
          ? { coverImageMode: validatedData.coverImageMode }
          : {}),
        coverImageFocalPoint: validatedData.coverImageFocalPoint,
      });
    } else if (isGalleryReorderOnlyPayload(existingCard, validatedData)) {
      const { galleryMedia } = validatedData as Pick<Card, 'galleryMedia'>;
      updatedCard = await updateCardGalleryOrder(id, galleryMedia);
    } else if (isGalleryOnlyPayload(validatedData)) {
      const { galleryMedia } = validatedData as Pick<Card, 'galleryMedia'>;
      updatedCard = await updateCardGallery(id, galleryMedia);
    } else if (isChildrenReorderOnlyPayload(existingCard, validatedData)) {
      const { childrenIds } = validatedData as Pick<Card, 'childrenIds'>;
      updatedCard = await updateCardChildrenOrder(id, childrenIds);
    } else if (isChildrenOnlyPayload(validatedData)) {
      const { childrenIds } = validatedData as Pick<Card, 'childrenIds'>;
      updatedCard = await updateCardChildren(id, childrenIds);
    } else if (isCollectionRootOnlyPayload(validatedData)) {
      updatedCard = await updateCardCollectionRoot(id, validatedData);
    } else if (isGalleryInheritanceOverridesOnlyPayload(validatedData)) {
      const { galleryTagInheritanceOverrides } = validatedData as Pick<Card, 'galleryTagInheritanceOverrides'>;
      updatedCard = await updateCardGalleryInheritanceOverrides(
        id,
        galleryTagInheritanceOverrides
      );
    } else if (isTagsOnlyPayload(validatedData)) {
      const { tags, subjectTagId, subjectTagIds } = validatedData as Pick<Card, 'tags' | 'subjectTagId' | 'subjectTagIds'>;
      updatedCard = await updateCardTags(id, {
        tags,
        subjectTagId,
        ...(Object.prototype.hasOwnProperty.call(validatedData, 'subjectTagIds') ? { subjectTagIds } : {}),
      });
    } else if (isStatusOnlyPayload(validatedData)) {
      const { status } = validatedData as Pick<Card, 'status'>;
      updatedCard = await updateCardStatus(id, status);
    } else if (isContentOnlyPayload(validatedData)) {
      const { content } = validatedData as Pick<Card, 'content'>;
      updatedCard = await updateCardContent(id, content);
    } else if (isCardMetadataOnlyPayload(validatedData)) {
      updatedCard = await updateCardMetadata(id, validatedData);
    } else {
      updatedCard = await updateCard(id, validatedData);
    }
    
    return NextResponse.json(updatedCard);
  });
}

/**
 * DELETE a card by ID.
 * Demonstrates error handling for delete operations.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: RouteParams }
) {
  return withErrorHandler(request, async () => {
    const session = await getServerSession(authOptions);
    if (!isAdminSession(session)) {
      throw new AppError(
        ErrorCode.FORBIDDEN,
        'Admin access required to delete cards'
      );
    }

    // Get ID from params
    const { id } = await params;

    const existingCard = await getCardById(id);
    if (!existingCard) {
      throw new AppError(
        ErrorCode.NOT_FOUND,
        `Cannot delete: Card with ID ${id} not found`
      );
    }

    // Root cards with children require explicit restructuring first.
    if (existingCard.isCollectionRoot === true && existingCard.childrenIds?.length > 0) {
      throw new AppError(
        ErrorCode.CONFLICT,
        'Cannot delete a root card that still has children',
        { childCount: existingCard.childrenIds.length }
      );
    }

    await deleteCard(id);
    return new NextResponse(null, { status: 204 });
  });
} 
