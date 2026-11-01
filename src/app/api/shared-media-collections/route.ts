import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/authOptions';
import { filterSharedMediaCollectionsForAudience } from '@/lib/auth/audienceAccess';
import { isAuthenticatedSession } from '@/lib/auth/readerAccess';
import { listSharedMediaCollections } from '@/lib/services/sharedMediaCollectionService';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!isAuthenticatedSession(session)) {
    return NextResponse.json({ ok: false, code: 'AUTH_REQUIRED', message: 'Authentication required.' }, { status: 401 });
  }
  const all = await listSharedMediaCollections();
  const collections = await filterSharedMediaCollectionsForAudience(session, all);
  return NextResponse.json({
    ok: true,
    collections: collections.map((collection) => ({
      docId: collection.docId,
      title: collection.title,
      description: collection.description,
      mediaCount: collection.mediaIds.length,
      order: collection.order,
    })),
  });
}
