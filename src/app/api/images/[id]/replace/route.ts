import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/authOptions';
import { replaceMediaAssetContent } from '@/lib/services/images/imageImportService';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'admin') {
    return new NextResponse('Forbidden', { status: 403 });
  }

  const { id: mediaId } = await params;
  if (!mediaId) {
    return NextResponse.json({ message: 'Media ID is required.' }, { status: 400 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file');
    if (!(file instanceof File)) {
      return NextResponse.json({ message: 'No file provided.' }, { status: 400 });
    }
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ message: 'Only image files are supported.' }, { status: 400 });
    }

    const fileBuffer = Buffer.from(await file.arrayBuffer());
    await replaceMediaAssetContent(mediaId, fileBuffer, file.name);

    return NextResponse.json({ message: `Media asset ${mediaId} replaced successfully.` });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    console.error(`Error replacing media asset ${mediaId}:`, errorMessage);
    return NextResponse.json(
      { message: 'Error replacing media asset.', error: errorMessage },
      { status: 500 }
    );
  }
}
