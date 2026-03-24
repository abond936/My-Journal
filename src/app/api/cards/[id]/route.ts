import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/authOptions';
import { deleteCard, getCardById, updateCard, getPaginatedCardsByIds } from '@/lib/services/cardService';
import { Card, cardUpdateValidationSchema } from '@/lib/types/card';
import { PaginatedResult } from '@/lib/types/services';
import { withErrorHandler } from '@/lib/middleware/errorHandler';
import { AppError, ErrorCode } from '@/lib/types/error';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

// Type for params to ensure consistency
type RouteParams = Promise<{ id: string }>;

// Use centralized validation schema for consistency
const cardUpdateSchema = cardUpdateValidationSchema;

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
    if (!session) {
      throw new AppError(
        ErrorCode.UNAUTHORIZED,
        'Authentication required to access this resource'
      );
    }

    // Get ID from params
    const { id } = await params;

    // Validate ID format (example validation)
    if (!/^[a-zA-Z0-9-]+$/.test(id)) {
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

    // Parse query parameters with validation
    const { searchParams } = new URL(request.url);
    const limitParam = searchParams.get('limit');
    
    // If limit is not provided or invalid, use default
    const limit = limitParam 
      ? z.coerce
          .number()
          .min(1)
          .max(100)
          .catch(10) // Use 10 as fallback if parsing fails
          .parse(limitParam)
      : 10;
    
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
  { params }: { params: RouteParams }
) {
  return withErrorHandler(request, async () => {
    const session = await getServerSession(authOptions);
    if (session?.user?.role !== 'admin') {
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
    if (session?.user?.role !== 'admin') {
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
 * DELETE a card by ID.
 * Demonstrates error handling for delete operations.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: RouteParams }
) {
  return withErrorHandler(request, async () => {
    const session = await getServerSession(authOptions);
    if (session?.user?.role !== 'admin') {
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

    // Check if card can be deleted (example business rule)
    if (existingCard.childrenIds?.length > 0) {
      throw new AppError(
        ErrorCode.CONFLICT,
        'Cannot delete card with children',
        { childCount: existingCard.childrenIds.length }
      );
    }

    await deleteCard(id);
    return new NextResponse(null, { status: 204 });
  });
} 