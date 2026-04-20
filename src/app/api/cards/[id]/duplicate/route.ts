import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/authOptions';
import { duplicateCard } from '@/lib/services/cardService';

export const dynamic = 'force-dynamic';

type RouteParams = Promise<{ id: string }>;

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

export async function POST(
  request: NextRequest,
  { params }: { params: RouteParams }
) {
  const session = await getServerSession(authOptions);
  if (!session || session.user?.role !== 'admin') {
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
  if (!id || typeof id !== 'string') {
    return errorResponse(
      {
        ok: false,
        code: 'CARD_ID_REQUIRED',
        message: 'Card ID is required.',
        severity: 'error',
        retryable: false,
      },
      400
    );
  }

  try {
    const newCard = await duplicateCard(id);
    return NextResponse.json(newCard, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'An unknown error occurred';
    const status = message.includes('not found') ? 404 : 500;
    const code = status === 404 ? 'CARD_NOT_FOUND' : 'CARD_DUPLICATE_FAILED';
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
