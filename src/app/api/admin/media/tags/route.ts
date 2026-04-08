import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/authOptions';
import { getAdminApp } from '@/lib/config/firebase/admin';
import { Media } from '@/lib/types/photo';
import { patchMediaDocument } from '@/lib/services/images/imageImportService';

/**
 * POST — bulk-edit tags on many media docs.
 * mode:
 * - add (default): union existing + selected
 * - replace: replace with selected
 * - remove: remove selected from existing
 */
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'admin') {
    return new NextResponse('Forbidden', { status: 403 });
  }

  try {
    const body = await request.json() as { mediaIds?: unknown; tags?: unknown; mode?: unknown };
    const mediaIds = body.mediaIds;
    const tags = body.tags;
    const mode = body.mode;
    if (!Array.isArray(mediaIds) || mediaIds.length === 0) {
      return NextResponse.json({ message: 'mediaIds must be a non-empty array.' }, { status: 400 });
    }
    if (!Array.isArray(tags)) {
      return NextResponse.json({ message: 'tags must be an array of string IDs.' }, { status: 400 });
    }
    if (mode !== undefined && mode !== 'add' && mode !== 'replace' && mode !== 'remove') {
      return NextResponse.json({ message: 'mode must be one of: add, replace, remove.' }, { status: 400 });
    }
    const ids = mediaIds.filter((id): id is string => typeof id === 'string' && id.length > 0);
    const tagList = tags.filter((id): id is string => typeof id === 'string');
    const effectiveMode = (mode === 'replace' || mode === 'remove' || mode === 'add') ? mode : 'add';
    if (ids.length === 0) {
      return NextResponse.json({ message: 'No valid media IDs.' }, { status: 400 });
    }

    const firestore = getAdminApp().firestore();

    for (const id of ids) {
      const doc = await firestore.collection('media').doc(id).get();
      const data = doc.data() as Media | undefined;
      const existingTags = (data?.tags ?? [])
        .filter((t): t is string => typeof t === 'string');

      let nextTags: string[];
      if (effectiveMode === 'replace') {
        nextTags = [...new Set(tagList)];
      } else if (effectiveMode === 'remove') {
        const removeSet = new Set(tagList);
        nextTags = existingTags.filter(t => !removeSet.has(t));
      } else {
        nextTags = [...new Set([...existingTags, ...tagList])];
      }

      await patchMediaDocument(id, { tags: nextTags });
    }

    return NextResponse.json({ ok: true, updated: ids.length, mode: effectiveMode });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[POST /api/admin/media/tags]', message);
    return NextResponse.json({ message: 'Failed to update media tags.', error: message }, { status: 500 });
  }
}
