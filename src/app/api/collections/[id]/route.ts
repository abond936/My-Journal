import { NextResponse } from 'next/server';
import { getCardById, getPaginatedCardsByIds } from '@/lib/services/cardService';
import { Card } from '@/lib/types/card';
import { PaginatedResult } from '@/lib/types/services';

export async function GET(
  request: Request,
  { params: { id } }: { params: { id: string } }
) {
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
    console.error(`Error fetching collection for card ${id}:`, error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
} 