import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]/route';
import { deleteCard, getCardById, updateCard, getPaginatedCardsByIds } from '@/lib/services/cardService';
import { deleteImageByUrl } from '@/lib/services/images/imageImportService';
import { Card } from '@/lib/types/card';
import { PaginatedResult } from '@/lib/types/services';

export const dynamic = 'force-dynamic';

/**
 * GET a card by ID.
 */
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { id } = await params;
  try {
    if (!id) {
      return NextResponse.json({ error: 'Card ID is required' }, { status: 400 });
    }

    const parentCard = await getCardById(id);

    if (!parentCard) {
      return NextResponse.json({ error: 'Card not found' }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const limit = searchParams.has('limit') ? parseInt(searchParams.get('limit')!, 10) : 10;
    const lastDocId = searchParams.get('lastDocId') || undefined;

    const childrenResult: PaginatedResult<Card> = await getPaginatedCardsByIds(
      parentCard.childrenIds || [],
      { limit, lastDocId }
    );

    const responseData = {
      ...parentCard,
      children: childrenResult.items, // The first page of children
      hasMoreChildren: childrenResult.hasMore,
      lastChildId: childrenResult.lastDocId,
    };

    const response = NextResponse.json(responseData);

    // Prevent caching
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');

    return response;
  } catch (error) {
    console.error(`Error fetching data for card ${id}:`, error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

/**
 * PATCH handler for updating a card.
 */
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'admin') {
    return new NextResponse(JSON.stringify({ error: 'Forbidden' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const body: Partial<Omit<Card, 'id'>> & { deletedImageUrls?: string[] } = await request.json();
    const { deletedImageUrls, ...cardData } = body;

    // 1. Update card data
    const updatedCard = await updateCard(id, cardData);

    // 2. Delete any images that were removed
    if (deletedImageUrls && deletedImageUrls.length > 0) {
      console.log(`Deleting ${deletedImageUrls.length} images...`);
      // We will proceed even if some deletions fail, but we'll log the errors.
      const deletionPromises = deletedImageUrls.map(async (url) => {
        try {
          await deleteImageByUrl(url);
        } catch (error) {
          console.error(`Failed to delete image ${url}:`, error);
          // Decide if you want to collect these errors and report them back.
          // For now, we just log them.
        }
      });
      await Promise.all(deletionPromises);
      console.log('Image deletion process finished.');
    }

    return NextResponse.json(updatedCard);
  } catch (error) {
    console.error(`API Error updating card ${id}:`, error);
    return new NextResponse('Internal server error', { status: 500 });
  }
}

/**
 * DELETE a card by ID.
 */
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'admin') {
    return new NextResponse(JSON.stringify({ error: 'Forbidden' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    await deleteCard(id);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error(`API Error deleting card ${id}:`, error);
    return new NextResponse('Internal server error', { status: 500 });
  }
} 