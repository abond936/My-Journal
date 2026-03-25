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

type RouteParams = Promise<{ id: string }>;

export async function PATCH(request: NextRequest, { params }: { params: RouteParams }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = updateQuestionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ message: 'Invalid body', issues: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const question = await updateQuestion(id, parsed.data);
    return NextResponse.json({ question });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    const status = message.includes('not found') ? 404 : 500;
    return NextResponse.json({ message, error: message }, { status });
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: RouteParams }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;
  try {
    const existing = await getQuestionById(id);
    if (!existing) {
      return NextResponse.json({ message: 'Question not found' }, { status: 404 });
    }
    await deleteQuestion(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ message: 'Failed to delete question', error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: { params: RouteParams }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = linkBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ message: 'Invalid body', issues: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const question = await linkCardToQuestion(id, parsed.data.cardId);
    return NextResponse.json({ question });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    const status = message.includes('not found') ? 404 : 500;
    return NextResponse.json({ message, error: message }, { status });
  }
}

export async function PUT(request: NextRequest, { params }: { params: RouteParams }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = linkBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ message: 'Invalid body', issues: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const question = await unlinkCardFromQuestion(id, parsed.data.cardId);
    return NextResponse.json({ question });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    const status = message.includes('not found') ? 404 : 500;
    return NextResponse.json({ message, error: message }, { status });
  }
}

