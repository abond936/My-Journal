import { NextResponse } from 'next/server';
import { bulkApplyTagDelta, bulkUpdateTags } from '@/lib/services/cardService';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/authOptions';

export const dynamic = 'force-dynamic';

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

    await bulkApplyTagDelta(cardIds, addTagIds, removeTagIds);

    const elapsedMs = Date.now() - startMs;
    console.log('[bulk-update-tags] Completed add/remove mode', {
      cardCount: cardIds.length,
      addCount: addTagIds.length,
      removeCount: removeTagIds.length,
      elapsedMs,
    });
    return NextResponse.json({
      message: 'Tags updated successfully',
      updatedCount: cardIds.length,
      elapsedMs,
      mode: 'add-remove',
    });
  } catch (error) {
    console.error('Error in bulk-update-tags:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
} 