import { z } from 'zod';
import {
  createCardBulkTagAssignmentOperation,
  processCardBulkTagAssignmentOperation,
  type CardBulkTagAssignmentItem,
} from '@/lib/services/cardBulkTagAssignmentService';
import { API_INPUT_CAPS } from '@/lib/api/inputCaps';
import { apiRouteError, apiRouteSuccess, withApiRouteHandler } from '@/lib/api/routeEnvelope';
import { galleryTagInheritanceTogglesSchema } from '@/lib/types/authorSettings';
import { dimensionReviewMapSchema } from '@/lib/types/dimensionReview';
import { temporalValueSchema } from '@/lib/types/temporal';

const itemSchema = z.object({
  cardId: z.string().min(1).max(1500).refine((value) => !value.includes('/')),
  tags: z.array(z.string().min(1)).max(API_INPUT_CAPS.bulkTagIdsMax),
  subjectTagIds: z.array(z.string().min(1)).max(API_INPUT_CAPS.bulkTagIdsMax),
  temporal: temporalValueSchema.nullable().optional(),
  dimensionReview: dimensionReviewMapSchema,
  overrides: galleryTagInheritanceTogglesSchema,
});

const requestSchema = z.union([
  z.object({
    items: z.array(itemSchema).min(1).max(API_INPUT_CAPS.bulkCardIdsMax),
  }),
  z.object({
    operationId: z.string().min(1).max(1500),
  }),
]);

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  return withApiRouteHandler(
    request,
    {
      auth: 'admin',
      internalError: {
        code: 'CARD_BULK_TAG_ASSIGNMENT_FAILED',
        message: 'The Card tag operation could not be completed.',
      },
    },
    async ({ request }) => {
      const parsed = requestSchema.safeParse(await request.json().catch(() => null));
      if (!parsed.success) {
        return apiRouteError({
          code: 'CARD_BULK_TAG_ASSIGNMENT_INVALID',
          message: 'The bulk Card tag request is invalid.',
          status: 400,
          retryable: false,
        });
      }
      const parsedBody = parsed.data as {
        operationId?: string;
        items?: Array<z.infer<typeof itemSchema>>;
      };
      const operationId = parsedBody.operationId
        ? parsedBody.operationId
        : await createCardBulkTagAssignmentOperation(
            (parsedBody.items ?? []).map((item) => ({
              cardId: item.cardId,
              updates: {
                tags: item.tags,
                subjectTagIds: item.subjectTagIds,
                ...(Object.prototype.hasOwnProperty.call(item, 'temporal')
                  ? { temporal: item.temporal }
                  : {}),
                ...(Object.prototype.hasOwnProperty.call(item, 'dimensionReview')
                  ? { dimensionReview: item.dimensionReview }
                  : {}),
              },
              overrides: item.overrides,
            })) as CardBulkTagAssignmentItem[]
          );
      const result = await processCardBulkTagAssignmentOperation(operationId);
      return apiRouteSuccess({ ok: true, ...result });
    }
  );
}
