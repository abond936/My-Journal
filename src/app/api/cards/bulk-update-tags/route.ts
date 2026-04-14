import { NextResponse } from 'next/server';
import { getCardsByIds, updateCard } from '@/lib/services/cardService';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/authOptions';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const { cardIds, tags, addTagIds, removeTagIds } = await request.json();

    if (!Array.isArray(cardIds) || cardIds.length === 0) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    // Backward compatibility: full replacement mode.
    if (Array.isArray(tags)) {
      await Promise.all(cardIds.map(cardId => updateCard(cardId, { tags })));
      return NextResponse.json({ message: 'Tags updated successfully' });
    }

    if (!Array.isArray(addTagIds) || !Array.isArray(removeTagIds)) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const cards = await getCardsByIds(cardIds, { hydrationMode: 'cover-only' });
    await Promise.all(
      cards.map((card) => {
        const next = new Set(card.tags || []);
        addTagIds.forEach((tagId) => {
          if (typeof tagId === 'string' && tagId.trim()) next.add(tagId);
        });
        removeTagIds.forEach((tagId) => {
          if (typeof tagId === 'string' && tagId.trim()) next.delete(tagId);
        });
        return updateCard(card.docId, { tags: Array.from(next) });
      })
    );

    return NextResponse.json({ message: 'Tags updated successfully' });
  } catch (error) {
    console.error('Error in bulk-update-tags:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
} 