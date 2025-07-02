import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]/route';
import { deleteCard, getCardById, updateCard, getPaginatedCardsByIds } from '@/lib/services/cardService';
import { Card } from '@/lib/types/card';
import { PaginatedResult } from '@/lib/types/services';
import { withErrorHandler } from '@/lib/middleware/errorHandler';
import { AppError, ErrorCode } from '@/lib/types/error';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

// Validation schema for card updates
const cardUpdateSchema = z.object({
  title: z.string().optional(),
  content: z.string().optional(),
  status: z.enum(['draft', 'published', 'archived']).optional(),
  type: z.enum(['story', 'gallery', 'qa']).optional(),
  tags: z.array(z.string()).optional(),
  displayMode: z.enum(['full', 'compact']).optional(),
});

/**
 * GET a card by ID.
 * Demonstrates error handling with input validation and proper error responses.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withErrorHandler(request, async () => {
    const session = await getServerSession(authOptions);
    if (!session) {
      throw new AppError(
        ErrorCode.UNAUTHORIZED,
        'Authentication required to access this resource'
      );
    }

    // Validate ID format (example validation)
    if (!/^[a-zA-Z0-9-]+$/.test(params.id)) {
      throw new AppError(
        ErrorCode.VALIDATION_ERROR,
        'Invalid card ID format',
        { id: params.id }
      );
    }

    const card = await getCardById(params.id);
    if (!card) {
      throw new AppError(
        ErrorCode.NOT_FOUND,
        `Card with ID ${params.id} not found`
      );
    }

    // Parse query parameters with validation
    const { searchParams } = new URL(request.url);
    const limit = z.coerce
      .number()
      .min(1)
      .max(100)
      .default(10)
      .parse(searchParams.get('limit'));
    
    const lastDocId = searchParams.get('lastDocId');

    // Fetch children with pagination
    const childrenResult: PaginatedResult<Card> = await getPaginatedCardsByIds(
      card.childrenIds || [],
      { limit, lastDocId }
    );

    // Construct the response
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
  { params }: { params: { id: string } }
) {
  return withErrorHandler(request, async () => {
    const session = await getServerSession(authOptions);
    if (!session?.user?.role === 'admin') {
      throw new AppError(
        ErrorCode.FORBIDDEN,
        'Admin access required to update cards'
      );
    }

    // Parse and validate the request body
    const body = await request.json();
    const validatedData = cardUpdateSchema.parse(body);

    const existingCard = await getCardById(params.id);
    if (!existingCard) {
      throw new AppError(
        ErrorCode.NOT_FOUND,
        `Cannot update: Card with ID ${params.id} not found`
      );
    }

    // Perform the update
    const updatedCard = await updateCard(params.id, validatedData);
    return NextResponse.json(updatedCard);
  });
}

/**
 * DELETE a card by ID.
 * Demonstrates error handling for delete operations.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withErrorHandler(request, async () => {
    const session = await getServerSession(authOptions);
    if (!session?.user?.role === 'admin') {
      throw new AppError(
        ErrorCode.FORBIDDEN,
        'Admin access required to delete cards'
      );
    }

    const existingCard = await getCardById(params.id);
    if (!existingCard) {
      throw new AppError(
        ErrorCode.NOT_FOUND,
        `Cannot delete: Card with ID ${params.id} not found`
      );
    }

    // Check if card can be deleted (example business rule)
    if (existingCard.childrenIds?.length > 0) {
      throw new AppError(
        ErrorCode.CONFLICT,
        'Cannot delete card with children',
        { childCount: existingCard.childrenIds.length }
      );
    }

    await deleteCard(params.id);
    return new NextResponse(null, { status: 204 });
  });
} 