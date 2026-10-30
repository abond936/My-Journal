import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/authOptions';
import { isAdminSession } from '@/lib/auth/readerAccess';
import { listActiveCollections } from '@/lib/services/collections/collectionProjectionReadService';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!isAdminSession(session)) {
    return NextResponse.json({ ok: false, code: 'AUTH_FORBIDDEN', message: 'Forbidden.' }, { status: 403 });
  }
  try {
    const collections = await listActiveCollections();
    return NextResponse.json({ ok: true, collections });
  } catch (error) {
    console.error('[/api/admin/collections GET]', error);
    return NextResponse.json({
      ok: false,
      code: 'COLLECTIONS_READ_FAILED',
      message: 'Active Collections could not be loaded.',
    }, { status: 500 });
  }
}
