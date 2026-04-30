import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/authOptions';
import { importFromBuffer } from '@/lib/services/images/imageImportService';

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

export async function POST(req: NextRequest) {
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

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return errorResponse(
        {
          ok: false,
          code: 'MEDIA_UPLOAD_FILE_REQUIRED',
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
          code: 'MEDIA_UPLOAD_FILE_TYPE_INVALID',
          message: 'Invalid file type. Only images are allowed.',
          severity: 'error',
          retryable: false,
        },
        400
      );
    }
    
    const fileBuffer = Buffer.from(await file.arrayBuffer());
    
    const newMedia = await importFromBuffer(fileBuffer, file.name);

    return NextResponse.json(newMedia, { status: 201 });

  } catch (error) {
    console.error('Error uploading file:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return errorResponse(
      {
        ok: false,
        code: 'MEDIA_UPLOAD_FAILED',
        message: 'Failed to upload file.',
        severity: 'error',
        retryable: true,
        error: errorMessage,
      },
      500
    );
  }
} 