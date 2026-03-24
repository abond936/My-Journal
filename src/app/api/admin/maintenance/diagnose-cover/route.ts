import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/authOptions';
import { diagnoseCoverImage } from '@/lib/scripts/dev/diagnose-cover-image';

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const cardTitle = typeof body.cardTitle === 'string' ? body.cardTitle.trim() : undefined;

    if (!cardTitle) {
      return NextResponse.json(
        { message: 'cardTitle is required' },
        { status: 400 }
      );
    }

    const result = await diagnoseCoverImage(cardTitle);
    return NextResponse.json({ result });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'An unknown error occurred';
    console.error('[/api/admin/maintenance/diagnose-cover] Error:', error);
    return NextResponse.json(
      { message: 'Diagnose cover failed.', error: message },
      { status: 500 }
    );
  }
}
