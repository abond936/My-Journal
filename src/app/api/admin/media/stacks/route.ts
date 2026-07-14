import { NextRequest } from 'next/server';
import {
  apiRouteError,
  apiRouteSuccess,
  withApiRouteHandler,
} from '@/lib/api/routeEnvelope';
import { createMediaStack, listActiveMediaStacks } from '@/lib/services/mediaStackService';
import { createMediaStackInputSchema } from '@/lib/types/mediaStack';

export async function GET(request: NextRequest) {
  return withApiRouteHandler(
    request,
    {
      auth: 'admin',
      internalError: { code: 'MEDIA_STACK_LIST_FAILED', message: 'Failed to list media stacks.' },
    },
    async () => {
      const stacks = await listActiveMediaStacks();
      return apiRouteSuccess({ ok: true, stacks });
    }
  );
}

export async function POST(request: NextRequest) {
  return withApiRouteHandler(
    request,
    {
      auth: 'admin',
      internalError: { code: 'MEDIA_STACK_CREATE_FAILED', message: 'Failed to create media stack.' },
    },
    async ({ request }) => {
      const body = await request.json();
      const parsed = createMediaStackInputSchema.safeParse(body);
      if (!parsed.success) {
        return apiRouteError({
          code: 'MEDIA_STACK_INPUT_INVALID',
          message: 'mediaIds (min 2) required to create a stack.',
          status: 400,
          retryable: false,
        });
      }

      try {
        const stack = await createMediaStack(parsed.data);
        return apiRouteSuccess({ ok: true, stack });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Create failed.';
        return apiRouteError({
          code: 'MEDIA_STACK_CREATE_CONFLICT',
          message,
          status: 409,
          retryable: false,
        });
      }
    }
  );
}
