import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import type { CollectionReference, Query } from 'firebase-admin/firestore';
import { authOptions } from '@/lib/auth/authOptions';
import { getAdminApp } from '@/lib/config/firebase/admin';
import { Media } from '@/lib/types/photo';
import { applyPublicStorageUrls } from '@/lib/utils/storageUrl';
import { seekMediaByAssignment } from '@/lib/utils/mediaAssignmentSeek';

function buildBaseQuery(
  mediaRef: CollectionReference,
  status: string | null,
  source: string | null,
  hasCaption: string | null
): Query {
  let baseQuery: Query = mediaRef;

  if (status && status !== 'all') {
    baseQuery = baseQuery.where('status', '==', status);
  }

  if (source && source !== 'all') {
    baseQuery = baseQuery.where('source', '==', source);
  }

  if (hasCaption && hasCaption !== 'all') {
    if (hasCaption === 'with') {
      baseQuery = baseQuery.where('caption', '!=', '');
    } else if (hasCaption === 'without') {
      baseQuery = baseQuery.where('caption', '==', '');
    }
  }

  return baseQuery;
}

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'admin') {
    return new NextResponse('Forbidden', { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 100);
    const cursor = searchParams.get('cursor');
    const prevCursor = searchParams.get('prevCursor');
    const status = searchParams.get('status');
    const source = searchParams.get('source');
    const dimensions = searchParams.get('dimensions');
    const hasCaption = searchParams.get('hasCaption');
    const search = searchParams.get('search');
    const assignment = searchParams.get('assignment') || 'all';

    const app = getAdminApp();
    const firestore = app.firestore();
    const mediaRef = firestore.collection('media');
    const baseQuery = buildBaseQuery(mediaRef, status, source, hasCaption);

    // Assignment filter: sequential scan (referencedByCardIds not queryable as "empty")
    if (assignment === 'unassigned' || assignment === 'assigned') {
      const { media, nextScanCursor, hasNext } = await seekMediaByAssignment(
        baseQuery,
        firestore,
        limit,
        cursor,
        assignment,
        dimensions,
        search
      );

      const mediaWithUrls = applyPublicStorageUrls(media);

      return NextResponse.json({
        media: mediaWithUrls,
        pagination: {
          limit,
          total: null,
          totalPages: null,
          seekMode: true,
          hasNext,
          hasPrev: false,
          nextCursor: hasNext ? nextScanCursor : null,
          prevCursor: null,
        },
      });
    }

    // --- Default: index-aligned pagination ---
    let total = 0;
    try {
      const countSnapshot = await baseQuery.count().get();
      total = countSnapshot.data().count;
    } catch (countErr) {
      console.warn('[media API] Count aggregation failed, total unknown:', countErr);
    }

    let paginatedQuery: Query = baseQuery.orderBy('createdAt', 'desc').limit(limit + 1);

    if (prevCursor) {
      const prevDoc = await firestore.collection('media').doc(prevCursor).get();
      if (prevDoc.exists) {
        paginatedQuery = baseQuery.orderBy('createdAt', 'desc').endBefore(prevDoc).limit(limit + 1);
      }
    } else if (cursor) {
      const cursorDoc = await firestore.collection('media').doc(cursor).get();
      if (cursorDoc.exists) {
        paginatedQuery = baseQuery.orderBy('createdAt', 'desc').startAfter(cursorDoc).limit(limit + 1);
      }
    }

    const snapshot = await paginatedQuery.get();
    const hasMore = snapshot.docs.length > limit;
    const docs = hasMore ? snapshot.docs.slice(0, limit) : snapshot.docs;

    const media: Media[] = [];
    docs.forEach(doc => {
      const data = doc.data() as Media;
      media.push({ ...data, docId: doc.id });
    });

    let filteredMedia = media;

    if (dimensions && dimensions !== 'all') {
      filteredMedia = filteredMedia.filter(item => {
        const aspectRatio = item.width / item.height;
        switch (dimensions) {
          case 'portrait':
            return aspectRatio < 1;
          case 'landscape':
            return aspectRatio > 1;
          case 'square':
            return Math.abs(aspectRatio - 1) < 0.1;
          default:
            return true;
        }
      });
    }

    if (search) {
      const searchLower = search.toLowerCase();
      filteredMedia = filteredMedia.filter(item =>
        item.filename.toLowerCase().includes(searchLower) ||
        (item.caption && item.caption.toLowerCase().includes(searchLower)) ||
        (item.sourcePath && item.sourcePath.toLowerCase().includes(searchLower))
      );
    }

    const firstDocId = docs.length > 0 ? docs[0].id : null;
    const lastDocId = docs.length > 0 ? docs[docs.length - 1].id : null;
    const totalPages = total > 0 ? Math.ceil(total / limit) : 1;

    const mediaWithUrls = applyPublicStorageUrls(filteredMedia);

    return NextResponse.json({
      media: mediaWithUrls,
      pagination: {
        limit,
        total,
        totalPages,
        seekMode: false,
        hasNext: hasMore,
        hasPrev: !!(prevCursor || cursor),
        nextCursor: hasMore ? lastDocId : null,
        prevCursor: prevCursor || cursor ? firstDocId : null,
      },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    console.error('Error fetching media:', errorMessage);
    return NextResponse.json({ message: 'Error fetching media.', error: errorMessage }, { status: 500 });
  }
}
