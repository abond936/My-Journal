import { NextResponse } from 'next/server';
import { getResolvedScopedThemeDocument, saveThemeData } from '@/lib/services/themeService';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/authOptions';

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

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session || (session.user as any).role !== 'admin') {
    return errorResponse(
      {
        ok: false,
        code: 'AUTH_FORBIDDEN',
        message: 'Unauthorized.',
        severity: 'error',
        retryable: false,
      },
      403
    );
  }

  try {
    const themeData = await getResolvedScopedThemeDocument();
    return NextResponse.json(themeData);
  } catch (error) {
    console.error('API Error fetching theme data:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return errorResponse(
      {
        ok: false,
        code: 'THEME_FETCH_FAILED',
        message: 'Failed to fetch theme data.',
        severity: 'error',
        retryable: true,
        error: message,
      },
      500
    );
  }
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session || (session.user as any).role !== 'admin') {
    return errorResponse(
      {
        ok: false,
        code: 'AUTH_FORBIDDEN',
        message: 'Unauthorized.',
        severity: 'error',
        retryable: false,
      },
      403
    );
  }

  try {
    const themeData = await request.json();
    
    // Validate the theme data structure
    const isScopedThemeDocument = themeData?.version === 2 && themeData.reader?.data && themeData.admin?.data;
    const isLegacyThemeDocument = themeData?.palette && Array.isArray(themeData.palette);
    if (!themeData || (!isScopedThemeDocument && !isLegacyThemeDocument)) {
      return errorResponse(
        {
          ok: false,
          code: 'THEME_INVALID_STRUCTURE',
          message: 'Invalid theme data structure.',
          severity: 'error',
          retryable: false,
        },
        400
      );
    }

    await saveThemeData(themeData);
    return NextResponse.json({ success: true, message: 'Theme saved successfully' });
  } catch (error) {
    console.error('API Error saving theme data:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return errorResponse(
      {
        ok: false,
        code: 'THEME_SAVE_FAILED',
        message: 'Failed to save theme data.',
        severity: 'error',
        retryable: true,
        error: message,
      },
      500
    );
  }
} 