import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/authOptions';
import { isAdminSession } from '@/lib/auth/readerAccess';
import { reorderQuestion } from '@/lib/services/questionService';
import { reorderQuestionSchema } from '@/lib/types/question';

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!isAdminSession(session)) {
    return NextResponse.json({
      ok: false,
      code: 'AUTH_FORBIDDEN',
      message: 'Forbidden.',
      severity: 'error',
      retryable: false,
    }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({
      ok: false,
      code: 'QUESTION_REORDER_INVALID_JSON',
      message: 'Invalid JSON.',
      severity: 'error',
      retryable: false,
    }, { status: 400 });
  }

  const parsed = reorderQuestionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({
      ok: false,
      code: 'QUESTION_REORDER_INVALID_BODY',
      message: 'Choose a prompt and a valid move direction.',
      severity: 'error',
      retryable: false,
      issues: parsed.error.flatten(),
    }, { status: 400 });
  }

  try {
    const questions = await reorderQuestion(parsed.data.questionId, parsed.data.direction);
    return NextResponse.json({ questions });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    const notFound = message.includes('not found');
    return NextResponse.json({
      ok: false,
      code: notFound ? 'QUESTION_NOT_FOUND' : 'QUESTION_REORDER_FAILED',
      message: notFound ? message : 'The prompt order could not be saved.',
      severity: 'error',
      retryable: !notFound,
      error: message,
    }, { status: notFound ? 404 : 500 });
  }
}
