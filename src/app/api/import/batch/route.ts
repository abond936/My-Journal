import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/authOptions';
import { batchImportMediaOnly } from '@/lib/services/importFolderAsCard';

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const rootPath = body.rootPath as string | undefined;

    if (!rootPath || typeof rootPath !== 'string') {
      return NextResponse.json(
        { message: 'rootPath is required.' },
        { status: 400 }
      );
    }

    const result = await batchImportMediaOnly(rootPath);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'An unknown error occurred';
    console.error('[/api/import/batch] Error:', error);
    return NextResponse.json(
      { message: 'Batch import failed.', error: message },
      { status: 500 }
    );
  }
}
