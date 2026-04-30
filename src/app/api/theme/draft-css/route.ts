import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/authOptions';
import { buildScopedDraftThemeCss, normalizeThemeDocument } from '@/lib/services/themeService';
import type { ResolvedScopedThemeDocumentData, ScopedThemeDocumentData } from '@/lib/types/theme';

const READER_DRAFT_SCOPE = '.themeDraftReaderScope';
const ADMIN_DRAFT_SCOPE = '.themeDraftAdminScope';

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
    const readerScope =
      typeof body?.readerScopeSelector === 'string' && /^\.[A-Za-z0-9_-]+$/.test(body.readerScopeSelector)
        ? body.readerScopeSelector
        : READER_DRAFT_SCOPE;
    const adminScope =
      typeof body?.adminScopeSelector === 'string' && /^\.[A-Za-z0-9_-]+$/.test(body.adminScopeSelector)
        ? body.adminScopeSelector
        : ADMIN_DRAFT_SCOPE;

    const isScopedDraftPayload =
      body?.version === 2 &&
      body?.reader?.data?.palette &&
      Array.isArray(body?.reader?.data?.palette) &&
      body?.admin?.data?.palette &&
      Array.isArray(body?.admin?.data?.palette);

    const normalized = isScopedDraftPayload
      ? normalizeThemeDocument(body as ScopedThemeDocumentData)
      : null;

    if (!normalized) {
      return errorResponse(
        {
          ok: false,
          code: 'THEME_DRAFT_INVALID_BODY',
          message: 'Invalid scoped theme draft data.',
          severity: 'error',
          retryable: false,
        },
        400
      );
    }

    const css = buildScopedDraftThemeCss(normalized as ResolvedScopedThemeDocumentData, {
      reader: readerScope,
      admin: adminScope,
    });
    return NextResponse.json(css);
  } catch (error) {
    console.error('[theme-draft-css]', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return errorResponse(
      {
        ok: false,
        code: 'THEME_DRAFT_BUILD_FAILED',
        message: 'Failed to build draft theme CSS.',
        severity: 'error',
        retryable: true,
        error: message,
      },
      500
    );
  }
}
