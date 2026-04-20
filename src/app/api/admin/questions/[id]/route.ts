import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/authOptions';
import {
  deleteQuestion,
  getQuestionById,
  linkCardToQuestion,
  unlinkCardFromQuestion,
  updateQuestion,
} from '@/lib/services/questionService';
import { updateQuestionSchema } from '@/lib/types/question';
import { z } from 'zod';

const linkBodySchema = z.object({ cardId: z.string().min(1) });

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

type RouteParams = Promise<{ id: string }>;

export async function PATCH(request: NextRequest, { params }: { params: RouteParams }) {
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
        code: 'QUESTION_UPDATE_INVALID_JSON',
        message: 'Invalid JSON.',
        severity: 'error',
        retryable: false,
      },
      400
    );
  }

  const parsed = updateQuestionSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse(
      {
        ok: false,
        code: 'QUESTION_UPDATE_INVALID_BODY',
        message: 'Invalid body.',
        severity: 'error',
        retryable: false,
        issues: parsed.error.flatten(),
      },
      400
    );
  }

  try {
    const question = await updateQuestion(id, parsed.data);
    return NextResponse.json({ question });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    const status = message.includes('not found') ? 404 : 500;
    const code = status === 404 ? 'QUESTION_NOT_FOUND' : 'QUESTION_UPDATE_FAILED';
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

export async function DELETE(_request: NextRequest, { params }: { params: RouteParams }) {
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
  try {
    const existing = await getQuestionById(id);
    if (!existing) {
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
    await deleteQuestion(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return errorResponse(
      {
        ok: false,
        code: 'QUESTION_DELETE_FAILED',
        message: 'Failed to delete question.',
        severity: 'error',
        retryable: true,
        error: message,
      },
      500
    );
  }
}

export async function POST(request: NextRequest, { params }: { params: RouteParams }) {
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
        code: 'QUESTION_LINK_INVALID_JSON',
        message: 'Invalid JSON.',
        severity: 'error',
        retryable: false,
      },
      400
    );
  }

  const parsed = linkBodySchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse(
      {
        ok: false,
        code: 'QUESTION_LINK_INVALID_BODY',
        message: 'Invalid body.',
        severity: 'error',
        retryable: false,
        issues: parsed.error.flatten(),
      },
      400
    );
  }

  try {
    const question = await linkCardToQuestion(id, parsed.data.cardId);
    return NextResponse.json({ question });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    const status = message.includes('not found') ? 404 : 500;
    const code = status === 404 ? 'QUESTION_NOT_FOUND' : 'QUESTION_LINK_FAILED';
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

export async function PUT(request: NextRequest, { params }: { params: RouteParams }) {
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
        code: 'QUESTION_UNLINK_INVALID_JSON',
        message: 'Invalid JSON.',
        severity: 'error',
        retryable: false,
      },
      400
    );
  }

  const parsed = linkBodySchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse(
      {
        ok: false,
        code: 'QUESTION_UNLINK_INVALID_BODY',
        message: 'Invalid body.',
        severity: 'error',
        retryable: false,
        issues: parsed.error.flatten(),
      },
      400
    );
  }

  try {
    const question = await unlinkCardFromQuestion(id, parsed.data.cardId);
    return NextResponse.json({ question });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    const status = message.includes('not found') ? 404 : 500;
    const code = status === 404 ? 'QUESTION_NOT_FOUND' : 'QUESTION_UNLINK_FAILED';
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

