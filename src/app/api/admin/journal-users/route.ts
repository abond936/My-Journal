import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { z } from 'zod';
import { authOptions } from '@/lib/auth/authOptions';
import { createJournalViewer, listJournalUsers } from '@/lib/auth/journalUsersFirestore';

const postBodySchema = z.object({
  username: z.string().min(1).max(64),
  password: z.string().min(8).max(128),
  displayName: z.string().max(128).optional(),
});

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
  }

  try {
    const users = await listJournalUsers();
    return NextResponse.json({ users });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[/api/admin/journal-users GET]', error);
    return NextResponse.json({ message: 'Failed to list users', error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = postBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { message: 'Invalid body', issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  try {
    const { username, password, displayName } = parsed.data;
    const docId = await createJournalViewer({ username, password, displayName });
    return NextResponse.json({ docId }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    const status = message.includes('already exists') ? 409 : 500;
    console.error('[/api/admin/journal-users POST]', error);
    return NextResponse.json({ message, error: message }, { status });
  }
}
