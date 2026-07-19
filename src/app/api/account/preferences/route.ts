import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireApiSession } from '@/lib/api/routeEnvelope';
import {
  getJournalUserByDocId,
  updateJournalUserThemeMode,
} from '@/lib/auth/journalUsersFirestore';

const preferenceSchema = z.object({ readerThemeMode: z.enum(['light', 'dark']) });

export async function GET() {
  const auth = await requireApiSession('authenticated');
  if ('error' in auth) return auth.error;
  const id = auth.session.user.id;
  if (!id) return NextResponse.json({ ok: false, message: 'Account identity is unavailable.' }, { status: 401 });

  const user = await getJournalUserByDocId(id);
  if (!user || user.disabled) {
    return NextResponse.json({ ok: false, message: 'Account access is unavailable.' }, { status: 401 });
  }
  return NextResponse.json({ ok: true, readerThemeMode: user.readerThemeMode ?? null });
}

export async function PATCH(request: NextRequest) {
  const auth = await requireApiSession('authenticated');
  if ('error' in auth) return auth.error;
  const id = auth.session.user.id;
  if (!id) return NextResponse.json({ ok: false, message: 'Account identity is unavailable.' }, { status: 401 });

  const parsed = preferenceSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, message: 'Choose Light or Dark.' }, { status: 400 });
  }

  try {
    const user = await updateJournalUserThemeMode(id, parsed.data.readerThemeMode);
    return NextResponse.json({ ok: true, readerThemeMode: user.readerThemeMode });
  } catch (error) {
    console.error('[/api/account/preferences PATCH]', error);
    return NextResponse.json(
      { ok: false, message: 'Appearance preference could not be saved. Try again.' },
      { status: 500 }
    );
  }
}
