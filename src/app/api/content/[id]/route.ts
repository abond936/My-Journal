import { NextResponse } from 'next/server';
import { getJournalPage } from '@/lib/journal';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const story = await getJournalPage(params.id);
    
    if (!story) {
      return new NextResponse(
        JSON.stringify({ error: 'Story not found' }),
        {
          status: 404,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
    }

    return NextResponse.json(story);
  } catch (error) {
    console.error('Error loading story:', error);
    return new NextResponse(
      JSON.stringify({ error: 'Error loading story' }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }
} 