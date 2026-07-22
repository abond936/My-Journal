import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/authOptions';
import { isAdminSession } from '@/lib/auth/readerAccess';
import {
  getTagSet0Status,
  installTagSet0Generic,
  removeTagSet0Generic,
} from '@/lib/services/tagSet0Service';

type ApiErrorPayload = {
  ok: false;
  code: string;
  message: string;
  severity: 'error' | 'warning';
  retryable: boolean;
};

function errorResponse(payload: ApiErrorPayload, status: number) {
  return NextResponse.json(payload, { status });
}

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!isAdminSession(session)) {
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
  return null;
}

export async function GET() {
  const forbidden = await requireAdmin();
  if (forbidden) return forbidden;

  try {
    const tagSet0 = await getTagSet0Status();
    return NextResponse.json({ ok: true, tagSet0 });
  } catch (error) {
    console.error('[/api/admin/tag-set-0 GET]', error);
    return errorResponse(
      {
        ok: false,
        code: 'TAG_SET_0_STATUS_FAILED',
        message: 'Failed to load Tag Set 0 status.',
        severity: 'error',
        retryable: true,
      },
      500
    );
  }
}

export async function POST() {
  const forbidden = await requireAdmin();
  if (forbidden) return forbidden;

  try {
    const result = await installTagSet0Generic();
    const tagSet0 = await getTagSet0Status();
    return NextResponse.json({ ok: true, result, tagSet0 });
  } catch (error) {
    console.error('[/api/admin/tag-set-0 POST]', error);
    return errorResponse(
      {
        ok: false,
        code: 'TAG_SET_0_INSTALL_FAILED',
        message: 'Failed to install Tag Set 0.',
        severity: 'error',
        retryable: true,
      },
      500
    );
  }
}

export async function DELETE() {
  const forbidden = await requireAdmin();
  if (forbidden) return forbidden;

  try {
    const result = await removeTagSet0Generic();
    const tagSet0 = await getTagSet0Status();
    return NextResponse.json({ ok: true, result, tagSet0 });
  } catch (error) {
    console.error('[/api/admin/tag-set-0 DELETE]', error);
    return errorResponse(
      {
        ok: false,
        code: 'TAG_SET_0_REMOVE_FAILED',
        message: 'Failed to remove Tag Set 0.',
        severity: 'error',
        retryable: true,
      },
      500
    );
  }
}
