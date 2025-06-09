import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/config/firebase/admin';
import { Tag } from '@/lib/types/tag';

interface TagWithCount extends Tag {
  entryCount: number;
}

export async function GET() {
  try {
    const tagsRef = adminDb.collection('tags');
    const entriesRef = adminDb.collection('entries');

    // 1. Fetch all tags and entries in parallel using the correct Admin SDK syntax
    const [tagsSnapshot, entriesSnapshot] = await Promise.all([
      tagsRef.orderBy('order').get(),
      entriesRef.get()
    ]);

    const allTags = tagsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Tag[];
    const allEntries = entriesSnapshot.docs.map(doc => doc.data());

    // 2. Create a map for efficient entry counting
    const tagEntryCount = new Map<string, number>();
    allEntries.forEach(entry => {
      if (entry.tags && Array.isArray(entry.tags)) {
        entry.tags.forEach(tagId => {
          tagEntryCount.set(tagId, (tagEntryCount.get(tagId) || 0) + 1);
        });
      }
    });

    // 3. Combine tags with their counts
    const tagsWithCounts: TagWithCount[] = allTags.map(tag => ({
      ...tag,
      entryCount: tagEntryCount.get(tag.id) || 0,
    }));

    return NextResponse.json(tagsWithCounts);

  } catch (error) {
    console.error('Error fetching tag tree data:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return new NextResponse(
      JSON.stringify({ message: `Failed to fetch tag tree: ${errorMessage}` }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
} 