import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { z } from 'zod';
import { authOptions } from '@/lib/auth/authOptions';
import { isAdminSession } from '@/lib/auth/readerAccess';
import {
  consolidateExactQuestionDuplicates,
  QuestionDuplicateConflictError,
} from '@/lib/services/questionService';

const bodySchema = z.object({ survivorId: z.string().min(1) });

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!isAdminSession(session)) {
    return NextResponse.json({ message: 'Forbidden.', code: 'AUTH_FORBIDDEN' }, { status: 403 });
  }
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ message: 'Choose the Prompt to keep.', code: 'QUESTION_SURVIVOR_REQUIRED' }, { status: 400 });
  }
  try {
    const question = await consolidateExactQuestionDuplicates(parsed.data.survivorId);
    return NextResponse.json({ question });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to consolidate duplicate prompts';
    const conflict = error instanceof QuestionDuplicateConflictError;
    return NextResponse.json(
      { message, code: conflict ? 'QUESTION_DUPLICATE_CONFLICT' : 'QUESTION_CONSOLIDATE_FAILED' },
      { status: conflict ? 409 : 500 }
    );
  }
}
