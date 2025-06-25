import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { importFromLocalDrive } from '@/lib/services/images/imageImportService';

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== 'admin') {
    return new NextResponse('Forbidden', { status: 403 });
  }

  try {
    const body = await request.json();
    const sourcePath = body.sourcePath;

    if (!sourcePath) {
      return NextResponse.json({ message: 'sourcePath is required.' }, { status: 400 });
    }

    const newMedia = await importFromLocalDrive(sourcePath);

    return NextResponse.json(newMedia);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    console.error('Error importing image:', errorMessage);
    return NextResponse.json({ message: 'Error importing image.', error: errorMessage }, { status: 500 });
  }
} 