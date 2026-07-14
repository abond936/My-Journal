import { NextRequest } from 'next/server';
import { API_INPUT_CAPS, isInputCapFailure, validateStringIdArray } from '@/lib/api/inputCaps';
import {
  apiRouteError,
  apiRouteInputCapError,
  apiRouteSuccess,
  withApiRouteHandler,
} from '@/lib/api/routeEnvelope';
import {
  acceptReviewClusterPile,
  acceptReviewClusterTags,
  dismissReviewCluster,
  splitReviewCluster,
} from '@/lib/services/provisionalClusterService';

type RouteContext = { params: Promise<{ id: string }> };

const REVIEW_ACTIONS = ['accept-tags', 'accept-pile', 'dismiss', 'split'] as const;
type ReviewAction = (typeof REVIEW_ACTIONS)[number];

function isReviewAction(value: unknown): value is ReviewAction {
  return typeof value === 'string' && (REVIEW_ACTIONS as readonly string[]).includes(value);
}

export async function POST(request: NextRequest, context: RouteContext) {
  return withApiRouteHandler(
    request,
    {
      auth: 'admin',
      internalError: { code: 'REVIEW_CLUSTER_ACTION_FAILED', message: 'Failed to run review action.' },
    },
    async ({ request }) => {
      const { id } = await context.params;
      const body = (await request.json()) as { action?: unknown; splitOffMediaIds?: unknown };
      if (!isReviewAction(body.action)) {
        return apiRouteError({
          code: 'REVIEW_ACTION_INVALID',
          message: 'action must be one of: accept-tags, accept-pile, dismiss, split.',
          status: 400,
          retryable: false,
        });
      }

      try {
        if (body.action === 'accept-tags') {
          const cluster = await acceptReviewClusterTags(id);
          return apiRouteSuccess({ ok: true, action: body.action, cluster });
        }

        if (body.action === 'accept-pile') {
          const cluster = await acceptReviewClusterPile(id);
          return apiRouteSuccess({ ok: true, action: body.action, cluster });
        }

        if (body.action === 'dismiss') {
          const cluster = await dismissReviewCluster(id);
          return apiRouteSuccess({ ok: true, action: body.action, cluster });
        }

        const splitResult = validateStringIdArray(body.splitOffMediaIds, {
          field: 'splitOffMediaIds',
          max: API_INPUT_CAPS.bulkMediaIdsMax,
          requireNonEmpty: true,
        });
        if (isInputCapFailure(splitResult)) {
          return apiRouteInputCapError(splitResult.error, {
            code:
              splitResult.error.code === 'INPUT_ARRAY_EXCEEDED'
                ? 'REVIEW_SPLIT_MEDIA_TOO_MANY'
                : 'REVIEW_SPLIT_MEDIA_REQUIRED',
          });
        }

        const { original, split } = await splitReviewCluster(id, splitResult.ids);
        return apiRouteSuccess({ ok: true, action: body.action, original, split });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Action failed.';
        if (message.includes('not found')) {
          return apiRouteError({
            code: 'REVIEW_CLUSTER_NOT_FOUND',
            message,
            status: 404,
            retryable: false,
          });
        }
        if (message.includes('not pending') || message.includes('Split must')) {
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
