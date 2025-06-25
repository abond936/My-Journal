import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { importFromBuffer } from '@/lib/services/images/imageImportService';

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'admin') {
    return new NextResponse('Forbidden', { status: 403 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!file.type.startsWith('image/')) {
        return NextResponse.json({ message: 'Invalid file type. Only images are allowed.' }, { status: 400 });
    }
    
    const fileBuffer = Buffer.from(await file.arrayBuffer());
    
    const newMedia = await importFromBuffer(fileBuffer, file.name);

    return NextResponse.json(newMedia, { status: 201 });

  } catch (error) {
    console.error('Error uploading file:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ error: `Failed to upload file: ${errorMessage}` }, { status: 500 });
  }
} 