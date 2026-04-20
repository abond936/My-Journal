import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { z } from 'zod';
import { authOptions } from '@/lib/auth/authOptions';
import { createJournalViewer, listJournalUsers } from '@/lib/auth/journalUsersFirestore';

const postBodySchema = z.object({
  username: z.string().min(1).max(64),
  password: z.string().min(8).max(128),
  displayName: z.string().max(128).optional(),
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

export async function GET() {
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

  try {
    const users = await listJournalUsers();
    return NextResponse.json({ users });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[/api/admin/journal-users GET]', error);
    return errorResponse(
      {
        ok: false,
        code: 'USER_LIST_FAILED',
        message: 'Failed to list users.',
        severity: 'error',
        retryable: true,
        error: message,
      },
      500
    );
  }
}

export async function POST(request: NextRequest) {
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

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse(
      {
        ok: false,
        code: 'USER_CREATE_INVALID_JSON',
        message: 'Invalid JSON.',
        severity: 'error',
        retryable: false,
      },
      400
    );
  }

  const parsed = postBodySchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse(
      {
        ok: false,
        code: 'USER_CREATE_INVALID_BODY',
        message: 'Invalid body.',
        severity: 'error',
        retryable: false,
        issues: parsed.error.flatten(),
      },
      400
    );
  }

  try {
    const { username, password, displayName } = parsed.data;
    const docId = await createJournalViewer({ username, password, displayName });
    return NextResponse.json({ docId }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    const status = message.includes('already exists') ? 409 : 500;
    console.error('[/api/admin/journal-users POST]', error);
    const code = status === 409 ? 'USER_CREATE_CONFLICT' : 'USER_CREATE_FAILED';
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
