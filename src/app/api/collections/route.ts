import { isAdminSession } from '@/lib/auth/readerAccess';
import { apiRouteSuccess, withApiRouteHandler } from '@/lib/api/routeEnvelope';
import { listReaderCollections } from '@/lib/services/collections/collectionProjectionReadService';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  return withApiRouteHandler(
    request,
    {
      auth: 'authenticated',
      internalError: { code: 'COLLECTIONS_READ_FAILED', message: 'Collections could not be loaded.' },
    },
    async ({ session }) => apiRouteSuccess({
      collections: await listReaderCollections({ includeDrafts: isAdminSession(session) }),
    })
  );
}
