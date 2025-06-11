import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]/route';
import { createAlbum, getAllAlbums } from '@/lib/services/albumService';

/**
 * @swagger
 * /api/albums:
 *   get:
 *     summary: Retrieve all albums
 *     description: Fetches a complete list of all albums, sorted by date.
 *     responses:
 *       200:
 *         description: A list of albums.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Album'
 *       500:
 *         description: Internal server error.
 */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const albums = await getAllAlbums();
    return NextResponse.json(albums);
  } catch (error) {
    console.error('API Error fetching all albums:', error);
    return new NextResponse('Internal server error', { status: 500 });
  }
}

/**
 * Handles the creation of a new album.
 * It expects album data (e.g., title, description) in the request body.
 */
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'admin') {
    return new NextResponse(JSON.stringify({ error: 'Forbidden' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

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