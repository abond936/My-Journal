import { NextRequest } from 'next/server';
import { z } from 'zod';
import {
  apiRouteError,
  apiRouteSuccess,
  withApiRouteHandler,
} from '@/lib/api/routeEnvelope';
import {
  listMediaDuplicateReviewGroups,
  recordMediaDuplicateDecision,
} from '@/lib/services/mediaDuplicateReviewService';

const statusSchema = z.enum(['unresolved', 'reviewed', 'all']);
const decisionSchema = z.object({
  mediaIds: z.tuple([z.string().min(1), z.string().min(1)]),
  decision: z.enum(['same_asset', 'keep_both', 'defer']),
  canonicalMediaId: z.string().min(1).optional(),
}).superRefine((value, context) => {
  if (value.decision === 'same_asset' && !value.canonicalMediaId) {
    context.addIssue({ code: 'custom', message: 'Choose the record to keep.' });
  }
  if (value.decision !== 'same_asset' && value.canonicalMediaId) {
    context.addIssue({ code: 'custom', message: 'Only same-asset decisions choose a record to keep.' });
  }
});

export async function GET(request: NextRequest) {
  return withApiRouteHandler(
    request,
    {
      auth: 'admin',
      internalError: { code: 'MEDIA_DUPLICATES_LIST_FAILED', message: 'Could not load exact matches.' },
    },
    async ({ request }) => {
      const parsedStatus = statusSchema.safeParse(request.nextUrl.searchParams.get('status') ?? 'unresolved');
      if (!parsedStatus.success) {
        return apiRouteError({
          code: 'MEDIA_DUPLICATES_STATUS_INVALID',
          message: 'Choose unresolved, reviewed, or all.',
          status: 400,
        });
      }
      const groups = await listMediaDuplicateReviewGroups(parsedStatus.data);
      return apiRouteSuccess({ ok: true, status: parsedStatus.data, groups });
    }
  );
}

export async function POST(request: NextRequest) {
  return withApiRouteHandler(
    request,
    {
      auth: 'admin',
      internalError: { code: 'MEDIA_DUPLICATE_DECISION_FAILED', message: 'Could not save this review.' },
    },
    async ({ request }) => {
      const parsed = decisionSchema.safeParse(await request.json());
      if (!parsed.success) {
        return apiRouteError({
          code: 'MEDIA_DUPLICATE_DECISION_INVALID',
          message: parsed.error.issues[0]?.message ?? 'Review decision is invalid.',
          status: 400,
        });
      }
      const decision = await recordMediaDuplicateDecision(parsed.data as {
        mediaIds: [string, string];
        decision: 'same_asset' | 'keep_both' | 'defer';
        canonicalMediaId?: string;
      });
      return apiRouteSuccess({ ok: true, decision });
    }
  );
}
