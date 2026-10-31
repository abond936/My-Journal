import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/authOptions';
import { isAdminSession } from '@/lib/auth/readerAccess';
import { getAdminApp } from '@/lib/config/firebase/admin';
import { audienceSelectionSchema } from '@/lib/types/audience';
import { validateAudienceSelectionReferences } from '@/lib/services/audienceGroupService';

function error(message: string, status: number) {
  return NextResponse.json({ ok: false, message }, { status });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!isAdminSession(session)) return error('Forbidden.', 403);
  const parsed = audienceSelectionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return error('Choose a valid Collection audience.', 400);
  const { id } = await params;
  const firestore = getAdminApp().firestore();
  const ref = firestore.collection('collections').doc(id);
  const snapshot = await ref.get();
  if (!snapshot.exists) return error('Collection not found.', 404);
  try {
    await validateAudienceSelectionReferences(parsed.data, firestore);
    await ref.update({ audience: parsed.data, updatedAt: Date.now() });
    return NextResponse.json({ audience: parsed.data });
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : 'Collection audience could not be saved.';
    return error(message, message.includes('must') ? 400 : 500);
  }
}
