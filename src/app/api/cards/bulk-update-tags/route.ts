import { NextResponse } from 'next/server';
import { bulkApplyTagDelta, bulkUpdateTags } from '@/lib/services/cardService';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/authOptions';

type ApiErrorPayload = {
  ok: false;
  code: string;
  message: string;
  severity: 'error' | 'warning';
  retryable: boolean;
  error?: string;
};

function errorResponse(payload: ApiErrorPayload, status: number) {
  return NextResponse.json(payload, { status });
}

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== 'admin') {
    return errorResponse(
      {
        ok: false,
        code: 'AUTH_FORBIDDEN',
        message: 'Unauthorized.',
        severity: 'error',
        retryable: false,
      },
      403
    );
  }

  try {
    const startMs = Date.now();
    const { cardIds, tags, addTagIds, removeTagIds } = await request.json();

    if (!Array.isArray(cardIds) || cardIds.length === 0) {
      return errorResponse(
        {
          ok: false,
          code: 'CARD_BULK_TAGS_INVALID_BODY',
          message: 'Invalid request body.',
          severity: 'error',
          retryable: false,
        },
        400
      );
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
      return errorResponse(
        {
          ok: false,
          code: 'CARD_BULK_TAGS_INVALID_BODY',
          message: 'Invalid request body.',
          severity: 'error',
          retryable: false,
        },
        400
      );
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
    const message = error instanceof Error ? error.message : 'Unknown error';
    return errorResponse(
      {
        ok: false,
        code: 'CARD_BULK_TAGS_FAILED',
        message: 'Internal server error.',
        severity: 'error',
        retryable: true,
        error: message,
      },
      500
    );
  }
} 