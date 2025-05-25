import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, query, where, orderBy, limit, startAfter, getDocs } from 'firebase/firestore';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('limit') || '10');
    const category = searchParams.get('category');
    const tags = searchParams.get('tags')?.split(',');

    const storiesRef = collection(db, 'stories');
    let q = query(storiesRef);

    // Apply filters
    if (category) {
      q = query(q, where('category', '==', category));
    }
    if (tags && tags.length > 0) {
      q = query(q, where('tags', 'array-contains-any', tags));
    }

    // Apply pagination
    q = query(
      q,
      orderBy('date', 'desc'),
      limit(pageSize),
      ...(page > 1 ? [startAfter((page - 1) * pageSize)] : [])
    );

    const snapshot = await getDocs(q);
    const stories = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // Check if there are more stories
    const nextSnapshot = await getDocs(
      query(q, limit(1), startAfter(snapshot.docs[snapshot.docs.length - 1]))
    );
    const hasMore = !nextSnapshot.empty;

    return NextResponse.json({
      stories,
      hasMore,
      page,
      pageSize
    });
  } catch (error) {
    console.error('Error fetching stories:', error);
    return NextResponse.json(
      { error: 'Failed to fetch stories' },
      { status: 500 }
    );
  }
} 