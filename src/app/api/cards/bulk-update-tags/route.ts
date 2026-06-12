import { bulkApplyTagDelta, bulkUpdateTags } from '@/lib/services/cardService';
import { API_INPUT_CAPS, isInputCapFailure, validateStringIdArray } from '@/lib/api/inputCaps';
import {
  apiRouteError,
  apiRouteInputCapError,
  apiRouteSuccess,
  withApiRouteHandler,
} from '@/lib/api/routeEnvelope';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  return withApiRouteHandler(
    request,
    {
      auth: 'admin',
      internalError: { code: 'CARD_BULK_TAGS_FAILED', message: 'Internal server error.' },
    },
    async ({ request }) => {
    const startMs = Date.now();
    const { cardIds, tags, addTagIds, removeTagIds } = await request.json();

    const cardIdsResult = validateStringIdArray(cardIds, {
      field: 'cardIds',
      max: API_INPUT_CAPS.bulkCardIdsMax,
      requireNonEmpty: true,
    });
    if (isInputCapFailure(cardIdsResult)) {
      const capError = cardIdsResult.error;
      return apiRouteInputCapError(capError, {
        code:
          capError.code === 'INPUT_ARRAY_EXCEEDED'
            ? 'CARD_BULK_TAGS_TOO_MANY'
            : 'CARD_BULK_TAGS_INVALID_BODY',
      });
    }
    const boundedCardIds = cardIdsResult.ids;

    if (Array.isArray(tags)) {
      const tagsResult = validateStringIdArray(tags, {
        field: 'tags',
        max: API_INPUT_CAPS.bulkTagIdsMax,
      });
      if (isInputCapFailure(tagsResult)) {
        const capError = tagsResult.error;
        return apiRouteInputCapError(capError, {
          code:
            capError.code === 'INPUT_ARRAY_EXCEEDED'
              ? 'CARD_BULK_TAGS_TAG_LIST_TOO_MANY'
              : 'CARD_BULK_TAGS_INVALID_BODY',
        });
      }

      await bulkUpdateTags(boundedCardIds, tagsResult.ids);
      const elapsedMs = Date.now() - startMs;
      console.log('[bulk-update-tags] Completed replacement mode', {
        cardCount: boundedCardIds.length,
        elapsedMs,
      });
      return apiRouteSuccess({
        message: 'Tags updated successfully',
        updatedCount: boundedCardIds.length,
        elapsedMs,
        mode: 'replace',
      });
    }

    if (!Array.isArray(addTagIds) || !Array.isArray(removeTagIds)) {
      return apiRouteError({
        code: 'CARD_BULK_TAGS_INVALID_BODY',
        message: 'Invalid request body.',
        status: 400,
        retryable: false,
      });
    }

    const addTagsResult = validateStringIdArray(addTagIds, {
      field: 'addTagIds',
      max: API_INPUT_CAPS.bulkTagIdsMax,
    });
    if (isInputCapFailure(addTagsResult)) {
      const capError = addTagsResult.error;
      return apiRouteInputCapError(capError, {
        code:
          capError.code === 'INPUT_ARRAY_EXCEEDED'
            ? 'CARD_BULK_TAGS_TAG_LIST_TOO_MANY'
            : 'CARD_BULK_TAGS_INVALID_BODY',
      });
    }

    const removeTagsResult = validateStringIdArray(removeTagIds, {
      field: 'removeTagIds',
      max: API_INPUT_CAPS.bulkTagIdsMax,
    });
    if (isInputCapFailure(removeTagsResult)) {
      const capError = removeTagsResult.error;
      return apiRouteInputCapError(capError, {
        code:
          capError.code === 'INPUT_ARRAY_EXCEEDED'
            ? 'CARD_BULK_TAGS_TAG_LIST_TOO_MANY'
            : 'CARD_BULK_TAGS_INVALID_BODY',
      });
    }

    await bulkApplyTagDelta(boundedCardIds, addTagsResult.ids, removeTagsResult.ids);

    const elapsedMs = Date.now() - startMs;
    console.log('[bulk-update-tags] Completed add/remove mode', {
      cardCount: boundedCardIds.length,
      addCount: addTagsResult.ids.length,
      removeCount: removeTagsResult.ids.length,
      elapsedMs,
    });
    return apiRouteSuccess({
      message: 'Tags updated successfully',
      updatedCount: boundedCardIds.length,
      elapsedMs,
      mode: 'add-remove',
    });
    }
  );
}
