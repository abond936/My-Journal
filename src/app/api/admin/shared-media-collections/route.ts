import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { z } from 'zod';
import { authOptions } from '@/lib/auth/authOptions';
import { isAdminSession } from '@/lib/auth/readerAccess';
import {
  createSharedMediaCollection,
  listSharedMediaCollections,
  SharedMediaCollectionError,
} from '@/lib/services/sharedMediaCollectionService';

const createSchema = z.object({
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().max(1000).optional().nullable(),
  mediaIds: z.array(z.string().min(1)).max(250).default([]),
});

function forbidden() {
  return NextResponse.json({ ok: false, code: 'AUTH_FORBIDDEN', message: 'Forbidden.' }, { status: 403 });
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!isAdminSession(session)) return forbidden();
  const collections = await listSharedMediaCollections();
  return NextResponse.json({ ok: true, collections });
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!isAdminSession(session)) return forbidden();
  const parsed = createSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({
      ok: false, code: 'INVALID_REQUEST', message: 'Enter a title and select no more than 250 photos.',
    }, { status: 400 });
  }
  try {
    const collection = await createSharedMediaCollection({
      title: parsed.data.title!,
      description: parsed.data.description,
      mediaIds: parsed.data.mediaIds ?? [],
    });
    return NextResponse.json({ ok: true, collection }, { status: 201 });
  } catch (error) {
    if (error instanceof SharedMediaCollectionError) {
      return NextResponse.json({ ok: false, code: error.code, message: error.message }, { status: 409 });
    }
    console.error('[/api/admin/shared-media-collections POST]', error);
    return NextResponse.json({
      ok: false, code: 'CREATE_FAILED', message: 'The Shared Media Collection could not be created.',
    }, { status: 500 });
  }
}
