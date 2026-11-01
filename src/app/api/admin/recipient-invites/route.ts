import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { z } from 'zod';
import { authOptions } from '@/lib/auth/authOptions';
import { isAdminSession } from '@/lib/auth/readerAccess';
import {
  createGuestRecipientInvite,
  reissueGuestRecipientInvite,
} from '@/lib/auth/recipientInvites';

const bodySchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('create'),
    email: z.string().email().max(254),
    displayName: z.string().max(128).optional(),
  }),
  z.object({
    kind: z.literal('reissue'),
    recipientId: z.string().min(1).max(200),
  }),
]);

type InviteBody =
  | { kind: 'create'; email: string; displayName?: string }
  | { kind: 'reissue'; recipientId: string };

function errorResponse(code: string, message: string, status: number) {
  return NextResponse.json(
    { ok: false, code, message, severity: 'error', retryable: status >= 500 },
    { status }
  );
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!isAdminSession(session)) return errorResponse('AUTH_FORBIDDEN', 'Forbidden.', 403);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse('RECIPIENT_INVITE_INVALID_JSON', 'Invalid JSON.', 400);
  }
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        code: 'RECIPIENT_INVITE_INVALID_BODY',
        message: 'Enter a valid guest email address.',
        severity: 'error',
        retryable: false,
        issues: parsed.error.flatten(),
      },
      { status: 400 }
    );
  }

  try {
    const data = parsed.data as InviteBody;
    const isReissue = data.kind === 'reissue';
    const result = isReissue
      ? await reissueGuestRecipientInvite(data.recipientId)
      : await createGuestRecipientInvite({
          email: data.email,
          displayName: data.displayName,
        });
    const inviteUrl = `${request.nextUrl.origin}/invite#token=${encodeURIComponent(result.inviteToken)}`;
    return NextResponse.json(
      { recipientId: result.recipientId, inviteUrl, expiresAt: result.expiresAt },
      { status: isReissue ? 200 : 201 }
    );
  } catch (cause) {
    const detail = cause instanceof Error ? cause.message : 'Unknown error';
    const conflict = detail.includes('already uses');
    const unavailable = detail.includes('not found') || detail.includes('only for') || detail.includes('Enable this');
    const status = conflict ? 409 : unavailable ? 400 : 500;
    console.error('[/api/admin/recipient-invites POST]', cause);
    return errorResponse(
      conflict ? 'RECIPIENT_INVITE_CONFLICT' : unavailable ? 'RECIPIENT_INVITE_UNAVAILABLE' : 'RECIPIENT_INVITE_FAILED',
      status === 500 ? 'The guest invitation could not be created.' : detail,
      status
    );
  }
}
