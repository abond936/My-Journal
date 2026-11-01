import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { z } from 'zod';
import { authOptions } from '@/lib/auth/authOptions';
import { isAdminSession } from '@/lib/auth/readerAccess';
import { audienceSelectionSchema } from '@/lib/types/audience';
import {
  getSharedMediaCollection,
  SharedMediaCollectionError,
  updateSharedMediaCollection,
} from '@/lib/services/sharedMediaCollectionService';
import { protectMediaListForAuthenticatedSession } from '@/lib/utils/readerMediaDelivery';

const patchSchema = z.object({
  expectedRevision: z.number().int().nonnegative(),
  title: z.string().trim().min(1).max(120).optional(),
  description: z.string().trim().max(1000).optional().nullable(),
  mediaIds: z.array(z.string().min(1)).max(250).optional(),
  audience: audienceSelectionSchema.optional(),
  lifecycle: z.enum(['draft', 'published']).optional(),
}).refine((value) => Object.keys(value).some((key) => key !== 'expectedRevision'), {
  message: 'At least one change is required.',
});

function forbidden() {
  return NextResponse.json({ ok: false, code: 'AUTH_FORBIDDEN', message: 'Forbidden.' }, { status: 403 });
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!isAdminSession(session)) return forbidden();
  const { id } = await params;
  const result = await getSharedMediaCollection({ id });
  if (!result) {
    return NextResponse.json({ ok: false, code: 'NOT_FOUND', message: 'Shared Media Collection not found.' }, { status: 404 });
  }
  return NextResponse.json({
    ok: true,
    collection: result.collection,
    media: protectMediaListForAuthenticatedSession(result.media),
  });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!isAdminSession(session)) return forbidden();
  const { id } = await params;
  const parsed = patchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, code: 'INVALID_REQUEST', message: 'The requested change is invalid.' }, { status: 400 });
  }
  try {
    const collection = await updateSharedMediaCollection({
      id,
      expectedRevision: parsed.data.expectedRevision!,
      title: parsed.data.title,
      description: parsed.data.description,
      mediaIds: parsed.data.mediaIds,
      audience: parsed.data.audience,
      lifecycle: parsed.data.lifecycle,
    });
    return NextResponse.json({ ok: true, collection });
  } catch (error) {
    if (error instanceof SharedMediaCollectionError) {
      const status = error.code === 'NOT_FOUND' ? 404 : 409;
      return NextResponse.json({
        ok: false, code: error.code, message: error.message, details: error.details,
      }, { status });
    }
    console.error('[/api/admin/shared-media-collections/[id] PATCH]', error);
    return NextResponse.json({
      ok: false, code: 'UPDATE_FAILED', message: 'The Shared Media Collection could not be updated.',
    }, { status: 500 });
  }
}
