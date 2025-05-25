import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const storyRef = doc(db, 'stories', params.id);
    const storyDoc = await getDoc(storyRef);

    if (!storyDoc.exists()) {
      return NextResponse.json(
        { error: 'Story not found' },
        { status: 404 }
      );
    }

    const story = { id: storyDoc.id, ...storyDoc.data() };
    return NextResponse.json(story);
  } catch (error) {
    console.error('Error fetching story:', error);
    return NextResponse.json(
      { error: 'Failed to fetch story' },
      { status: 500 }
    );
  }
} 