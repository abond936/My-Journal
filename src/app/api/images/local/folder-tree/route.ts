import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { getFolderTree } from '@/lib/services/localPhotoService';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const folderTree = getFolderTree();
    return NextResponse.json(folderTree);
  } catch (error) {
    console.error('Error fetching folder tree:', error);
    return NextResponse.json({ error: 'Failed to fetch folder tree' }, { status: 500 });
  }
} 