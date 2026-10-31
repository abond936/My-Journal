import { isAdminSession } from '@/lib/auth/readerAccess';
import { apiRouteSuccess, withApiRouteHandler } from '@/lib/api/routeEnvelope';
import { listReaderCollections } from '@/lib/services/collections/collectionProjectionReadService';
import { filterCollectionsForAudience } from '@/lib/auth/audienceAccess';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  return withApiRouteHandler(
    request,
    {
      auth: 'authenticated',
      internalError: { code: 'COLLECTIONS_READ_FAILED', message: 'Collections could not be loaded.' },
    },
    async ({ session }) => {
      const collections = await listReaderCollections({ includeDrafts: isAdminSession(session) });
      return apiRouteSuccess({
        collections: await filterCollectionsForAudience(session, collections),
      });
    }
  );
}
