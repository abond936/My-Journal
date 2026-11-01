import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { z } from 'zod';
import { authOptions } from '@/lib/auth/authOptions';
import { isAdminSession } from '@/lib/auth/readerAccess';
import {
  getTagSplitReview,
  splitTagAssignments,
  TagSplitConflictError,
} from '@/lib/services/tagSplitService';

type RouteParams = Promise<{ id: string }>;

const bodySchema = z.object({
  operationId: z.string().min(1).max(120),
  newName: z.string().trim().min(1).max(120),
  selection: z.object({
    cardIds: z.array(z.string().min(1)).max(500).default([]),
    mediaIds: z.array(z.string().min(1)).max(500).default([]),
    questionIds: z.array(z.string().min(1)).max(500).default([]),
  }),
});

function forbidden() {
  return NextResponse.json({ message: 'Forbidden.', code: 'AUTH_FORBIDDEN' }, { status: 403 });
}

export async function GET(_request: NextRequest, { params }: { params: RouteParams }) {
  if (!isAdminSession(await getServerSession(authOptions))) return forbidden();
  try {
    const { id } = await params;
    return NextResponse.json(await getTagSplitReview(id));
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to review this Tag split';
    return NextResponse.json({ message, code: 'TAG_SPLIT_REVIEW_FAILED' }, { status: error instanceof TagSplitConflictError ? 409 : 500 });
  }
}

export async function POST(request: NextRequest, { params }: { params: RouteParams }) {
  if (!isAdminSession(await getServerSession(authOptions))) return forbidden();
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ message: 'Choose a new Tag name and the records to move.', code: 'TAG_SPLIT_INPUT_INVALID' }, { status: 400 });
  }
  try {
    const { id } = await params;
    return NextResponse.json(await splitTagAssignments({
      sourceTagId: id,
      operationId: parsed.data.operationId,
      newName: parsed.data.newName,
      selection: {
        cardIds: parsed.data.selection.cardIds ?? [],
        mediaIds: parsed.data.selection.mediaIds ?? [],
        questionIds: parsed.data.selection.questionIds ?? [],
      },
    }));
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to split this Tag';
    return NextResponse.json({ message, code: 'TAG_SPLIT_FAILED' }, { status: error instanceof TagSplitConflictError ? 409 : 500 });
  }
}
