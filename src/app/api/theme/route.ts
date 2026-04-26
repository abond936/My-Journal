import { NextResponse } from 'next/server';
import { getResolvedScopedThemeDocument, isPersistedThemeDocument, saveThemeData } from '@/lib/services/themeService';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/authOptions';

function isThemeSaveEnabled(): boolean {
  return true;
}

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

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session || (session.user as { role?: string }).role !== 'admin') {
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

  if (!session || (session.user as { role?: string }).role !== 'admin') {
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
    if (!isThemeSaveEnabled()) {
      return errorResponse(
        {
          ok: false,
          code: 'THEME_SAVE_PAUSED',
          message: 'Theme saving is paused while the semantic theme model is finalized.',
          severity: 'warning',
          retryable: false,
        },
        409
      );
    }

    const themeData = await request.json();
    
    // Save-ready contract: persisted themes must use the scoped reader/admin document shape.
    if (!themeData || !isPersistedThemeDocument(themeData)) {
      return errorResponse(
        {
          ok: false,
          code: 'THEME_INVALID_STRUCTURE',
          message: 'Invalid persisted theme document. Save expects the scoped reader/admin theme shape.',
          severity: 'error',
          retryable: false,
        },
        400
      );
    }

    const result = await saveThemeData(themeData);
    return NextResponse.json({
      success: true,
      message: result.backupSaved
        ? 'Theme saved successfully.'
        : 'Theme saved to Firestore, but the theme-data.json backup could not be updated.',
      backupSaved: result.backupSaved,
      backupError: result.backupError,
    });
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
