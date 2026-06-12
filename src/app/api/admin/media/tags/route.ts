import { NextRequest } from 'next/server';
import { bulkApplyMediaTags } from '@/lib/services/images/imageImportService';
import { recomputeCardsMediaSignalsForMediaIds } from '@/lib/services/cardService';
import { API_INPUT_CAPS, isInputCapFailure, validateStringIdArray } from '@/lib/api/inputCaps';
import {
  apiRouteError,
  apiRouteInputCapError,
  apiRouteSuccess,
  withApiRouteHandler,
} from '@/lib/api/routeEnvelope';

/**
 * POST — bulk-edit tags on many media docs.
 * mode:
 * - add (default): union existing + selected
 * - replace: replace with selected
 * - remove: remove selected from existing
 */
export async function POST(request: NextRequest) {
  return withApiRouteHandler(
    request,
    {
      auth: 'admin',
      internalError: { code: 'MEDIA_TAGS_BULK_UPDATE_FAILED', message: 'Failed to update media tags.' },
    },
    async ({ request }) => {
      const body = (await request.json()) as {
        mediaIds?: unknown;
        tags?: unknown;
        mode?: unknown;
        subjectTagId?: unknown;
      };
      const mediaIds = body.mediaIds;
      const tagsProvided = Object.prototype.hasOwnProperty.call(body, 'tags');
      const tags = body.tags;
      const mode = body.mode;
      const subjectTagIdProvided = Object.prototype.hasOwnProperty.call(body, 'subjectTagId');

      const mediaIdsResult = validateStringIdArray(mediaIds, {
        field: 'mediaIds',
        max: API_INPUT_CAPS.bulkMediaIdsMax,
        requireNonEmpty: true,
      });
      if (isInputCapFailure(mediaIdsResult)) {
        const capError = mediaIdsResult.error;
        return apiRouteInputCapError(capError, {
          code:
            capError.code === 'INPUT_ARRAY_EXCEEDED'
              ? 'MEDIA_TAGS_MEDIA_IDS_TOO_MANY'
              : 'MEDIA_TAGS_MEDIA_IDS_REQUIRED',
        });
      }

      if (!tagsProvided && !subjectTagIdProvided) {
        return apiRouteError({
          code: 'MEDIA_TAGS_UPDATES_REQUIRED',
          message: 'Provide tags and/or subjectTagId.',
          status: 400,
          retryable: false,
        });
      }

      let validatedTagList: string[] | undefined;
      if (tagsProvided) {
        const tagsResult = validateStringIdArray(tags, {
          field: 'tags',
          max: API_INPUT_CAPS.bulkTagIdsMax,
        });
        if (isInputCapFailure(tagsResult)) {
          const capError = tagsResult.error;
          return apiRouteInputCapError(capError, {
            code:
              capError.code === 'INPUT_ARRAY_EXCEEDED'
                ? 'MEDIA_TAGS_TAG_LIST_TOO_MANY'
                : 'MEDIA_TAGS_TAG_IDS_INVALID',
          });
        }
        validatedTagList = tagsResult.ids;
      }

      if (mode !== undefined && mode !== 'add' && mode !== 'replace' && mode !== 'remove') {
        return apiRouteError({
          code: 'MEDIA_TAGS_MODE_INVALID',
          message: 'mode must be one of: add, replace, remove.',
          status: 400,
          retryable: false,
        });
      }
      if (
        subjectTagIdProvided &&
        body.subjectTagId !== null &&
        typeof body.subjectTagId !== 'string'
      ) {
        return apiRouteError({
          code: 'MEDIA_TAGS_SUBJECT_INVALID',
          message: 'subjectTagId must be a string or null.',
          status: 400,
          retryable: false,
        });
      }

      const ids = mediaIdsResult.ids;
      const effectiveMode = mode === 'replace' || mode === 'remove' || mode === 'add' ? mode : 'add';
      if (ids.length === 0) {
        return apiRouteError({
          code: 'MEDIA_TAGS_MEDIA_IDS_INVALID',
          message: 'No valid media IDs.',
          status: 400,
          retryable: false,
        });
      }

      const { updatedIds, updatedMedia } = await bulkApplyMediaTags(ids, {
        ...(tagsProvided ? { tagIds: validatedTagList ?? [], mode: effectiveMode } : {}),
        ...(subjectTagIdProvided
          ? {
              subjectTagId: typeof body.subjectTagId === 'string' ? body.subjectTagId.trim() : null,
              subjectTagIdProvided: true,
            }
          : {}),
      });
      if (updatedIds.length) {
        await recomputeCardsMediaSignalsForMediaIds(updatedIds);
      }

      return apiRouteSuccess({
        ok: true,
        updated: updatedIds.length,
        mode: effectiveMode,
        media: updatedMedia,
      });
    }
  );
}
