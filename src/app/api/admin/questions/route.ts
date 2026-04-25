import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/authOptions';
import { createQuestion, listQuestions } from '@/lib/services/questionService';
import { createQuestionSchema } from '@/lib/types/question';

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
    const questions = await listQuestions();
    return NextResponse.json({ questions });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return errorResponse(
      {
        ok: false,
        code: 'QUESTION_LIST_FAILED',
        message: 'Failed to list questions.',
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
        code: 'QUESTION_CREATE_INVALID_JSON',
        message: 'Invalid JSON.',
        severity: 'error',
        retryable: false,
      },
      400
    );
  }

  const parsed = createQuestionSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse(
      {
        ok: false,
        code: 'QUESTION_CREATE_INVALID_BODY',
        message: 'Invalid body.',
        severity: 'error',
        retryable: false,
        issues: parsed.error.flatten(),
      },
      400
    );
  }

  try {
    const question = await createQuestion(parsed.data);
    return NextResponse.json({ question }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    const validationFailure = message.includes('dimensional tag');
    return errorResponse(
      {
        ok: false,
        code: validationFailure ? 'QUESTION_CREATE_INVALID_TAGS' : 'QUESTION_CREATE_FAILED',
        message: validationFailure ? message : 'Failed to create question.',
        severity: 'error',
        retryable: !validationFailure,
        error: message,
      },
      validationFailure ? 400 : 500
    );
  }
}

