import { NextResponse } from 'next/server';
import { createAlbum, getAllAlbums } from '@/lib/services/albumService';

export async function GET() {
  try {
    const albums = await getAllAlbums();
    return NextResponse.json(albums);
  } catch (error) {
    console.error('Error fetching albums:', error);
    return NextResponse.json(
      { error: 'Failed to fetch albums', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const newAlbumData = {
      title: 'New Album',
      caption: '',
      description: '',
      tags: [],
      status: 'draft',
    };
    
    const newAlbum = await createAlbum(newAlbumData);
    
    return NextResponse.json(newAlbum, { status: 201 });
  } catch (error) {
    console.error('Error creating new album:', error);
    return NextResponse.json(
      { error: 'Failed to create album', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 