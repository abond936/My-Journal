import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { updateMediaStatus } from '@/lib/services/images/imageImportService';
import { mediaSchema } from '@/lib/types/photo';

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'admin') {
    return new NextResponse('Forbidden', { status: 403 });
  }

  const mediaId = params.id;
  if (!mediaId) {
    return NextResponse.json({ message: 'Media ID is required.' }, { status: 400 });
  }

  try {
    const body = await request.json();
    const status = body.status;

    // Validate the status against the schema's enum
    const statusValidation = mediaSchema.shape.status.safeParse(status);
    if (!statusValidation.success) {
      return NextResponse.json({ message: 'Invalid status provided.', issues: statusValidation.error.issues }, { status: 400 });
    }

    await updateMediaStatus(mediaId, status);

    return NextResponse.json({ message: `Media asset ${mediaId} status updated to ${status}.` });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    console.error(`Error updating media status for ${mediaId}:`, errorMessage);
    return NextResponse.json({ message: 'Error updating media status.', error: errorMessage }, { status: 500 });
  }
} 