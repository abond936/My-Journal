import { NextResponse } from 'next/server';
import { getFolderTree } from '@/lib/services/localPhotoService';

export async function GET() {
  try {
    const folderTree = getFolderTree();
    return NextResponse.json(folderTree);
  } catch (error) {
    console.error('Error fetching folder tree:', error);
    return NextResponse.json({ error: 'Failed to fetch folder tree' }, { status: 500 });
  }
} 