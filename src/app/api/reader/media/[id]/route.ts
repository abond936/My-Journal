import { Readable } from 'node:stream';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/authOptions';
import { canReadMedia } from '@/lib/auth/readerMediaAccess';
import { isAuthenticatedSession } from '@/lib/auth/readerAccess';
import { getAdminApp } from '@/lib/config/firebase/admin';
import type { Media } from '@/lib/types/photo';
import type { ReaderMediaRendition } from '@/lib/utils/readerMediaDelivery';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function notFound() {
  return NextResponse.json({ message: 'Media not found.' }, { status: 404 });
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!isAuthenticatedSession(session)) {
    return NextResponse.json({ message: 'Authentication required.' }, { status: 401 });
  }

  const { id } = await params;
  if (!id || id.length > 1500 || id.includes('/')) return notFound();

  const renditionParam = new URL(request.url).searchParams.get('rendition') ?? 'reader';
  if (!['original', 'reader', 'studio'].includes(renditionParam)) {
    return NextResponse.json({ message: 'Invalid rendition.' }, { status: 400 });
  }
  const rendition = renditionParam as ReaderMediaRendition;

  const app = getAdminApp();
  const mediaSnap = await app.firestore().collection('media').doc(id).get();
  if (!mediaSnap.exists) return notFound();
  const media = { docId: mediaSnap.id, ...mediaSnap.data() } as Media;
  if (!(await canReadMedia(session, media, app.firestore()))) return notFound();

  const selected = rendition === 'original' ? undefined : media.renditions?.[rendition];
  const storagePath = selected?.storagePath ?? media.storagePath;
  if (!storagePath) return notFound();

  const file = app.storage().bucket().file(storagePath);
  const [exists] = await file.exists();
  if (!exists) return notFound();
  const [metadata] = await file.getMetadata();
  const contentType = selected?.contentType || metadata.contentType || media.contentType || 'application/octet-stream';
  const body = Readable.toWeb(file.createReadStream()) as ReadableStream;

  return new Response(body, {
    status: 200,
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
