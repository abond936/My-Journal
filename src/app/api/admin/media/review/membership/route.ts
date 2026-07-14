import { NextRequest } from 'next/server';
import { API_INPUT_CAPS, isInputCapFailure, validateStringIdArray } from '@/lib/api/inputCaps';
import {
  apiRouteError,
  apiRouteInputCapError,
  apiRouteSuccess,
  withApiRouteHandler,
} from '@/lib/api/routeEnvelope';
import { moveReviewClusterMembers } from '@/lib/services/provisionalClusterService';

export async function POST(request: NextRequest) {
  return withApiRouteHandler(
    request,
    {
      auth: 'admin',
      internalError: {
        code: 'REVIEW_CLUSTER_MEMBERSHIP_FAILED',
        message: 'Failed to update pile membership.',
      },
    },
    async ({ request }) => {
      const body = (await request.json()) as {
        mediaIds?: unknown;
        targetClusterId?: unknown;
      };

      const mediaIdsResult = validateStringIdArray(body.mediaIds, {
        field: 'mediaIds',
        max: API_INPUT_CAPS.bulkMediaIdsMax,
        requireNonEmpty: true,
      });
      if (isInputCapFailure(mediaIdsResult)) {
        return apiRouteInputCapError(mediaIdsResult.error, {
          code:
            mediaIdsResult.error.code === 'INPUT_ARRAY_EXCEEDED'
              ? 'REVIEW_MEMBERSHIP_MEDIA_TOO_MANY'
              : 'REVIEW_MEMBERSHIP_MEDIA_REQUIRED',
        });
      }

      let targetClusterId: string | null = null;
      if (body.targetClusterId !== undefined && body.targetClusterId !== null) {
        if (typeof body.targetClusterId !== 'string' || !body.targetClusterId.trim()) {
          return apiRouteError({
            code: 'REVIEW_MEMBERSHIP_TARGET_INVALID',
            message: 'targetClusterId must be a non-empty string or null for Unsorted.',
            status: 400,
            retryable: false,
          });
        }
        targetClusterId = body.targetClusterId.trim();
      }

      try {
        await moveReviewClusterMembers({
          mediaIds: mediaIdsResult.ids,
          targetClusterId,
        });
        return apiRouteSuccess({
          ok: true,
          mediaIds: mediaIdsResult.ids,
          targetClusterId,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Membership update failed.';
        if (message.includes('not found')) {
          return apiRouteError({
            code: 'REVIEW_CLUSTER_NOT_FOUND',
            message,
            status: 404,
            retryable: false,
          });
        }
        if (message.includes('not pending')) {
          return apiRouteError({
            code: 'REVIEW_CLUSTER_ACTION_CONFLICT',
            message,
            status: 409,
            retryable: false,
          });
        }
        throw error;
      }
    }
  );
}
