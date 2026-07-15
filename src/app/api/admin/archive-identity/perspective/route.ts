import { z } from 'zod';
import { updateArchivePerspectivePersonId } from '@/lib/services/archiveIdentityService';
import { apiRouteError, apiRouteSuccess, withApiRouteHandler } from '@/lib/api/routeEnvelope';

const bodySchema = z.object({ archivePerspectivePersonId: z.string().min(1).nullable() });

export async function PATCH(request: Request) {
  return withApiRouteHandler(request, { auth: 'admin' }, async ({ request }) => {
    const parsed = bodySchema.safeParse(await request.json());
    if (!parsed.success) {
      return apiRouteError({
        code: 'ARCHIVE_PERSPECTIVE_INVALID_BODY',
        message: 'Invalid archive perspective.',
        status: 400,
      });
    }
    const settings = await updateArchivePerspectivePersonId(
      parsed.data.archivePerspectivePersonId ?? undefined
    );
    return apiRouteSuccess({ archivePerspectivePersonId: settings.archivePerspectivePersonId });
  });
}

