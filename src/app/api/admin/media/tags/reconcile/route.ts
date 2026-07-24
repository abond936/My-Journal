import { NextRequest } from 'next/server';
import {
  processMediaTagReconciliationOperation,
  processPendingMediaTagReconciliations,
} from '@/lib/services/mediaTagReconciliationService';
import { apiRouteError, apiRouteSuccess, withApiRouteHandler } from '@/lib/api/routeEnvelope';

export async function POST(request: NextRequest) {
  return withApiRouteHandler(
    request,
    {
      auth: 'admin',
      internalError: {
        code: 'MEDIA_TAG_RECONCILIATION_FAILED',
        message: 'Media tags were saved, but Card synchronization needs retry.',
      },
    },
    async ({ request }) => {
      const body = (await request.json().catch(() => ({}))) as { operationId?: unknown };
      if (body.operationId !== undefined && typeof body.operationId !== 'string') {
        return apiRouteError({
          code: 'MEDIA_TAG_RECONCILIATION_ID_INVALID',
          message: 'operationId must be a string.',
          status: 400,
          retryable: false,
        });
      }
      if (typeof body.operationId === 'string' && body.operationId.trim()) {
        const result = await processMediaTagReconciliationOperation(body.operationId.trim());
        return apiRouteSuccess({ ok: true, results: [result] });
      }
      const results = await processPendingMediaTagReconciliations();
      return apiRouteSuccess({ ok: true, results });
    }
  );
}
