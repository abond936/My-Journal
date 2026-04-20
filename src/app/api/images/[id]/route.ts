import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/authOptions';
import { patchMediaDocument } from '@/lib/services/images/imageImportService';
import { deleteMediaWithCardCleanup, recomputeCardsMediaSignalsForMedia } from '@/lib/services/cardService';

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

/**
 * @swagger
 * /api/images/{id}:
 *   patch:
 *     summary: Update media metadata (admin)
 *     description: Partial update for caption, objectPosition, and/or tags.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the media asset.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               caption:
 *                 type: string
 *               objectPosition:
 *                 type: string
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Media updated successfully.
 *       400:
 *         description: Invalid input or media ID missing.
 *       403:
 *         description: Forbidden.
 *       404:
 *         description: Media asset not found.
 *       500:
 *         description: Internal server error.
 */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

  const { id: mediaId } = await params;
  if (!mediaId) {
    return errorResponse(
      {
        ok: false,
        code: 'MEDIA_ID_REQUIRED',
        message: 'Media ID is required.',
        severity: 'error',
        retryable: false,
      },
      400
    );
  }

  try {
    const body = await request.json() as Record<string, unknown>;

    const hasCaption = 'caption' in body;
    const hasObjectPosition = 'objectPosition' in body && body.objectPosition !== undefined;
    const hasTags = 'tags' in body && body.tags !== undefined;

    if (!hasCaption && !hasObjectPosition && !hasTags) {
      return errorResponse(
        {
          ok: false,
          code: 'MEDIA_PATCH_FIELDS_REQUIRED',
          message: 'Provide at least one of: caption, objectPosition, tags.',
          severity: 'error',
          retryable: false,
        },
        400
      );
    }

    const patch: {
      caption?: string;
      objectPosition?: string;
      tags?: string[];
    } = {};

    if (hasCaption) {
      patch.caption = typeof body.caption === 'string' ? body.caption : '';
    }

    if (hasObjectPosition) {
      if (typeof body.objectPosition !== 'string' || !body.objectPosition.trim()) {
        return errorResponse(
          {
            ok: false,
            code: 'MEDIA_OBJECT_POSITION_INVALID',
            message: 'objectPosition must be a non-empty string.',
            severity: 'error',
            retryable: false,
          },
          400
        );
      }
      patch.objectPosition = body.objectPosition.trim();
    }

    if (hasTags) {
      if (!Array.isArray(body.tags)) {
        return errorResponse(
          {
            ok: false,
            code: 'MEDIA_TAGS_INVALID',
            message: 'tags must be an array of strings.',
            severity: 'error',
            retryable: false,
          },
          400
        );
      }
      patch.tags = body.tags.filter((id): id is string => typeof id === 'string');
    }

    await patchMediaDocument(mediaId, patch);
    if (hasTags) {
      await recomputeCardsMediaSignalsForMedia(mediaId);
    }

    return NextResponse.json({ ok: true, message: `Media asset ${mediaId} updated.` });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    console.error(`Error updating media ${mediaId}:`, errorMessage);
    return errorResponse(
      {
        ok: false,
        code: 'MEDIA_PATCH_FAILED',
        message: 'Error updating media.',
        severity: 'error',
        retryable: true,
        error: errorMessage,
      },
      500
    );
  }
}

/**
 * @swagger
 * /api/images/{id}:
 *   delete:
 *     summary: Delete a media asset
 *     description: Deletes a media asset from both Firestore and Firebase Storage.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the media asset to delete.
 *     responses:
 *       200:
 *         description: Media asset deleted successfully.
 *       403:
 *         description: Forbidden.
 *       404:
 *         description: Media asset not found.
 *       500:
 *         description: Internal server error.
 */
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

  const { id: mediaId } = await params;
  if (!mediaId) {
    return errorResponse(
      {
        ok: false,
        code: 'MEDIA_ID_REQUIRED',
        message: 'Media ID is required.',
        severity: 'error',
        retryable: false,
      },
      400
    );
  }

  try {
    await deleteMediaWithCardCleanup(mediaId);
    return NextResponse.json({ ok: true, message: `Media asset ${mediaId} deleted successfully.` });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    console.error(`Error deleting media asset ${mediaId}:`, errorMessage);
    if (typeof errorMessage === 'string' && errorMessage.includes('unresolved card references remain')) {
      return errorResponse(
        {
          ok: false,
          message: 'Cannot delete media asset because references still exist.',
          code: 'MEDIA_DELETE_BLOCKED_REFERENCES',
          severity: 'warning',
          retryable: false,
          error: errorMessage,
        },
        409
      );
    }
    return errorResponse(
      {
        ok: false,
        code: 'MEDIA_DELETE_FAILED',
        message: 'Error deleting media asset.',
        severity: 'error',
        retryable: true,
        error: errorMessage,
      },
      500
    );
  }
}