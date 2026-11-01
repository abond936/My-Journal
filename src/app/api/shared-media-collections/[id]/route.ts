import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/authOptions';
import { filterSharedMediaCollectionsForAudience } from '@/lib/auth/audienceAccess';
import { isAuthenticatedSession } from '@/lib/auth/readerAccess';
import { getSharedMediaCollection } from '@/lib/services/sharedMediaCollectionService';

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!isAuthenticatedSession(session)) {
    return NextResponse.json({ ok: false, code: 'AUTH_REQUIRED', message: 'Authentication required.' }, { status: 401 });
  }
  const { id } = await params;
  const result = await getSharedMediaCollection({ id });
  if (!result || (await filterSharedMediaCollectionsForAudience(session, [result.collection])).length === 0) {
    return NextResponse.json({ ok: false, code: 'NOT_FOUND', message: 'Shared Media Collection not found.' }, { status: 404 });
  }
  return NextResponse.json({
    ok: true,
    collection: {
      docId: result.collection.docId,
      title: result.collection.title,
      description: result.collection.description,
      media: result.media.map((media) => ({
        docId: media.docId,
        filename: media.filename,
        caption: media.caption ?? null,
        width: media.renditions?.reader?.width ?? media.width,
        height: media.renditions?.reader?.height ?? media.height,
        url: `/api/reader/media/${encodeURIComponent(media.docId)}?rendition=reader`,
      })),
    },
  });
}
