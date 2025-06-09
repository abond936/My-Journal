import { NextResponse, NextRequest } from 'next/server';
import { getEntries } from '@/lib/services/entryService';
import { getAlbums } from '@/lib/services/albumService';
import { Entry } from '@/lib/types/entry';
import { Album } from '@/lib/types/album';
import { adminDb } from '@/lib/config/firebase/admin';
import { DocumentSnapshot } from 'firebase-admin/firestore';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const contentType = searchParams.get('type') || 'all';
    const tagsParam = searchParams.get('tags');
    const tags = tagsParam ? tagsParam.split(',') : [];

    // Pagination parameters
    const entryLastDocId = searchParams.get('entryLastDocId');
    const albumLastDocId = searchParams.get('albumLastDocId');

    let entryLastDoc: DocumentSnapshot | undefined;
    if (entryLastDocId) {
      entryLastDoc = await adminDb.collection('entries').doc(entryLastDocId).get();
    }
    let albumLastDoc: DocumentSnapshot | undefined;
    if (albumLastDocId) {
      albumLastDoc = await adminDb.collection('albums').doc(albumLastDocId).get();
    }

    let entries: Entry[] = [];
    let albums: Album[] = [];
    let newEntryLastDocId: string | null = null;
    let newAlbumLastDocId: string | null = null;
    let hasMoreEntries = false;
    let hasMoreAlbums = false;

    if (contentType === 'entries' || contentType === 'all') {
      const entryResult = await getEntries({ tags: tags.length > 0 ? tags : undefined, lastDoc: entryLastDoc });
      entries = entryResult.items;
      newEntryLastDocId = entryResult.lastDoc?.id || null;
      hasMoreEntries = entryResult.hasMore;
    }
    if (contentType === 'albums' || contentType === 'all') {
      const albumResult = await getAlbums({ tags: tags.length > 0 ? tags : undefined, lastDoc: albumLastDoc });
      albums = albumResult.items;
      newAlbumLastDocId = albumResult.lastDoc?.id || null;
      hasMoreAlbums = albumResult.hasMore;
    }
    
    const combinedContent = [...entries, ...albums];
    
    combinedContent.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    const responsePayload = {
      items: combinedContent,
      entryLastDocId: newEntryLastDocId,
      albumLastDocId: newAlbumLastDocId,
      hasMore: hasMoreEntries || hasMoreAlbums,
    };

    return NextResponse.json(responsePayload);

  } catch (error) {
    console.error('Error fetching content:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return new NextResponse(
      JSON.stringify({ message: `Failed to fetch content: ${errorMessage}` }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
} 