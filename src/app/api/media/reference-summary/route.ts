import { getCardsReferencingMedia } from '@/lib/services/cardService';
import { API_INPUT_CAPS, isInputCapFailure, validateRepeatedIdQueryParams } from '@/lib/api/inputCaps';
import {
  apiRouteInputCapError,
  apiRouteSuccess,
  withApiRouteHandler,
} from '@/lib/api/routeEnvelope';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  return withApiRouteHandler(
    request,
    {
      auth: 'admin',
      internalError: { code: 'MEDIA_REFERENCE_SUMMARY_FAILED', message: 'Internal server error.' },
    },
    async ({ request }) => {
      const { searchParams } = new URL(request.url);
      const ids = Array.from(
        new Set(
          searchParams
            .getAll('id')
            .map((id) => id.trim())
            .filter((id) => id.length > 0)
        )
      );

      const idsResult = validateRepeatedIdQueryParams(ids, {
        max: API_INPUT_CAPS.mediaReferenceSummaryMax,
        emptyMessage: 'Missing "id" query parameters. Use repeated ?id=123&id=456 style.',
      });

      if (isInputCapFailure(idsResult)) {
        const capError = idsResult.error;
        return apiRouteInputCapError(capError, {
          code: capError.code === 'INPUT_ARRAY_EXCEEDED' ? 'MEDIA_IDS_TOO_MANY' : 'MEDIA_IDS_REQUIRED',
          severity: capError.code === 'INPUT_ARRAY_EXCEEDED' ? 'warning' : 'error',
        });
      }

      const summaries = Object.fromEntries(
        await Promise.all(
          idsResult.ids.map(async (id) => [id, await getCardsReferencingMedia(id)] as const)
        )
      );

      return apiRouteSuccess({ ok: true, summaries });
    }
  );
}
