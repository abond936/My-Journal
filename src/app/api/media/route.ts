import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { getAdminApp } from '@/lib/config/firebase/admin';
import { Media } from '@/lib/types/photo';

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'admin') {
    return new NextResponse('Forbidden', { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const status = searchParams.get('status');
    const source = searchParams.get('source');
    const dimensions = searchParams.get('dimensions');
    const hasCaption = searchParams.get('hasCaption');
    const search = searchParams.get('search');

    const app = getAdminApp();
    const firestore = app.firestore();
    const mediaRef = firestore.collection('media');

    // Build query
    let query = mediaRef;

    // Apply filters
    if (status && status !== 'all') {
      query = query.where('status', '==', status);
    }

    if (source && source !== 'all') {
      query = query.where('source', '==', source);
    }

    if (hasCaption && hasCaption !== 'all') {
      if (hasCaption === 'with') {
        query = query.where('caption', '!=', '');
      } else if (hasCaption === 'without') {
        query = query.where('caption', '==', '');
      }
    }

    // Get total count for pagination
    const countSnapshot = await query.get();
    const total = countSnapshot.size;

    // Apply pagination
    const offset = (page - 1) * limit;
    query = query.orderBy('createdAt', 'desc').limit(limit).offset(offset);

    const snapshot = await query.get();
    const media: Media[] = [];

    snapshot.forEach(doc => {
      const data = doc.data() as Media;
      media.push({ ...data, docId: doc.id });
    });

    // Apply client-side filters that can't be done in Firestore
    let filteredMedia = media;

    // Dimensions filter (client-side)
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

    // Search filter (client-side)
    if (search) {
      const searchLower = search.toLowerCase();
      filteredMedia = filteredMedia.filter(item => 
        item.filename.toLowerCase().includes(searchLower) ||
        (item.caption && item.caption.toLowerCase().includes(searchLower)) ||
        item.sourcePath.toLowerCase().includes(searchLower)
      );
    }

    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      media: filteredMedia,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    console.error('Error fetching media:', errorMessage);
    return NextResponse.json({ message: 'Error fetching media.', error: errorMessage }, { status: 500 });
  }
} 