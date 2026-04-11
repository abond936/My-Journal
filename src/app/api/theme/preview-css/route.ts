import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/authOptions';
import { buildThemeTokensCss, themeDataForCssGeneration } from '@/lib/services/themeService';
import { scopeThemeTokensCss } from '@/lib/theme/scopeThemeTokensCss';

const READER_PREVIEW_SCOPE = '.themeAdminReaderPreview';

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session || (session.user as { role?: string }).role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const body = await request.json();
    if (!body?.palette || !Array.isArray(body.palette)) {
      return NextResponse.json({ error: 'Invalid theme data' }, { status: 400 });
    }

    const cleaned = themeDataForCssGeneration(body);
    const raw = buildThemeTokensCss(cleaned);
    const css = scopeThemeTokensCss(raw, READER_PREVIEW_SCOPE);
    return NextResponse.json({ css });
  } catch (error) {
    console.error('[preview-css]', error);
    return NextResponse.json({ error: 'Failed to build preview CSS' }, { status: 500 });
  }
}
