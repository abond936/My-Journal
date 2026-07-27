import { NextRequest } from 'next/server';
import { bulkApplyMediaTags } from '@/lib/services/images/imageImportService';
import {
  createMediaTagReconciliationOperation,
  processMediaTagReconciliationOperation,
  reconcileMediaTagDependents,
} from '@/lib/services/mediaTagReconciliationService';
import { API_INPUT_CAPS, isInputCapFailure, validateStringIdArray } from '@/lib/api/inputCaps';
import {
  apiRouteError,
  apiRouteInputCapError,
  apiRouteSuccess,
  withApiRouteHandler,
} from '@/lib/api/routeEnvelope';
import { temporalValueSchema } from '@/lib/types/temporal';
import {
  dimensionResolutionSchema,
  type DimensionResolution,
} from '@/lib/types/dimensionReview';

const DIMENSIONS = ['who', 'what', 'when', 'where'] as const;

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
        addTagIds?: unknown;
        removeTagIds?: unknown;
        subjectTagId?: unknown;
        subjectTagIds?: unknown;
        addSubjectTagIds?: unknown;
        removeSubjectTagIds?: unknown;
        temporal?: unknown;
        temporalSubject?: unknown;
        dimensionReviewUpdates?: unknown;
        dimensionResolutionUpdates?: unknown;
      };
      const mediaIds = body.mediaIds;
      const tagsProvided = Object.prototype.hasOwnProperty.call(body, 'tags');
      const tags = body.tags;
      const mode = body.mode;
      const addTagIdsProvided = Object.prototype.hasOwnProperty.call(body, 'addTagIds');
      const removeTagIdsProvided = Object.prototype.hasOwnProperty.call(body, 'removeTagIds');
      const subjectTagIdProvided = Object.prototype.hasOwnProperty.call(body, 'subjectTagId');
      const subjectTagIdsProvided = Object.prototype.hasOwnProperty.call(body, 'subjectTagIds');
      const addSubjectTagIdsProvided = Object.prototype.hasOwnProperty.call(body, 'addSubjectTagIds');
      const removeSubjectTagIdsProvided = Object.prototype.hasOwnProperty.call(body, 'removeSubjectTagIds');
      const temporalProvided = Object.prototype.hasOwnProperty.call(body, 'temporal');
      const temporalSubjectProvided = Object.prototype.hasOwnProperty.call(body, 'temporalSubject');
      const reviewUpdatesProvided = Object.prototype.hasOwnProperty.call(body, 'dimensionReviewUpdates');
      const resolutionUpdatesProvided = Object.prototype.hasOwnProperty.call(body, 'dimensionResolutionUpdates');

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

      if (
        !tagsProvided &&
        !addTagIdsProvided &&
        !removeTagIdsProvided &&
        !subjectTagIdProvided &&
        !subjectTagIdsProvided &&
        !addSubjectTagIdsProvided &&
        !removeSubjectTagIdsProvided &&
        !temporalProvided &&
        !temporalSubjectProvided &&
        !reviewUpdatesProvided &&
        !resolutionUpdatesProvided
      ) {
        return apiRouteError({
          code: 'MEDIA_TAGS_UPDATES_REQUIRED',
          message: 'Provide tags, subjects, and/or a date.',
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
      const validateOptionalIds = (
        provided: boolean,
        value: unknown,
        field: string,
        code: string
      ) => {
        if (!provided) return { ids: undefined as string[] | undefined };
        const result = validateStringIdArray(value, {
          field,
          max: API_INPUT_CAPS.bulkTagIdsMax,
        });
        if (isInputCapFailure(result)) {
          return { response: apiRouteInputCapError(result.error, { code }) };
        }
        return { ids: result.ids };
      };
      const addTagIdsResult = validateOptionalIds(
        addTagIdsProvided,
        body.addTagIds,
        'addTagIds',
        'MEDIA_TAGS_ADD_IDS_INVALID'
      );
      if (addTagIdsResult.response) return addTagIdsResult.response;
      const removeTagIdsResult = validateOptionalIds(
        removeTagIdsProvided,
        body.removeTagIds,
        'removeTagIds',
        'MEDIA_TAGS_REMOVE_IDS_INVALID'
      );
      if (removeTagIdsResult.response) return removeTagIdsResult.response;
      const addSubjectTagIdsResult = validateOptionalIds(
        addSubjectTagIdsProvided,
        body.addSubjectTagIds,
        'addSubjectTagIds',
        'MEDIA_TAGS_ADD_SUBJECT_IDS_INVALID'
      );
      if (addSubjectTagIdsResult.response) return addSubjectTagIdsResult.response;
      const removeSubjectTagIdsResult = validateOptionalIds(
        removeSubjectTagIdsProvided,
        body.removeSubjectTagIds,
        'removeSubjectTagIds',
        'MEDIA_TAGS_REMOVE_SUBJECT_IDS_INVALID'
      );
      if (removeSubjectTagIdsResult.response) return removeSubjectTagIdsResult.response;

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
      let validatedSubjectTagIds: string[] | undefined;
      if (subjectTagIdsProvided) {
        const result = validateStringIdArray(body.subjectTagIds, {
          field: 'subjectTagIds',
          max: API_INPUT_CAPS.bulkTagIdsMax,
        });
        if (isInputCapFailure(result)) {
          return apiRouteInputCapError(result.error, { code: 'MEDIA_TAGS_SUBJECTS_INVALID' });
        }
        validatedSubjectTagIds = result.ids;
      }
      const validatedTemporal =
        temporalProvided && body.temporal !== null
          ? temporalValueSchema.safeParse(body.temporal)
          : null;
      if (temporalProvided && body.temporal !== null && !validatedTemporal?.success) {
        return apiRouteError({
          code: 'MEDIA_TEMPORAL_INVALID',
          message: 'The supplied date is not valid.',
          status: 400,
          retryable: false,
        });
      }
      if (temporalSubjectProvided && typeof body.temporalSubject !== 'boolean') {
        return apiRouteError({
          code: 'MEDIA_TAGS_TEMPORAL_SUBJECT_INVALID',
          message: 'The structured-date subject selection must be true or false.',
          status: 400,
          retryable: false,
        });
      }
      const reviewUpdates: Partial<Record<(typeof DIMENSIONS)[number], boolean>> = {};
      if (reviewUpdatesProvided) {
        if (!body.dimensionReviewUpdates || typeof body.dimensionReviewUpdates !== 'object') {
          return apiRouteError({ code: 'MEDIA_REVIEW_INVALID', message: 'Review updates are invalid.', status: 400, retryable: false });
        }
        for (const dimension of DIMENSIONS) {
          const candidate = (body.dimensionReviewUpdates as Record<string, unknown>)[dimension];
          if (candidate !== undefined) {
            if (typeof candidate !== 'boolean') {
              return apiRouteError({ code: 'MEDIA_REVIEW_INVALID', message: 'Review updates must be boolean.', status: 400, retryable: false });
            }
            reviewUpdates[dimension] = candidate;
          }
        }
      }
      const resolutionUpdates: Partial<Record<(typeof DIMENSIONS)[number], DimensionResolution | null>> = {};
      if (resolutionUpdatesProvided) {
        if (!body.dimensionResolutionUpdates || typeof body.dimensionResolutionUpdates !== 'object') {
          return apiRouteError({ code: 'MEDIA_RESOLUTION_INVALID', message: 'Resolution updates are invalid.', status: 400, retryable: false });
        }
        for (const dimension of DIMENSIONS) {
          const candidate = (body.dimensionResolutionUpdates as Record<string, unknown>)[dimension];
          if (candidate !== undefined) {
            if (candidate === null) resolutionUpdates[dimension] = null;
            else {
              const parsed = dimensionResolutionSchema.safeParse(candidate);
              if (!parsed.success) {
                return apiRouteError({ code: 'MEDIA_RESOLUTION_INVALID', message: 'Resolution is invalid.', status: 400, retryable: false });
              }
              resolutionUpdates[dimension] = parsed.data;
            }
          }
        }
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
        ...(addTagIdsProvided ? { addTagIds: addTagIdsResult.ids ?? [] } : {}),
        ...(removeTagIdsProvided ? { removeTagIds: removeTagIdsResult.ids ?? [] } : {}),
        ...(subjectTagIdProvided
          ? {
              subjectTagId: typeof body.subjectTagId === 'string' ? body.subjectTagId.trim() : null,
              subjectTagIdProvided: true,
            }
          : {}),
        ...(subjectTagIdsProvided
          ? { subjectTagIds: validatedSubjectTagIds ?? [], subjectTagIdsProvided: true }
          : {}),
        ...(addSubjectTagIdsProvided
          ? { addSubjectTagIds: addSubjectTagIdsResult.ids ?? [] }
          : {}),
        ...(removeSubjectTagIdsProvided
          ? { removeSubjectTagIds: removeSubjectTagIdsResult.ids ?? [] }
          : {}),
        ...(temporalProvided
          ? {
              temporal:
                body.temporal === null
                  ? null
                  : validatedTemporal?.success
                    ? validatedTemporal.data
                    : null,
              temporalProvided: true,
            }
          : {}),
        ...(temporalSubjectProvided
          ? { temporalSubject: body.temporalSubject === true, temporalSubjectProvided: true }
          : {}),
        ...(reviewUpdatesProvided ? { dimensionReviewUpdates: reviewUpdates } : {}),
        ...(resolutionUpdatesProvided ? { dimensionResolutionUpdates: resolutionUpdates } : {}),
      }, { reconcile: false });
      let reconciliationOperationId: string | null = null;
      const tagDependentsChanged =
        tagsProvided ||
        addTagIdsProvided ||
        removeTagIdsProvided ||
        subjectTagIdProvided ||
        subjectTagIdsProvided ||
        addSubjectTagIdsProvided ||
        removeSubjectTagIdsProvided ||
        temporalProvided ||
        temporalSubjectProvided ||
        reviewUpdatesProvided ||
        resolutionUpdatesProvided;
      if (updatedIds.length && tagDependentsChanged) {
        try {
          reconciliationOperationId = await createMediaTagReconciliationOperation(updatedIds);
          await processMediaTagReconciliationOperation(reconciliationOperationId);
        } catch (operationError) {
          if (!reconciliationOperationId) {
            console.error('[media tags] Could not persist reconciliation operation; reconciling inline.', operationError);
            await reconcileMediaTagDependents(updatedIds);
          } else {
            console.error('[media tags] Reconciliation remains durably retryable.', {
              operationId: reconciliationOperationId,
              error: operationError,
            });
          }
        }
      }

      return apiRouteSuccess({
        ok: true,
        updated: updatedIds.length,
        mode: effectiveMode,
        media: updatedMedia,
        reconciliationOperationId,
      });
    }
  );
}
