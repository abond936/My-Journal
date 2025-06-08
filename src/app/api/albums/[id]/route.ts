import { NextResponse, NextRequest } from 'next/server';
import { updateAlbum, deleteAlbum } from '@/lib/services/albumService';

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