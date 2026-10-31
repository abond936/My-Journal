import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/authOptions';
import { isAdminSession } from '@/lib/auth/readerAccess';
import { audienceSelectionSchema } from '@/lib/types/audience';
import { getCollectionAudienceImpact } from '@/lib/services/audienceImpactService';

function error(message: string, status: number) {
  return NextResponse.json({ ok: false, message }, { status });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!isAdminSession(session)) return error('Forbidden.', 403);
  const parsed = audienceSelectionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return error('Choose a valid Collection audience.', 400);
  const { id } = await params;
  try {
    const impact = await getCollectionAudienceImpact(id, parsed.data);
    if (!impact) return error('Collection not found.', 404);
    return NextResponse.json({ impact });
  } catch (cause) {
    console.error('[/api/admin/collections/[id]/audience-impact POST]', cause);
    return error('Collection audience impact could not be calculated.', 500);
  }
}
