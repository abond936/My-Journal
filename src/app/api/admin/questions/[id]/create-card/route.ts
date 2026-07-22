import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/authOptions';
import { isAdminSession } from '@/lib/auth/readerAccess';
import { createQuestionCardFromQuestion } from '@/lib/services/cards/cardLifecycleService';
import {
  getQuestionById,
  QuestionAnswerConflictError,
} from '@/lib/services/questionService';

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

export async function POST(request: NextRequest, { params }: { params: RouteParams }) {
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

  const { id } = await params;
  const question = await getQuestionById(id);
  if (!question) {
    return errorResponse(
      {
        ok: false,
        code: 'QUESTION_NOT_FOUND',
        message: 'Question not found.',
        severity: 'error',
        retryable: false,
      },
      404
    );
  }

  await request.json().catch(() => ({}));

  try {
    const created = await createQuestionCardFromQuestion(question);
    return NextResponse.json(created, { status: created.created ? 201 : 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    if (error instanceof QuestionAnswerConflictError) {
      return errorResponse(
        {
          ok: false,
          code: 'QUESTION_ANSWER_CONFLICT',
          message,
          severity: 'warning',
          retryable: false,
        },
        409
      );
    }
    return errorResponse(
      {
        ok: false,
        code: 'QUESTION_CREATE_CARD_FAILED',
        message: 'Failed to create card from question.',
        severity: 'error',
        retryable: true,
        error: message,
      },
      500
    );
  }
}

