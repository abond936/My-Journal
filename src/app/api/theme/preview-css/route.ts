import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/authOptions';
import { buildThemeTokensCss, themeDataForCssGeneration } from '@/lib/services/themeService';
import { scopeThemeTokensCss } from '@/lib/theme/scopeThemeTokensCss';

const READER_PREVIEW_SCOPE = '.themeAdminReaderPreview';

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
    const body = await request.json();
    if (!body?.palette || !Array.isArray(body.palette)) {
      return errorResponse(
        {
          ok: false,
          code: 'THEME_PREVIEW_INVALID_BODY',
          message: 'Invalid theme data.',
          severity: 'error',
          retryable: false,
        },
        400
      );
    }

    const cleaned = themeDataForCssGeneration(body);
    const raw = buildThemeTokensCss(cleaned);
    const css = scopeThemeTokensCss(raw, READER_PREVIEW_SCOPE);
    return NextResponse.json({ css });
  } catch (error) {
    console.error('[preview-css]', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return errorResponse(
      {
        ok: false,
        code: 'THEME_PREVIEW_BUILD_FAILED',
        message: 'Failed to build preview CSS.',
        severity: 'error',
        retryable: true,
        error: message,
      },
      500
    );
  }
}
