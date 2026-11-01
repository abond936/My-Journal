import { NextRequest } from 'next/server';
import { z } from 'zod';
import {
  apiRouteError,
  apiRouteInternalError,
  apiRouteSuccess,
  requireApiSession,
} from '@/lib/api/routeEnvelope';
import { convertGuestRecipientToAccount } from '@/lib/auth/journalUsersFirestore';

const bodySchema = z.object({
  password: z.string().min(8).max(128),
});

export async function POST(request: NextRequest) {
  const auth = await requireApiSession('authenticated');
  if ('error' in auth) return auth.error;
  const accountId = auth.session.user.id;
  if (!accountId) {
    return apiRouteError({
      code: 'AUTH_UNAUTHORIZED',
      message: 'Authentication required.',
      status: 401,
    });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return apiRouteError({
      code: 'GUEST_CONVERSION_INVALID_BODY',
      message: 'Enter a password with 8 to 128 characters.',
      status: 400,
    });
  }

  try {
    const account = await convertGuestRecipientToAccount(accountId, parsed.data.password);
    return apiRouteSuccess({
      ok: true,
      username: account.username,
      accessKind: account.accessKind,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (message.includes('not eligible') || message.includes('disabled')) {
      return apiRouteError({
        code: 'GUEST_CONVERSION_NOT_ALLOWED',
        message: 'This guest access cannot be converted to a password account.',
        status: 409,
      });
    }
    return apiRouteInternalError(
      'GUEST_CONVERSION_FAILED',
      'The password account could not be created. Try again.',
      error
    );
  }
}
