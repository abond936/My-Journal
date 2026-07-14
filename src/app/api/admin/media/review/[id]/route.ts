import { NextRequest } from 'next/server';
import { suggestedTagIdsByDimensionSchema } from '@/lib/types/provisionalCluster';
import {
  apiRouteError,
  apiRouteSuccess,
  withApiRouteHandler,
} from '@/lib/api/routeEnvelope';
import { updateReviewClusterSuggestedTags } from '@/lib/services/provisionalClusterService';

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, context: RouteContext) {
  return withApiRouteHandler(
    request,
    {
      auth: 'admin',
      internalError: { code: 'REVIEW_CLUSTER_UPDATE_FAILED', message: 'Failed to update review cluster.' },
    },
    async ({ request }) => {
      const { id } = await context.params;
      const body = (await request.json()) as { suggestedTagIds?: unknown };
      const parsed = suggestedTagIdsByDimensionSchema.safeParse(body.suggestedTagIds);
      if (!parsed.success) {
        return apiRouteError({
          code: 'REVIEW_SUGGESTED_TAGS_INVALID',
          message: 'suggestedTagIds must be a dimensional tag map.',
          status: 400,
          retryable: false,
        });
      }

      try {
        const cluster = await updateReviewClusterSuggestedTags(id, parsed.data);
        return apiRouteSuccess({ ok: true, cluster });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Update failed.';
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
            code: 'REVIEW_CLUSTER_NOT_PENDING',
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
