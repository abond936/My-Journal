import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { z } from 'zod';
import { authOptions } from '@/lib/auth/authOptions';
import { createCard } from '@/lib/services/cardService';
import { getQuestionById, linkCardToQuestion } from '@/lib/services/questionService';

const bodySchema = z.object({
  type: z.enum(['qa', 'story']).default('qa'),
});

type RouteParams = Promise<{ id: string }>;

export async function POST(request: NextRequest, { params }: { params: RouteParams }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;
  const question = await getQuestionById(id);
  if (!question) {
    return NextResponse.json({ message: 'Question not found' }, { status: 404 });
  }

  let body: unknown = {};
  try {
    body = await request.json().catch(() => ({}));
  } catch {
    body = {};
  }
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ message: 'Invalid body', issues: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const newCard = await createCard({
      type: parsed.data.type,
      title: question.prompt,
      content: '',
      status: 'draft',
      displayMode: 'navigate',
      tags: [],
      galleryMedia: [],
    });

    const linked = await linkCardToQuestion(question.docId, newCard.docId);

    return NextResponse.json({ card: newCard, question: linked }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ message: 'Failed to create card from question', error: message }, { status: 500 });
  }
}

