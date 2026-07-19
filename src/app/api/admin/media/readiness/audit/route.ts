import { apiRouteSuccess, withApiRouteHandler } from '@/lib/api/routeEnvelope';
import { auditLegacyMediaReadiness } from '@/lib/services/images/imageImportService';

export async function GET(request: Request) {
  return withApiRouteHandler(
    request,
    {
      auth: 'admin',
      internalError: {
        code: 'MEDIA_READINESS_AUDIT_FAILED',
        message: 'Failed to audit media readiness.',
      },
    },
    async () => apiRouteSuccess(await auditLegacyMediaReadiness())
  );
}
