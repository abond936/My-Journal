import { apiRouteSuccess, withApiRouteHandler } from '@/lib/api/routeEnvelope';
import { getGalleryCardMediaIndex } from '@/lib/services/cards/cardReadService';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  return withApiRouteHandler(
    request,
    {
      auth: 'admin',
      internalError: {
        code: 'GALLERY_MEDIA_INDEX_FAILED',
        message: 'Could not load Gallery Card groups.',
      },
    },
    async () => apiRouteSuccess(await getGalleryCardMediaIndex())
  );
}
