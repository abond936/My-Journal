import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/config/firebase/admin';
import { Tag } from '@/lib/types/tag';

/**
 * Fetches all tags from the Firestore database.
 * This is a server-side route, ensuring database credentials are not exposed to the client.
 */
export async function GET() {
  try {
    const tagsRef = adminDb.collection('tags');
    // Order tags to ensure a consistent, hierarchical order for the client to process.
    // Root tags (no parentId) will come first, then tags are grouped by their parent.
    const snapshot = await tagsRef.orderBy('parentId').orderBy('order').get();

    if (snapshot.empty) {
      // If there are no tags, return an empty array.
      return NextResponse.json([]);
    }

    // Map the Firestore documents to the Tag type.
    const tags: Tag[] = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        name: data.name,
        dimension: data.dimension,
        parentId: data.parentId || null,
        order: data.order || 0,
        description: data.description || '',
        entryCount: data.entryCount || 0,
        albumCount: data.albumCount || 0,
      } as Tag;
    });

    return NextResponse.json(tags);

  } catch (error) {
    // Log any errors to the server console and return a generic error message.
    console.error('Error fetching tags:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tags', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}