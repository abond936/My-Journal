import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/authOptions';
import { cleanupMediaCollection } from '@/lib/scripts/firebase/cleanup-media-collection';

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const dryRun = body.dryRun === true;

    const report = await cleanupMediaCollection(dryRun);
    return NextResponse.json({ report });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'An unknown error occurred';
    console.error('[/api/admin/maintenance/cleanup] Error:', error);
    return NextResponse.json(
      { message: 'Cleanup failed.', error: message },
      { status: 500 }
    );
  }
}
