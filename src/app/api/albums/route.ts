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

// ... existing GET function ...

/**
 * Handles the creation of a new album.
 * It expects album data (e.g., title, description) in the request body.
 */
export async function POST(request: Request) {
  try {
    // 1. Read the JSON data from the incoming request.
    // This will be the album details submitted by the user from the form.
    const albumData = await request.json();

    // 2. Validate that at least a title is present.
    // This is a basic server-side check to ensure essential data is not missing.
    if (!albumData.title) {
      return NextResponse.json(
        { error: 'Title is a required field.' },
        { status: 400 } // 400 Bad Request is the appropriate status code for missing data.
      );
    }

    // 3. Call the existing `createAlbum` service function, passing the validated form data.
    // The service layer handles the logic of adding default values and creating the record in Firestore.
    const newAlbum = await createAlbum(albumData);
    
    // 4. Return the newly created album object with a 201 Created status.
    return NextResponse.json(newAlbum, { status: 201 });

  } catch (error) {
    console.error('Error creating new album:', error);
    return NextResponse.json(
      { error: 'Failed to create album', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}