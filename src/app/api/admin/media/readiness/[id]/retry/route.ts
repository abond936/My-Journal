import { NextRequest } from 'next/server';
import { apiRouteError, apiRouteSuccess, withApiRouteHandler } from '@/lib/api/routeEnvelope';
import { retryMediaReadiness } from '@/lib/services/images/imageImportService';
import { MEDIA_READINESS_STAGE_NAMES } from '@/lib/utils/mediaReadiness';
import type { MediaReadinessStageName } from '@/lib/types/photo';

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  return withApiRouteHandler(
    request,
    {
      auth: 'admin',
      internalError: {
        code: 'MEDIA_READINESS_RETRY_FAILED',
        message: 'Failed to retry media processing.',
      },
    },
    async ({ request }) => {
      const { id } = await context.params;
      const body = (await request.json().catch(() => ({}))) as { stages?: unknown };
      if (
        body.stages !== undefined &&
        (!Array.isArray(body.stages) ||
          body.stages.some(stage => !MEDIA_READINESS_STAGE_NAMES.includes(stage as MediaReadinessStageName)))
      ) {
        return apiRouteError({
          code: 'MEDIA_READINESS_STAGES_INVALID',
          message: 'stages contains an unsupported readiness stage.',
          status: 400,
          retryable: false,
        });
      }
      try {
        const media = await retryMediaReadiness(
          id,
          body.stages as MediaReadinessStageName[] | undefined
        );
        return apiRouteSuccess({ media });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Retry failed';
        if (message === 'Media not found') {
          return apiRouteError({ code: 'MEDIA_NOT_FOUND', message, status: 404, retryable: false });
        }
        if (message.includes('unassessed') || message.includes('No retryable')) {
          return apiRouteError({
            code: 'MEDIA_READINESS_RETRY_CONFLICT',
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
