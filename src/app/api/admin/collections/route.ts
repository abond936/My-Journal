import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/authOptions';
import { isAdminSession } from '@/lib/auth/readerAccess';
import { listActiveCollections } from '@/lib/services/collections/collectionProjectionReadService';
import {
  CollectionTitleConflictError,
  createActiveCollection,
} from '@/lib/services/collections/collectionCreationService';
import { z } from 'zod';

const createCollectionInputSchema = z.object({
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().max(1000).optional().nullable(),
});

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!isAdminSession(session)) {
    return NextResponse.json({ ok: false, code: 'AUTH_FORBIDDEN', message: 'Forbidden.' }, { status: 403 });
  }
  try {
    const collections = await listActiveCollections();
    return NextResponse.json({ ok: true, collections });
  } catch (error) {
    console.error('[/api/admin/collections GET]', error);
    return NextResponse.json({
      ok: false,
      code: 'COLLECTIONS_READ_FAILED',
      message: 'Active Collections could not be loaded.',
    }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!isAdminSession(session)) {
    return NextResponse.json({ ok: false, code: 'AUTH_FORBIDDEN', message: 'Forbidden.' }, { status: 403 });
  }
  try {
    const parsed = createCollectionInputSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({
        ok: false,
        code: 'COLLECTION_CREATE_VALIDATION_FAILED',
        message: 'Enter a Collection title of 120 characters or fewer.',
      }, { status: 400 });
    }
    const collection = await createActiveCollection({
      title: parsed.data.title!,
      description: parsed.data.description,
    });
    return NextResponse.json({ ok: true, collection }, { status: 201 });
  } catch (error) {
    if (error instanceof CollectionTitleConflictError) {
      return NextResponse.json({
        ok: false,
        code: 'COLLECTION_TITLE_CONFLICT',
        message: error.message,
      }, { status: 409 });
    }
    console.error('[/api/admin/collections POST]', error);
    return NextResponse.json({
      ok: false,
      code: 'COLLECTION_CREATE_FAILED',
      message: 'The Collection could not be created. Try again.',
    }, { status: 500 });
  }
}
