import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { z } from 'zod';
import { authOptions } from '@/lib/auth/authOptions';
import { getJournalUserByDocId, updateJournalUser } from '@/lib/auth/journalUsersFirestore';

const patchBodySchema = z
  .object({
    displayName: z.string().max(128).optional(),
    disabled: z.boolean().optional(),
    password: z.string().min(8).max(128).optional(),
  })
  .refine(data => data.displayName !== undefined || data.disabled !== undefined || data.password !== undefined, {
    message: 'At least one field required',
  });

type ApiErrorPayload = {
  ok: false;
  code: string;
  message: string;
  severity: 'error' | 'warning';
  retryable: boolean;
  error?: string;
  issues?: unknown;
};

function errorResponse(payload: ApiErrorPayload, status: number) {
  return NextResponse.json(payload, { status });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'admin') {
    return errorResponse(
      {
        ok: false,
        code: 'AUTH_FORBIDDEN',
        message: 'Forbidden.',
        severity: 'error',
        retryable: false,
      },
      403
    );
  }

  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse(
      {
        ok: false,
        code: 'USER_UPDATE_INVALID_JSON',
        message: 'Invalid JSON.',
        severity: 'error',
        retryable: false,
      },
      400
    );
  }

  const parsed = patchBodySchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse(
      {
        ok: false,
        code: 'USER_UPDATE_INVALID_BODY',
        message: 'Invalid body.',
        severity: 'error',
        retryable: false,
        issues: parsed.error.flatten(),
      },
      400
    );
  }

  const existing = await getJournalUserByDocId(id);
  if (!existing) {
    return errorResponse(
      {
        ok: false,
        code: 'USER_NOT_FOUND',
        message: 'User not found.',
        severity: 'error',
        retryable: false,
      },
      404
    );
  }

  if (parsed.data.disabled === true && session.user?.id === id) {
    return errorResponse(
      {
        ok: false,
        code: 'USER_DISABLE_SELF_FORBIDDEN',
        message: 'You cannot disable your own account.',
        severity: 'error',
        retryable: false,
      },
      400
    );
  }

  try {
    await updateJournalUser(id, {
      displayName: parsed.data.displayName,
      disabled: parsed.data.disabled,
      password: parsed.data.password,
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    const status =
      message.includes('only enabled admin') || message.includes('not found') ? 400 : 500;
    console.error('[/api/admin/journal-users PATCH]', error);
    const code = status === 400 ? 'USER_UPDATE_CONSTRAINT_FAILED' : 'USER_UPDATE_FAILED';
    return errorResponse(
      {
        ok: false,
        code,
        message,
        severity: 'error',
        retryable: status === 500,
        error: message,
      },
      status
    );
  }
}
