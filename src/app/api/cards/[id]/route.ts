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

    // Log the raw card data before sanitization
    console.log('API GET [id] - Raw card data before sanitization:', {
      id: parentCard.id,
      title: parentCard.title,
      content: parentCard.content ? 'Present' : 'Missing',
      coverImageId: parentCard.coverImageId,
      coverImage: parentCard.coverImage ? 'Present' : 'Missing',
      when: parentCard.when,
      galleryMedia: parentCard.galleryMedia?.length || 0,
      galleryMediaDetails: parentCard.galleryMedia?.map(item => ({
        mediaId: item.mediaId,
        hasMedia: !!item.media,
        mediaUrl: item.media?.url || 'missing'
      }))
    });

    const { searchParams } = new URL(request.url);
    const limit = searchParams.has('limit') ? parseInt(searchParams.get('limit')!, 10) : 10;
    const lastDocId = searchParams.get('lastDocId') || undefined;

    const childrenResult: PaginatedResult<Card> = await getPaginatedCardsByIds(
      parentCard.childrenIds || [],
      { limit, lastDocId }
    );

    // Sanitize the response
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
      children: childrenResult.items,
      hasMoreChildren: childrenResult.hasMore,
      lastChildId: childrenResult.lastDocId,
    };

    // Log the sanitized data
    console.log('API GET [id] - Sanitized response data:', {
      id: responseData.id,
      title: responseData.title,
      content: responseData.content ? 'Present' : 'Missing',
      coverImageId: responseData.coverImageId,
      coverImage: responseData.coverImage ? 'Present' : 'Missing',
      when: responseData.when,
      galleryMedia: responseData.galleryMedia?.length || 0
    });

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
    
    // Log the incoming data
    console.log('API PATCH [id] - Received card data:', {
      id,
      galleryMedia: cardData.galleryMedia?.length || 0,
      galleryMediaDetails: cardData.galleryMedia?.map(item => ({
        mediaId: item.mediaId,
        hasMedia: !!item.media,
        mediaUrl: item.media?.url || 'missing'
      }))
    });

    const updatedCard = await updateCard(id, cardData);

    // Log the updated card
    console.log('API PATCH [id] - Updated card data:', {
      id: updatedCard.id,
      galleryMedia: updatedCard.galleryMedia?.length || 0,
      galleryMediaDetails: updatedCard.galleryMedia?.map(item => ({
        mediaId: item.mediaId,
        hasMedia: !!item.media,
        mediaUrl: item.media?.url || 'missing'
      }))
    });

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