import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/authOptions';
import { replaceMediaAssetContent } from '@/lib/services/images/imageImportService';

type ApiErrorPayload = {
  ok: false;
  code: string;
  message: string;
  severity: 'error' | 'warning';
  retryable: boolean;
  error?: string;
};

function errorResponse(payload: ApiErrorPayload, status: number) {
  return NextResponse.json(payload, { status });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'admin') {
    return errorResponse(
      {
        ok: false,
        code: 'AUTH_FORBIDDEN',
        message: 'Forbidden.',
        severity: 'error',
        retryable: false,
      },
      403
    );
  }

  const { id: mediaId } = await params;
  if (!mediaId) {
    return errorResponse(
      {
        ok: false,
        code: 'MEDIA_ID_REQUIRED',
        message: 'Media ID is required.',
        severity: 'error',
        retryable: false,
      },
      400
    );
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file');
    if (!(file instanceof File)) {
      return errorResponse(
        {
          ok: false,
          code: 'MEDIA_REPLACE_FILE_REQUIRED',
          message: 'No file provided.',
          severity: 'error',
          retryable: false,
        },
        400
      );
    }
    if (!file.type.startsWith('image/')) {
      return errorResponse(
        {
          ok: false,
          code: 'MEDIA_REPLACE_FILE_TYPE_INVALID',
          message: 'Only image files are supported.',
          severity: 'error',
          retryable: false,
        },
        400
      );
    }

    const fileBuffer = Buffer.from(await file.arrayBuffer());
    await replaceMediaAssetContent(mediaId, fileBuffer, file.name);

    return NextResponse.json({ message: `Media asset ${mediaId} replaced successfully.` });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    console.error(`Error replacing media asset ${mediaId}:`, errorMessage);
    return errorResponse(
      {
        ok: false,
        code: 'MEDIA_REPLACE_FAILED',
        message: 'Error replacing media asset.',
        severity: 'error',
        retryable: true,
        error: errorMessage,
      },
      500
    );
  }
}
