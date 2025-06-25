import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]/route';
import { deleteCard, getCardById, updateCard, getPaginatedCardsByIds } from '@/lib/services/cardService';
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

    // Sanitize the response to ensure it conforms to the Card type, preventing client-side errors.
    const responseData = {
      ...parentCard,
      tags: parentCard.tags || [],
      who: parentCard.who || [],
      what: parentCard.what || [],
      when: parentCard.when || [],
      where: parentCard.where || [],
      reflection: parentCard.reflection || [],
      galleryMedia: parentCard.galleryMedia || [],
      childrenIds: parentCard.childrenIds || [],
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
    // The incoming body can be directly passed to the now-hardened updateCard service.
    // The service handles sanitation and tag recalculations.
    const cardData: Partial<Omit<Card, 'id'>> = await request.json();
    const updatedCard = await updateCard(id, cardData);
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