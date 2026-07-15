import { z } from 'zod';
import {
  createPerson,
  createPersonGroup,
  createPersonRelationship,
  getArchiveIdentitySnapshot,
} from '@/lib/services/archiveIdentityService';
import { apiRouteError, apiRouteSuccess, withApiRouteHandler } from '@/lib/api/routeEnvelope';

export const dynamic = 'force-dynamic';

const createBodySchema = z.object({
  entity: z.enum(['person', 'relationship', 'group']),
  data: z.unknown(),
});

export async function GET(request: Request) {
  return withApiRouteHandler(request, { auth: 'admin' }, async () =>
    apiRouteSuccess(await getArchiveIdentitySnapshot())
  );
}

export async function POST(request: Request) {
  return withApiRouteHandler(request, { auth: 'admin' }, async ({ request }) => {
    const parsed = createBodySchema.safeParse(await request.json());
    if (!parsed.success) {
      return apiRouteError({
        code: 'ARCHIVE_IDENTITY_INVALID_BODY',
        message: 'Invalid archive identity request.',
        status: 400,
      });
    }
    const created =
      parsed.data.entity === 'person'
        ? await createPerson(parsed.data.data)
        : parsed.data.entity === 'relationship'
          ? await createPersonRelationship(parsed.data.data)
          : await createPersonGroup(parsed.data.data);
    return apiRouteSuccess(created, 201);
  });
}

