import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { z } from 'zod';
import { authOptions } from '@/lib/auth/authOptions';
import { isAdminSession } from '@/lib/auth/readerAccess';
import { deleteAudienceGroup, updateAudienceGroup } from '@/lib/services/audienceGroupService';

const bodySchema = z.object({
  name: z.string().trim().min(1).max(80),
  memberContactIds: z.array(z.string().min(1)).max(500).default([]),
});

function error(message: string, status: number) {
  return NextResponse.json({ ok: false, message }, { status });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!isAdminSession(session)) return error('Forbidden.', 403);
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return error('Enter a group name and valid Reader members.', 400);
  const { id } = await params;
  try {
    const input = {
      name: parsed.data.name!,
      memberContactIds: parsed.data.memberContactIds ?? [],
    };
    return NextResponse.json({ group: await updateAudienceGroup(id, input) });
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : 'Audience group could not be updated.';
    const status = message.includes('not found') ? 404 : message.includes('already exists') ? 409 : message.includes('Reader account') ? 400 : 500;
    return error(message, status);
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!isAdminSession(session)) return error('Forbidden.', 403);
  const { id } = await params;
  try {
    await deleteAudienceGroup(id);
    return new NextResponse(null, { status: 204 });
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : 'Audience group could not be deleted.';
    const status = message.includes('not found') ? 404 : message.startsWith('Remove this group') ? 409 : 500;
    return error(message, status);
  }
}
