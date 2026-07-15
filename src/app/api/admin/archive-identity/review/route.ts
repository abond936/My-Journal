import { apiRouteSuccess, withApiRouteHandler } from '@/lib/api/routeEnvelope';
import { getArchiveIdentityReview } from '@/lib/services/archiveIdentityService';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  return withApiRouteHandler(
    request,
    {
      auth: 'admin',
      internalError: {
        code: 'ARCHIVE_IDENTITY_REVIEW_FAILED',
        message: 'The identity review could not be prepared.',
      },
    },
    async () => apiRouteSuccess(await getArchiveIdentityReview())
  );
}
