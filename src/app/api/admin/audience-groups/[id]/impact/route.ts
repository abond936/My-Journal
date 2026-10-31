import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { z } from 'zod';
import { authOptions } from '@/lib/auth/authOptions';
import { isAdminSession } from '@/lib/auth/readerAccess';
import { getAudienceGroupMembershipImpact } from '@/lib/services/audienceGroupImpactService';

const bodySchema = z.object({
  memberContactIds: z.array(z.string().min(1)).max(500).default([]),
});

function error(message: string, status: number) {
  return NextResponse.json({ ok: false, message }, { status });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!isAdminSession(session)) return error('Forbidden.', 403);
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return error('Choose valid Reader members.', 400);
  const { id } = await params;
  try {
    const impact = await getAudienceGroupMembershipImpact({
      groupId: id,
      proposedMemberContactIds: parsed.data.memberContactIds,
    });
    if (!impact) return error('Audience group not found.', 404);
    return NextResponse.json({ impact });
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : 'Audience-group impact could not be calculated.';
    return error(message, message.includes('Reader account') ? 400 : 500);
  }
}
