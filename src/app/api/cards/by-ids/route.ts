import { NextResponse } from 'next/server';
import { getCardsByIds } from '@/lib/services/cardService';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/authOptions';

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

/**
 * GET handler for fetching multiple cards by their IDs.
 * @param request - The incoming NextRequest.
 */
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
    let ids: string[] = searchParams.getAll('id');

    // Enforce the repeated ?id=A&id=B pattern
    if (ids.length === 0) {
      return errorResponse(
        {
          ok: false,
          code: 'CARD_IDS_REQUIRED',
          message: 'Missing "id" query parameters. Use repeated ?id=123&id=456 style.',
          severity: 'error',
          retryable: false,
        },
        400
      );
    }
    
    const cards = await getCardsByIds(ids);

    return NextResponse.json(cards);
  } catch (error) {
    console.error('API Error fetching cards by IDs:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return errorResponse(
      {
        ok: false,
        code: 'CARD_BY_IDS_FETCH_FAILED',
        message: 'Internal server error.',
        severity: 'error',
        retryable: true,
        error: message,
      },
      500
    );
  }
} 