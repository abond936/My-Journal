import { NextResponse } from 'next/server';
import { updateCard } from '@/lib/services/cardService';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const { cardIds, tags } = await request.json();

    if (!Array.isArray(cardIds) || cardIds.length === 0 || !Array.isArray(tags)) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    // Since cardService functions handle transactions, we can parallelize the updates.
    await Promise.all(
      cardIds.map(cardId => updateCard(cardId, { tags }))
    );

    return NextResponse.json({ message: 'Tags updated successfully' });
  } catch (error) {
    console.error('Error in bulk-update-tags:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
} 