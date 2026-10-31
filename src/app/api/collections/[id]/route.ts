import { isAdminSession } from '@/lib/auth/readerAccess';
import { apiRouteError, apiRouteSuccess, withApiRouteHandler } from '@/lib/api/routeEnvelope';
import { getReaderCollectionStructure } from '@/lib/services/collections/collectionProjectionReadService';
import { hydrateCards } from '@/lib/services/cards/cardMediaHydrationService';
import { protectCardsForReader } from '@/lib/utils/readerMediaDelivery';

export const dynamic = 'force-dynamic';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return withApiRouteHandler(
    request,
    {
      auth: 'authenticated',
      internalError: { code: 'COLLECTION_READ_FAILED', message: 'The Collection could not be loaded.' },
    },
    async ({ session }) => {
      const { id } = await params;
      const structure = await getReaderCollectionStructure({
        collectionId: id,
        includeDrafts: isAdminSession(session),
      });
      if (!structure) {
        return apiRouteError({
          code: 'COLLECTION_NOT_FOUND',
          message: 'Collection not found.',
          status: 404,
          retryable: false,
        });
      }
      if (isAdminSession(session)) return apiRouteSuccess(structure);
      return apiRouteSuccess({
        ...structure,
        cards: protectCardsForReader(await hydrateCards(structure.cards)),
      });
    }
  );
}
