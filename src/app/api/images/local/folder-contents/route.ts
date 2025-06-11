import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { getFolderContents } from '@/lib/services/localPhotoService';

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const { folderPath } = await request.json();
    if (!folderPath) {
      return NextResponse.json({ error: 'folderPath is required' }, { status: 400 });
    }

    const contents = await getFolderContents(folderPath);
    return NextResponse.json(contents);
  } catch (error) {
    console.error('Error fetching folder contents:', error);
    return NextResponse.json({ error: 'Failed to fetch folder contents' }, { status: 500 });
  }
}