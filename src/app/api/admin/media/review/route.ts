import { NextRequest } from 'next/server';
import { reviewLensSchema } from '@/lib/types/provisionalCluster';
import { API_INPUT_CAPS, isInputCapFailure, validateStringIdArray } from '@/lib/api/inputCaps';
import {
  apiRouteError,
  apiRouteInputCapError,
  apiRouteSuccess,
  withApiRouteHandler,
} from '@/lib/api/routeEnvelope';
import {
  createEmptyReviewCluster,
  generateReviewClusters,
  listAllPendingReviewClusters,
  listPendingReviewClusters,
} from '@/lib/services/provisionalClusterService';

export async function GET(request: NextRequest) {
  return withApiRouteHandler(
    request,
    {
      auth: 'admin',
      internalError: { code: 'REVIEW_CLUSTERS_LIST_FAILED', message: 'Failed to load review clusters.' },
    },
    async ({ request }) => {
      const allPending = request.nextUrl.searchParams.get('allPending') === 'true';
      if (allPending) {
        const clusters = await listAllPendingReviewClusters();
        return apiRouteSuccess({ ok: true, clusters, lens: 'all' });
      }

      const lensParam = request.nextUrl.searchParams.get('lens') ?? 'suggested';
      const lensResult = reviewLensSchema.safeParse(lensParam);
      if (!lensResult.success) {
        return apiRouteError({
          code: 'REVIEW_LENS_INVALID',
          message: 'lens must be one of: suggested, when, where, who, what.',
          status: 400,
          retryable: false,
        });
      }

      const clusters = await listPendingReviewClusters(lensResult.data);
      return apiRouteSuccess({ ok: true, clusters, lens: lensResult.data });
    }
  );
}

export async function POST(request: NextRequest) {
  return withApiRouteHandler(
    request,
    {
      auth: 'admin',
      internalError: { code: 'REVIEW_CLUSTERS_GENERATE_FAILED', message: 'Failed to generate review clusters.' },
    },
    async ({ request }) => {
      const body = (await request.json()) as {
        mode?: unknown;
        lens?: unknown;
        mediaIds?: unknown;
        title?: unknown;
      };

      if (body.mode === 'create-empty') {
        const lensResult = reviewLensSchema.safeParse(body.lens ?? 'suggested');
        if (!lensResult.success) {
          return apiRouteError({
            code: 'REVIEW_LENS_INVALID',
            message: 'lens must be one of: suggested, when, where, who, what.',
            status: 400,
            retryable: false,
          });
        }
        const title = typeof body.title === 'string' ? body.title.trim() : '';
        if (!title) {
          return apiRouteError({
            code: 'REVIEW_TITLE_REQUIRED',
            message: 'title is required for create-empty.',
            status: 400,
            retryable: false,
          });
        }
        const cluster = await createEmptyReviewCluster({ title, lens: lensResult.data });
        return apiRouteSuccess({ ok: true, mode: 'create-empty', cluster });
      }

      const lensResult = reviewLensSchema.safeParse(body.lens ?? 'suggested');
      if (!lensResult.success) {
        return apiRouteError({
          code: 'REVIEW_LENS_INVALID',
          message: 'lens must be one of: suggested, when, where, who, what.',
          status: 400,
          retryable: false,
        });
      }

      let mediaIds: string[] | undefined;
      if (body.mediaIds !== undefined) {
        const mediaIdsResult = validateStringIdArray(body.mediaIds, {
          field: 'mediaIds',
          max: API_INPUT_CAPS.bulkMediaIdsMax,
        });
        if (isInputCapFailure(mediaIdsResult)) {
          return apiRouteInputCapError(mediaIdsResult.error, {
            code:
              mediaIdsResult.error.code === 'INPUT_ARRAY_EXCEEDED'
                ? 'REVIEW_MEDIA_IDS_TOO_MANY'
                : 'REVIEW_MEDIA_IDS_INVALID',
          });
        }
        mediaIds = mediaIdsResult.ids;
      }

      const result = await generateReviewClusters({
        lens: lensResult.data,
        mediaIds,
      });
      return apiRouteSuccess({
        ok: true,
        lens: lensResult.data,
        created: result.created,
        clusters: result.clusters,
      });
    }
  );
}
