import { NextResponse } from 'next/server';
import { getCardsByIds } from '@/lib/services/cardService';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/authOptions';
import {
  API_INPUT_CAPS,
  validateRepeatedIdQueryParams,
  isInputCapFailure,
} from '@/lib/api/inputCaps';

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
    const idsResult = validateRepeatedIdQueryParams(searchParams.getAll('id'), {
      max: API_INPUT_CAPS.cardByIdsMax,
      emptyMessage: 'Missing "id" query parameters. Use repeated ?id=123&id=456 style.',
    });

    if (isInputCapFailure(idsResult)) {
      const capError = idsResult.error;
      return errorResponse(
        {
          ok: false,
          code: capError.code === 'INPUT_ARRAY_INVALID' ? 'CARD_IDS_REQUIRED' : 'CARD_IDS_TOO_MANY',
          message: capError.message,
          severity: 'error',
          retryable: false,
        },
        400
      );
    }

    const cards = await getCardsByIds(idsResult.ids);

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
