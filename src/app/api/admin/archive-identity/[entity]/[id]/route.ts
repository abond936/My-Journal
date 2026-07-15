import { z } from 'zod';
import {
  deletePersonGroup,
  deletePersonRelationship,
  updatePerson,
  updatePersonGroup,
} from '@/lib/services/archiveIdentityService';
import { apiRouteError, apiRouteSuccess, withApiRouteHandler } from '@/lib/api/routeEnvelope';

type RouteContext = { params: Promise<{ entity: string; id: string }> };
const entitySchema = z.enum(['person', 'relationship', 'group']);

export async function PATCH(request: Request, context: RouteContext) {
  return withApiRouteHandler(request, { auth: 'admin' }, async ({ request }) => {
    const { entity: rawEntity, id } = await context.params;
    const entity = entitySchema.safeParse(rawEntity);
    if (!entity.success || entity.data === 'relationship') {
      return apiRouteError({
        code: 'ARCHIVE_IDENTITY_INVALID_ENTITY',
        message: 'Only people and groups can be updated.',
        status: 400,
      });
    }
    const body = await request.json();
    const updated =
      entity.data === 'person' ? await updatePerson(id, body) : await updatePersonGroup(id, body);
    return apiRouteSuccess(updated);
  });
}

export async function DELETE(request: Request, context: RouteContext) {
  return withApiRouteHandler(request, { auth: 'admin' }, async () => {
    const { entity: rawEntity, id } = await context.params;
    const entity = entitySchema.safeParse(rawEntity);
    if (!entity.success || entity.data === 'person') {
      return apiRouteError({
        code: 'ARCHIVE_IDENTITY_INVALID_ENTITY',
        message: 'People are merged or deactivated, not deleted.',
        status: 400,
      });
    }
    if (entity.data === 'relationship') await deletePersonRelationship(id);
    else await deletePersonGroup(id);
    return apiRouteSuccess({ deleted: true });
  });
}

