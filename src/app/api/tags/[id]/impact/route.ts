import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/authOptions';
import { isAdminSession } from '@/lib/auth/readerAccess';
import { getTagMergeImpact, getTagRemovalImpact } from '@/lib/services/tagMutationImpactService';

type RouteParams = Promise<{ id: string }>;

export async function GET(request: Request, { params }: { params: RouteParams }) {
  const session = await getServerSession(authOptions);
  if (!isAdminSession(session)) {
    return NextResponse.json({ ok: false, code: 'AUTH_FORBIDDEN', message: 'Forbidden.' }, { status: 403 });
  }
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    if (searchParams.get('mode') === 'merge') {
      const targetTagId = searchParams.get('targetTagId');
      if (!targetTagId) {
        return NextResponse.json({ ok: false, code: 'TAG_MERGE_TARGET_REQUIRED', message: 'Merge target is required.' }, { status: 400 });
      }
      return NextResponse.json(await getTagMergeImpact(id, targetTagId));
    }
    return NextResponse.json(await getTagRemovalImpact(id));
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to assess tag removal.';
    return NextResponse.json({ ok: false, code: 'TAG_IMPACT_FAILED', message }, {
      status: message === 'Tag not found' ? 404 : 500,
    });
  }
}
