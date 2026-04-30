import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/authOptions';
import {
  suggestCardDraftOptions,
  suggestCardDraftsRequestSchema,
} from '@/lib/services/ai/cardDraftAssistService';

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
        code: 'AI_SUGGEST_INVALID_JSON',
        message: 'Invalid JSON.',
        severity: 'error',
        retryable: false,
      },
      400
    );
  }

  const parsed = suggestCardDraftsRequestSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse(
      {
        ok: false,
        code: 'AI_SUGGEST_INVALID_BODY',
        message: 'Invalid request body.',
        severity: 'error',
        retryable: false,
        issues: parsed.error.flatten(),
      },
      400
    );
  }

  try {
    const data = await suggestCardDraftOptions(parsed.data);
    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return errorResponse(
      {
        ok: false,
        code: 'AI_SUGGEST_FAILED',
        message: 'Failed to generate draft suggestions.',
        severity: 'error',
        retryable: true,
        error: message,
      },
      500
    );
  }
}

