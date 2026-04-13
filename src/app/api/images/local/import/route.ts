import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/authOptions';
import { getAllTags } from '@/lib/firebase/tagService';
import { buildTagNameLookupMaps } from '@/lib/services/images/embeddedMetadataForImport';
import { importFromLocalDrive } from '@/lib/services/images/imageImportService';

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== 'admin') {
    return new NextResponse('Forbidden', { status: 403 });
  }

  let sourcePathForLog: string | undefined;
  try {
    const body = await request.json();
    const sourcePath = body.sourcePath;
    sourcePathForLog = sourcePath;

    if (!sourcePath) {
      return NextResponse.json({ message: 'sourcePath is required.' }, { status: 400 });
    }

    const tagNameMaps = buildTagNameLookupMaps(await getAllTags());
    const { mediaId, media } = await importFromLocalDrive(sourcePath, {
      readMetadata: true,
      tagNameMaps,
      normalizeInMemory: true,
    });

    return NextResponse.json({ mediaId, media });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    console.error('[/api/images/local/import] Error importing image:', {
      sourcePath: sourcePathForLog,
      error: error instanceof Error ? {
        message: error.message,
        stack: error.stack,
        name: error.name
      } : error
    });
    return NextResponse.json({ message: 'Error importing image.', error: errorMessage }, { status: 500 });
  }
} 