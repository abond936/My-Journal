import { NextResponse } from 'next/server';
import { getCardsByIds } from '@/lib/services/cardService';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]/route';

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

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user.isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const { ids } = await request.json();

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'An array of card IDs is required.' }, { status: 400 });
    }

    const cards = await getCardsByIds(ids);
    return NextResponse.json(cards);
  } catch (error) {
    console.error('Error fetching cards by IDs:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
} 