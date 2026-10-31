import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { z } from 'zod';
import { authOptions } from '@/lib/auth/authOptions';
import { isAdminSession } from '@/lib/auth/readerAccess';
import { createAudienceGroup, listAudienceGroups } from '@/lib/services/audienceGroupService';

const bodySchema = z.object({
  name: z.string().trim().min(1).max(80),
  memberContactIds: z.array(z.string().min(1)).max(500).default([]),
});

function error(message: string, status: number) {
  return NextResponse.json({ ok: false, message }, { status });
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!isAdminSession(session)) return error('Forbidden.', 403);
  try {
    return NextResponse.json({ groups: await listAudienceGroups() });
  } catch (cause) {
    console.error('[/api/admin/audience-groups GET]', cause);
    return error('Audience groups could not be loaded.', 500);
  }
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!isAdminSession(session)) return error('Forbidden.', 403);
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return error('Enter a group name and valid Reader members.', 400);
  try {
    const input = {
      name: parsed.data.name!,
      memberContactIds: parsed.data.memberContactIds ?? [],
    };
    return NextResponse.json({ group: await createAudienceGroup(input) }, { status: 201 });
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : 'Audience group could not be created.';
    const status = message.includes('already exists') ? 409 : message.includes('Reader account') ? 400 : 500;
    return error(message, status);
  }
}
