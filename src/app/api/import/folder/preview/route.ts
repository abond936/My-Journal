import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/authOptions';
import { getImportFolderPreview } from '@/lib/services/importFolderAsCard';

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const folderPath = body.folderPath as string | undefined;

    if (!folderPath || typeof folderPath !== 'string') {
      return NextResponse.json(
        { message: 'folderPath is required.' },
        { status: 400 }
      );
    }

    const preview = await getImportFolderPreview(folderPath);
    return NextResponse.json(preview);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'An unknown error occurred';
    console.error('[/api/import/folder/preview] Error:', error);
    return NextResponse.json(
      { message: 'Error previewing folder.', error: message },
      { status: 500 }
    );
  }
}
