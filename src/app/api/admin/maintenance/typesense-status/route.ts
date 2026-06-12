import { diagnoseTypesenseProjection } from '@/lib/services/typesenseReconciliation';
import { apiRouteSuccess, withApiRouteHandler } from '@/lib/api/routeEnvelope';

export const dynamic = 'force-dynamic';

/**
 * GET — operator-visible Typesense projection health check (read-only).
 */
export async function GET(request: Request) {
  return withApiRouteHandler(
    request,
    {
      auth: 'admin',
      internalError: { code: 'TYPESENSE_STATUS_FAILED', message: 'Typesense status check failed.' },
    },
    async () => {
      const report = await diagnoseTypesenseProjection();
      return apiRouteSuccess({ ok: true, report });
    }
  );
}
