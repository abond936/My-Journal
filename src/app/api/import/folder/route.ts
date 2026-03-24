import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/authOptions';
import { importFolderAsCard, importFolderAsMediaOnly } from '@/lib/services/importFolderAsCard';

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const folderPath = body.folderPath as string | undefined;
    const overwriteCardId = body.overwriteCardId as string | undefined;
    const mediaOnly = body.mediaOnly === true;

    if (!folderPath || typeof folderPath !== 'string') {
      return NextResponse.json(
        { message: 'folderPath is required.' },
        { status: 400 }
      );
    }

    if (mediaOnly) {
      const result = await importFolderAsMediaOnly(folderPath);
      return NextResponse.json(result);
    }

    const result = await importFolderAsCard(folderPath, {
      overwriteCardId: overwriteCardId || undefined,
    });

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'An unknown error occurred';
    console.error('[/api/import/folder] Error:', error);
    return NextResponse.json(
      { message: 'Error importing folder.', error: message },
      { status: 500 }
    );
  }
}
