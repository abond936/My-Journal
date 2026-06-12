import { NextResponse } from 'next/server';
import { bulkApplyTagDelta, bulkUpdateTags } from '@/lib/services/cardService';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/authOptions';
import { API_INPUT_CAPS, validateStringIdArray, isInputCapFailure } from '@/lib/api/inputCaps';

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

    const cardIdsResult = validateStringIdArray(cardIds, {
      field: 'cardIds',
      max: API_INPUT_CAPS.bulkCardIdsMax,
      requireNonEmpty: true,
    });
    if (isInputCapFailure(cardIdsResult)) {
      const capError = cardIdsResult.error;
      return errorResponse(
        {
          ok: false,
          code:
            capError.code === 'INPUT_ARRAY_EXCEEDED'
              ? 'CARD_BULK_TAGS_TOO_MANY'
              : 'CARD_BULK_TAGS_INVALID_BODY',
          message: capError.message,
          severity: 'error',
          retryable: false,
        },
        400
      );
    }
    const boundedCardIds = cardIdsResult.ids;

    // Backward compatibility: full replacement mode.
    if (Array.isArray(tags)) {
      const tagsResult = validateStringIdArray(tags, {
        field: 'tags',
        max: API_INPUT_CAPS.bulkTagIdsMax,
      });
      if (isInputCapFailure(tagsResult)) {
        const capError = tagsResult.error;
        return errorResponse(
          {
            ok: false,
            code:
              capError.code === 'INPUT_ARRAY_EXCEEDED'
                ? 'CARD_BULK_TAGS_TAG_LIST_TOO_MANY'
                : 'CARD_BULK_TAGS_INVALID_BODY',
            message: capError.message,
            severity: 'error',
            retryable: false,
          },
          400
        );
      }

      await bulkUpdateTags(boundedCardIds, tagsResult.ids);
      const elapsedMs = Date.now() - startMs;
      console.log('[bulk-update-tags] Completed replacement mode', {
        cardCount: boundedCardIds.length,
        elapsedMs,
      });
      return NextResponse.json({
        message: 'Tags updated successfully',
        updatedCount: boundedCardIds.length,
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

    const addTagsResult = validateStringIdArray(addTagIds, {
      field: 'addTagIds',
      max: API_INPUT_CAPS.bulkTagIdsMax,
    });
    if (isInputCapFailure(addTagsResult)) {
      const capError = addTagsResult.error;
      return errorResponse(
        {
          ok: false,
          code:
            capError.code === 'INPUT_ARRAY_EXCEEDED'
              ? 'CARD_BULK_TAGS_TAG_LIST_TOO_MANY'
              : 'CARD_BULK_TAGS_INVALID_BODY',
          message: capError.message,
          severity: 'error',
          retryable: false,
        },
        400
      );
    }

    const removeTagsResult = validateStringIdArray(removeTagIds, {
      field: 'removeTagIds',
      max: API_INPUT_CAPS.bulkTagIdsMax,
    });
    if (isInputCapFailure(removeTagsResult)) {
      const capError = removeTagsResult.error;
      return errorResponse(
        {
          ok: false,
          code:
            capError.code === 'INPUT_ARRAY_EXCEEDED'
              ? 'CARD_BULK_TAGS_TAG_LIST_TOO_MANY'
              : 'CARD_BULK_TAGS_INVALID_BODY',
          message: capError.message,
          severity: 'error',
          retryable: false,
        },
        400
      );
    }

    await bulkApplyTagDelta(boundedCardIds, addTagsResult.ids, removeTagsResult.ids);

    const elapsedMs = Date.now() - startMs;
    console.log('[bulk-update-tags] Completed add/remove mode', {
      cardCount: boundedCardIds.length,
      addCount: addTagsResult.ids.length,
      removeCount: removeTagsResult.ids.length,
      elapsedMs,
    });
    return NextResponse.json({
      message: 'Tags updated successfully',
      updatedCount: boundedCardIds.length,
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