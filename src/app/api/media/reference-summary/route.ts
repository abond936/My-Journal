import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/authOptions';
import { getCardsReferencingMedia } from '@/lib/services/cardService';

type ApiErrorPayload = {
  ok: false;
  code: string;
  message: string;
  severity: 'error' | 'warning';
  retryable: boolean;
  error?: string;
};

function errorResponse(payload: ApiErrorPayload, status: number) {
  return NextResponse.json(payload, { status });
}

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== 'admin') {
    return errorResponse(
      {
        ok: false,
        code: 'AUTH_FORBIDDEN',
        message: 'Unauthorized.',
        severity: 'error',
        retryable: false,
      },
      403
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const ids = Array.from(
      new Set(
        searchParams
          .getAll('id')
          .map((id) => id.trim())
          .filter((id) => id.length > 0)
      )
    );

    if (ids.length === 0) {
      return errorResponse(
        {
          ok: false,
          code: 'MEDIA_IDS_REQUIRED',
          message: 'Missing "id" query parameters. Use repeated ?id=123&id=456 style.',
          severity: 'error',
          retryable: false,
        },
        400
      );
    }

    if (ids.length > 100) {
      return errorResponse(
        {
          ok: false,
          code: 'MEDIA_IDS_TOO_MANY',
          message: 'Request at most 100 media IDs at a time.',
          severity: 'warning',
          retryable: false,
        },
        400
      );
    }

    const summaries = Object.fromEntries(
      await Promise.all(
        ids.map(async (id) => [id, await getCardsReferencingMedia(id)] as const)
      )
    );

    return NextResponse.json({ ok: true, summaries });
  } catch (error) {
    console.error('API Error fetching media reference summary:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return errorResponse(
      {
        ok: false,
        code: 'MEDIA_REFERENCE_SUMMARY_FAILED',
        message: 'Internal server error.',
        severity: 'error',
        retryable: true,
        error: message,
      },
      500
    );
  }
}
