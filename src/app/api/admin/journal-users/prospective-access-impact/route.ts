import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/authOptions';
import { isAdminSession } from '@/lib/auth/readerAccess';
import { getProspectiveReaderAccessImpact } from '@/lib/services/readerAccountImpactService';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!isAdminSession(session)) {
    return NextResponse.json({ ok: false, message: 'Forbidden.' }, { status: 403 });
  }
  try {
    return NextResponse.json({ impact: await getProspectiveReaderAccessImpact() });
  } catch (cause) {
    console.error('[/api/admin/journal-users/prospective-access-impact GET]', cause);
    return NextResponse.json(
      { ok: false, message: 'Prospective Reader access could not be calculated.' },
      { status: 500 }
    );
  }
}
