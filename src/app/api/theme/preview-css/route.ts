import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/authOptions';
import { buildThemeTokensCss, themeDataForCssGeneration } from '@/lib/services/themeService';
import { scopeThemeTokensCss } from '@/lib/theme/scopeThemeTokensCss';

const READER_PREVIEW_SCOPE = '.themeAdminReaderPreview';
const ADMIN_PREVIEW_SCOPE = '.themeAdminAdminPreview';

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
    const themeData = body?.themeData ?? body;
    if (!themeData?.palette || !Array.isArray(themeData.palette)) {
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

    const scope = body?.scope === 'admin' ? ADMIN_PREVIEW_SCOPE : READER_PREVIEW_SCOPE;
    const cleaned = themeDataForCssGeneration(themeData);
    const raw = buildThemeTokensCss(cleaned);
    const css = scopeThemeTokensCss(raw, scope);
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
