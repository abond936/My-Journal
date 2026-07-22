import { NextResponse } from 'next/server';
import { getAdminApp } from '@/lib/config/firebase/admin';
import { mutateTagHierarchy } from '@/lib/services/tagHierarchyMutationService';
import { authOptions } from '@/lib/auth/authOptions';
import { isAdminSession } from '@/lib/auth/readerAccess';
import { getServerSession } from 'next-auth/next';

getAdminApp();

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
  if (!isAdminSession(session)) {
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
        const result = await mutateTagHierarchy({
            kind: 'reparent',
            tagId,
            newParentId: typeof newParentId === 'string' && newParentId.trim() ? newParentId : undefined,
        });

        return NextResponse.json({ success: true, result });
    } catch (error) {
        console.error(`Error reparenting tag ${tagId}:`, error);
        const message = error instanceof Error ? error.message : 'Unknown error';
        const isConflict = /cycle/i.test(message);
        const isInvalid = /not found|different dimension|required/i.test(message);
        return errorResponse(
          {
            ok: false,
            code: isConflict ? 'TAG_REPARENT_CYCLE' : isInvalid ? 'TAG_REPARENT_INVALID' : 'TAG_REPARENT_FAILED',
            message: isConflict || isInvalid ? message : 'Internal server error.',
            severity: 'error',
            retryable: !isConflict && !isInvalid,
            error: message,
          },
          isConflict ? 409 : isInvalid ? 400 : 500
        );
    }
}
