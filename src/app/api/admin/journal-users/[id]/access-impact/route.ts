import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { z } from 'zod';
import { authOptions } from '@/lib/auth/authOptions';
import { isAdminSession } from '@/lib/auth/readerAccess';
import { getReaderAccountAccessImpact } from '@/lib/services/readerAccountImpactService';

const bodySchema = z.object({ disabled: z.boolean() });

function error(message: string, status: number) {
  return NextResponse.json({ ok: false, message }, { status });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!isAdminSession(session)) return error('Forbidden.', 403);
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return error('Choose an enabled or disabled account state.', 400);
  const { id } = await params;
  try {
    const impact = await getReaderAccountAccessImpact({
      contactId: id,
      proposedDisabled: parsed.data.disabled,
    });
    if (!impact) return error('User not found.', 404);
    return NextResponse.json({ impact });
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : 'Reader access impact could not be calculated.';
    return error(message, message.includes('Reader accounts') ? 400 : 500);
  }
}
