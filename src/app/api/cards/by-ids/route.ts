import { getCardsByIds } from '@/lib/services/cards/cardReadService';
import {
  API_INPUT_CAPS,
  isInputCapFailure,
  validateRepeatedIdQueryParams,
} from '@/lib/api/inputCaps';
import {
  apiRouteInputCapError,
  apiRouteSuccess,
  withApiRouteHandler,
} from '@/lib/api/routeEnvelope';

export const dynamic = 'force-dynamic';

/**
 * GET handler for fetching multiple cards by their IDs.
 */
export async function GET(request: Request) {
  return withApiRouteHandler(
    request,
    {
      auth: 'admin',
      internalError: { code: 'CARD_BY_IDS_FETCH_FAILED', message: 'Internal server error.' },
    },
    async ({ request }) => {
    const { searchParams } = new URL(request.url);
    const idsResult = validateRepeatedIdQueryParams(searchParams.getAll('id'), {
      max: API_INPUT_CAPS.cardByIdsMax,
      emptyMessage: 'Missing "id" query parameters. Use repeated ?id=123&id=456 style.',
    });

    if (isInputCapFailure(idsResult)) {
      const capError = idsResult.error;
      return apiRouteInputCapError(capError, {
        code: capError.code === 'INPUT_ARRAY_INVALID' ? 'CARD_IDS_REQUIRED' : 'CARD_IDS_TOO_MANY',
      });
    }

    const cards = await getCardsByIds(idsResult.ids);
    return apiRouteSuccess(cards);
    }
  );
}
