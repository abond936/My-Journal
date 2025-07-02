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
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const ids = searchParams.getAll('id');

    if (!ids || ids.length === 0) {
      return new NextResponse('Missing "id" query parameter(s)', { status: 400 });
    }
    
    const cards = await getCardsByIds(ids);

    return NextResponse.json(cards);
  } catch (error) {
    console.error('API Error fetching cards by IDs:', error);
    return new NextResponse('Internal server error', { status: 500 });
  }
} 