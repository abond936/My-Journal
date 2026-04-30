import { NextResponse } from 'next/server';
import { getFirestore } from 'firebase-admin/firestore';
import { getAdminApp } from '@/lib/config/firebase/admin';
import { updateTagAndDescendantPaths } from '@/lib/firebase/tagService';
import { authOptions } from '@/lib/auth/authOptions';
import { getServerSession } from 'next-auth/next';

getAdminApp();
const db = getFirestore();

type ApiErrorPayload = {
  ok: false;
  code: string;
  message: string;
  severity: 'error' | 'warning';
  retryable: boolean;
  error?: string;
};

function errorResponse(payload: ApiErrorPayload, status: number) {
  return NextResponse.json(payload, { status });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin') {
        return errorResponse(
          {
            ok: false,
            code: 'AUTH_FORBIDDEN',
            message: 'Forbidden.',
            severity: 'error',
            retryable: false,
          },
          403
        );
    }

    const { id: tagId } = await params;
    const { newParentId } = await request.json();

    if (!tagId) {
        return errorResponse(
          {
            ok: false,
            code: 'TAG_ID_REQUIRED',
            message: 'Tag ID is required.',
            severity: 'error',
            retryable: false,
          },
          400
        );
    }

    try {
        await db.runTransaction(async (transaction) => {
            await updateTagAndDescendantPaths(tagId, newParentId, transaction);
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error(`Error reparenting tag ${tagId}:`, error);
        const message = error instanceof Error ? error.message : 'Unknown error';
        return errorResponse(
          {
            ok: false,
            code: 'TAG_REPARENT_FAILED',
            message: 'Internal server error.',
            severity: 'error',
            retryable: true,
            error: message,
          },
          500
        );
    }
} 