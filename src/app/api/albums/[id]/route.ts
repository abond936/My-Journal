import { NextResponse, NextRequest } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]/route';
import { updateAlbum, deleteAlbum, getAlbum } from '@/lib/services/albumService';

/**
 * Handles fetching a single album by its ID.
 */
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const { id } = params;
    const album = await getAlbum(id);

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
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'admin') {
    return new NextResponse(JSON.stringify({ error: 'Forbidden' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const { id } = params;
    const body = await request.json();
    
    await updateAlbum(id, body);
    
    const updatedAlbum = await getAlbum(id);
    return NextResponse.json(updatedAlbum);
  } catch (error) {
    const { id } = params;
    console.error(`Error updating album ${id}:`, error);
    return NextResponse.json(
      { error: 'Failed to update album', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'admin') {
    return new NextResponse(JSON.stringify({ error: 'Forbidden' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const { id } = params;
    
    await deleteAlbum(id);
    
    return NextResponse.json({ message: 'Album deleted successfully' });
  } catch (error) {
    const { id } = params;
    console.error(`Error deleting album ${id}:`, error);
    return NextResponse.json(
      { error: 'Failed to delete album', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 