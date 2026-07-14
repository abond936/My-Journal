import { NextRequest } from 'next/server';
import {
  apiRouteError,
  apiRouteSuccess,
  withApiRouteHandler,
} from '@/lib/api/routeEnvelope';
import {
  dissolveMediaStack,
  getMediaStack,
  setMediaStackHero,
} from '@/lib/services/mediaStackService';

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  return withApiRouteHandler(
    request,
    {
      auth: 'admin',
      internalError: { code: 'MEDIA_STACK_GET_FAILED', message: 'Failed to load media stack.' },
    },
    async () => {
      const { id } = await context.params;
      const stack = await getMediaStack(id);
      if (!stack) {
        return apiRouteError({
          code: 'MEDIA_STACK_NOT_FOUND',
          message: 'Stack not found.',
          status: 404,
          retryable: false,
        });
      }
      return apiRouteSuccess({ ok: true, stack });
    }
  );
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  return withApiRouteHandler(
    request,
    {
      auth: 'admin',
      internalError: { code: 'MEDIA_STACK_UPDATE_FAILED', message: 'Failed to update media stack.' },
    },
    async ({ request }) => {
      const { id } = await context.params;
      const body = (await request.json()) as { heroMediaId?: unknown };
      if (typeof body.heroMediaId !== 'string' || !body.heroMediaId.trim()) {
        return apiRouteError({
          code: 'MEDIA_STACK_HERO_REQUIRED',
          message: 'heroMediaId is required.',
          status: 400,
          retryable: false,
        });
      }

      try {
        const stack = await setMediaStackHero(id, body.heroMediaId.trim());
        return apiRouteSuccess({ ok: true, stack });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Update failed.';
        if (message.includes('not found')) {
          return apiRouteError({
            code: 'MEDIA_STACK_NOT_FOUND',
            message,
            status: 404,
            retryable: false,
          });
        }
        return apiRouteError({
          code: 'MEDIA_STACK_UPDATE_CONFLICT',
          message,
          status: 409,
          retryable: false,
        });
      }
    }
  );
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  return withApiRouteHandler(
    request,
    {
      auth: 'admin',
      internalError: { code: 'MEDIA_STACK_DISSOLVE_FAILED', message: 'Failed to dissolve media stack.' },
    },
    async () => {
      const { id } = await context.params;
      try {
        const stack = await dissolveMediaStack(id);
        return apiRouteSuccess({ ok: true, stack });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Dissolve failed.';
        if (message.includes('not found')) {
          return apiRouteError({
            code: 'MEDIA_STACK_NOT_FOUND',
            message,
            status: 404,
            retryable: false,
          });
        }
        return apiRouteError({
          code: 'MEDIA_STACK_DISSOLVE_CONFLICT',
          message,
          status: 409,
          retryable: false,
        });
      }
    }
  );
}
