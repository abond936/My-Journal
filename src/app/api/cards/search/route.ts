import { getCards, getCardsByIds } from '@/lib/services/cardService';
import { Card } from '@/lib/types/card';
import { PaginatedResult } from '@/lib/types/services';
import { isTypesenseConfigured } from '@/lib/config/typesense';
import { searchCardsFiltered } from '@/lib/services/typesenseService';
import { isInputCapFailure, parseListPageLimit } from '@/lib/api/inputCaps';
import {
  apiRouteError,
  apiRouteInternalError,
  apiRouteListLimitError,
  apiRouteSuccess,
  withApiRouteHandler,
} from '@/lib/api/routeEnvelope';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  return withApiRouteHandler(
    request,
    {
      auth: 'authenticated',
      internalError: { code: 'CARD_SEARCH_FAILED', message: 'Internal server error.' },
    },
    async ({ session, request }) => {
      const { searchParams } = new URL(request.url);
      const q = searchParams.get('q');

      if (!q) {
        return apiRouteError({
          code: 'CARD_SEARCH_QUERY_REQUIRED',
          message: 'Query parameter "q" is required.',
          status: 400,
          retryable: false,
        });
      }

      const limitResult = parseListPageLimit(searchParams.get('limit'));
      if (isInputCapFailure(limitResult)) {
        return apiRouteListLimitError(limitResult.error);
      }
      const limit = limitResult.value;
      const lastDocId = searchParams.get('lastDocId') || undefined;
      const status = session.user?.role === 'admin' ? 'all' : 'published';

      let result: PaginatedResult<Card>;

      if (isTypesenseConfigured()) {
        const page = searchParams.has('page') ? parseInt(searchParams.get('page')!, 10) : 0;
        const searchResult = await searchCardsFiltered({
          textQuery: q.trim(),
          status,
          page: Number.isFinite(page) && page >= 0 ? page : 0,
          perPage: limit,
          sortBy: 'title',
          sortDir: 'asc',
        });

        if (searchResult.docIds.length === 0) {
          result = { items: [], hasMore: false, lastDocId: undefined };
        } else {
          const items = await getCardsByIds(searchResult.docIds);
          result = {
            items,
            lastDocId: items.length > 0 ? items[items.length - 1].docId : undefined,
            hasMore: ((Number.isFinite(page) && page >= 0 ? page : 0) + 1) * limit < searchResult.totalFound,
          };
        }
      } else {
        result = await getCards({
          q,
          status,
          limit,
          lastDocId,
          sortBy: 'title',
          sortDir: 'asc',
        });
      }

      return apiRouteSuccess(result);
    }
  );
}
