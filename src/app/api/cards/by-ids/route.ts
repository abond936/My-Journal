import { NextResponse } from 'next/server';
import { getCardsByIds } from '@/lib/services/cardService';

export const dynamic = 'force-dynamic';

/**
 * GET handler for fetching multiple cards by their IDs.
 * @param request - The incoming NextRequest.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const idsParam = searchParams.get('ids');

    if (!idsParam) {
      return new NextResponse('Missing "ids" query parameter', { status: 400 });
    }

    const ids = idsParam.split(',');
    
    const cards = await getCardsByIds(ids);

    return NextResponse.json(cards);
  } catch (error) {
    console.error('API Error fetching cards by IDs:', error);
    return new NextResponse('Internal server error', { status: 500 });
  }
} 