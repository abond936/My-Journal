import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/authOptions';
import { isAdminSession } from '@/lib/auth/readerAccess';
import { reorderTagSiblings } from '@/lib/firebase/tagService';

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!isAdminSession(session)) {
    return NextResponse.json({ ok: false, code: 'AUTH_FORBIDDEN', message: 'Forbidden.' }, { status: 403 });
  }

  try {
    const { activeId, overId, placement } = await request.json();
    if (
      typeof activeId !== 'string' ||
      typeof overId !== 'string' ||
      (placement !== 'before' && placement !== 'after')
    ) {
      return NextResponse.json(
        { ok: false, code: 'TAG_REORDER_INVALID', message: 'Invalid tag reorder request.' },
        { status: 400 }
      );
    }
    const updates = await reorderTagSiblings(activeId, overId, placement);
    return NextResponse.json({ ok: true, updates });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Tag reorder failed.';
    const invalid = /not found|share|sibling/i.test(message);
    return NextResponse.json(
      { ok: false, code: invalid ? 'TAG_REORDER_INVALID' : 'TAG_REORDER_FAILED', message },
      { status: invalid ? 400 : 500 }
    );
  }
}
