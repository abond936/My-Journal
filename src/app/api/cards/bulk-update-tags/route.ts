import { NextResponse } from 'next/server';
import { bulkUpdateTags, getCardsByIds, updateCard } from '@/lib/services/cardService';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/authOptions';

export const dynamic = 'force-dynamic';
const BULK_MUTATION_CONCURRENCY = 5;

async function runWithConcurrencyLimit<T>(
  items: T[],
  concurrency: number,
  worker: (item: T) => Promise<void>
): Promise<void> {
  if (items.length === 0) return;
  const limit = Math.max(1, concurrency);
  for (let i = 0; i < items.length; i += limit) {
    const chunk = items.slice(i, i + limit);
    await Promise.all(chunk.map((item) => worker(item)));
  }
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const startMs = Date.now();
    const { cardIds, tags, addTagIds, removeTagIds } = await request.json();

    if (!Array.isArray(cardIds) || cardIds.length === 0) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    // Backward compatibility: full replacement mode.
    if (Array.isArray(tags)) {
      await bulkUpdateTags(cardIds, tags);
      const elapsedMs = Date.now() - startMs;
      console.log('[bulk-update-tags] Completed replacement mode', {
        cardCount: cardIds.length,
        elapsedMs,
      });
      return NextResponse.json({
        message: 'Tags updated successfully',
        updatedCount: cardIds.length,
        elapsedMs,
        mode: 'replace',
      });
    }

    if (!Array.isArray(addTagIds) || !Array.isArray(removeTagIds)) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const cards = await getCardsByIds(cardIds, { hydrationMode: 'cover-only' });

    await runWithConcurrencyLimit(cards, BULK_MUTATION_CONCURRENCY, async (card) => {
        const next = new Set(card.tags || []);
        addTagIds.forEach((tagId) => {
          if (typeof tagId === 'string' && tagId.trim()) next.add(tagId);
        });
        removeTagIds.forEach((tagId) => {
          if (typeof tagId === 'string' && tagId.trim()) next.delete(tagId);
        });
        await updateCard(card.docId, { tags: Array.from(next) });
      }
    );

    const elapsedMs = Date.now() - startMs;
    console.log('[bulk-update-tags] Completed add/remove mode', {
      cardCount: cards.length,
      addCount: addTagIds.length,
      removeCount: removeTagIds.length,
      concurrency: BULK_MUTATION_CONCURRENCY,
      elapsedMs,
    });
    return NextResponse.json({
      message: 'Tags updated successfully',
      updatedCount: cards.length,
      elapsedMs,
      mode: 'add-remove',
      concurrency: BULK_MUTATION_CONCURRENCY,
    });
  } catch (error) {
    console.error('Error in bulk-update-tags:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
} 