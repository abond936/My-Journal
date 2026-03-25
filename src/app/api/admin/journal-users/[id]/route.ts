import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { z } from 'zod';
import { authOptions } from '@/lib/auth/authOptions';
import { getJournalUserByDocId, updateJournalUser } from '@/lib/auth/journalUsersFirestore';

const patchBodySchema = z
  .object({
    displayName: z.string().max(128).optional(),
    disabled: z.boolean().optional(),
    password: z.string().min(8).max(128).optional(),
  })
  .refine(data => data.displayName !== undefined || data.disabled !== undefined || data.password !== undefined, {
    message: 'At least one field required',
  });

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = patchBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { message: 'Invalid body', issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const existing = await getJournalUserByDocId(id);
  if (!existing) {
    return NextResponse.json({ message: 'User not found' }, { status: 404 });
  }

  if (parsed.data.disabled === true && session.user?.id === id) {
    return NextResponse.json({ message: 'You cannot disable your own account' }, { status: 400 });
  }

  try {
    await updateJournalUser(id, {
      displayName: parsed.data.displayName,
      disabled: parsed.data.disabled,
      password: parsed.data.password,
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    const status =
      message.includes('only enabled admin') || message.includes('not found') ? 400 : 500;
    console.error('[/api/admin/journal-users PATCH]', error);
    return NextResponse.json({ message, error: message }, { status });
  }
}
