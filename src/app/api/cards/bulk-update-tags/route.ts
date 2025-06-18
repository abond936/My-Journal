import { NextResponse } from 'next/server';
import { bulkUpdateTags } from '@/lib/services/cardService';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]/route';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user.isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const { cardIds, tags } = await request.json();

    if (!Array.isArray(cardIds) || cardIds.length === 0) {
      return NextResponse.json({ error: 'An array of card IDs is required.' }, { status: 400 });
    }

    if (!Array.isArray(tags)) {
      return NextResponse.json({ error: 'An array of tags is required.' }, { status: 400 });
    }

    await bulkUpdateTags(cardIds, tags);

    return NextResponse.json({ success: true, message: `${cardIds.length} cards updated successfully.` });
  } catch (error) {
    console.error('Error in bulk-update-tags:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
} 