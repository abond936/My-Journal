import { NextResponse, NextRequest } from 'next/server';
import { updateAlbum, deleteAlbum, getAlbumById } from '@/lib/services/albumService';

/**
 * Handles fetching a single album by its ID.
 */
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    const album = await getAlbumById(id);

    // If no album is found, return a 404 Not Found response.
    if (!album) {
      return NextResponse.json({ error: 'Album not found' }, { status: 404 });
    }

    // Return the found album data.
    return NextResponse.json(album);

  } catch (error) {
    console.error(`Error fetching album ${params.id}:`, error);
    return NextResponse.json(
      { error: 'Failed to fetch album', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    const body = await request.json();
    
    await updateAlbum(id, body);
    
    return NextResponse.json({ message: 'Album updated successfully' });
  } catch (error) {
    console.error(`Error updating album ${params.id}:`, error);
    return NextResponse.json(
      { error: 'Failed to update album', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    
    await deleteAlbum(id);
    
    return NextResponse.json({ message: 'Album deleted successfully' });
  } catch (error) {
    console.error(`Error deleting album ${params.id}:`, error);
    return NextResponse.json(
      { error: 'Failed to delete album', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 