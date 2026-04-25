import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/authOptions';
import { createCard } from '@/lib/services/cardService';
import { getQuestionById, linkCardToQuestion } from '@/lib/services/questionService';

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
    const newCard = await createCard({
      type: 'qa',
      questionId: question.docId,
      title: question.prompt,
      content: '',
      status: 'draft',
      displayMode: 'navigate',
      tags: question.tagIds,
      galleryMedia: [],
    });

    const linked = await linkCardToQuestion(question.docId, newCard.docId);

    return NextResponse.json({ card: newCard, question: linked }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
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

