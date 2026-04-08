import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/authOptions';
import { patchMediaDocument } from '@/lib/services/images/imageImportService';
import { deleteMediaWithCardCleanup } from '@/lib/services/cardService';
import { mediaSchema } from '@/lib/types/photo';

/**
 * @swagger
 * /api/images/{id}:
 *   patch:
 *     summary: Update the status of a media asset
 *     description: Updates the status of a specific media asset (e.g., from 'temporary' to 'active').
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
 *               status:
 *                 type: string
 *                 enum: [temporary, active]
 *     responses:
 *       200:
 *         description: Status updated successfully.
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
    return new NextResponse('Forbidden', { status: 403 });
  }

  const { id: mediaId } = await params;
  if (!mediaId) {
    return NextResponse.json({ message: 'Media ID is required.' }, { status: 400 });
  }

  try {
    const body = await request.json() as Record<string, unknown>;

    const hasStatus = 'status' in body && body.status !== undefined;
    const hasCaption = 'caption' in body;
    const hasObjectPosition = 'objectPosition' in body && body.objectPosition !== undefined;
    const hasTags = 'tags' in body && body.tags !== undefined;

    if (!hasStatus && !hasCaption && !hasObjectPosition && !hasTags) {
      return NextResponse.json(
        { message: 'Provide at least one of: status, caption, objectPosition, tags.' },
        { status: 400 }
      );
    }

    const patch: {
      status?: 'temporary' | 'active';
      caption?: string;
      objectPosition?: string;
      tags?: string[];
    } = {};

    if (hasStatus) {
      const statusValidation = mediaSchema.shape.status.safeParse(body.status);
      if (!statusValidation.success) {
        return NextResponse.json(
          { message: 'Invalid status provided.', issues: statusValidation.error.issues },
          { status: 400 }
        );
      }
      patch.status = statusValidation.data;
    }

    if (hasCaption) {
      patch.caption = typeof body.caption === 'string' ? body.caption : '';
    }

    if (hasObjectPosition) {
      if (typeof body.objectPosition !== 'string' || !body.objectPosition.trim()) {
        return NextResponse.json({ message: 'objectPosition must be a non-empty string.' }, { status: 400 });
      }
      patch.objectPosition = body.objectPosition.trim();
    }

    if (hasTags) {
      if (!Array.isArray(body.tags)) {
        return NextResponse.json({ message: 'tags must be an array of strings.' }, { status: 400 });
      }
      patch.tags = body.tags.filter((id): id is string => typeof id === 'string');
    }

    await patchMediaDocument(mediaId, patch);

    return NextResponse.json({ message: `Media asset ${mediaId} updated.` });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    console.error(`Error updating media status for ${mediaId}:`, errorMessage);
    return NextResponse.json({ message: 'Error updating media status.', error: errorMessage }, { status: 500 });
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
    return new NextResponse('Forbidden', { status: 403 });
  }

  const { id: mediaId } = await params;
  if (!mediaId) {
    return NextResponse.json({ message: 'Media ID is required.' }, { status: 400 });
  }

  try {
    await deleteMediaWithCardCleanup(mediaId);
    return NextResponse.json({ message: `Media asset ${mediaId} deleted successfully.` });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    console.error(`Error deleting media asset ${mediaId}:`, errorMessage);
    return NextResponse.json({ message: 'Error deleting media asset.', error: errorMessage }, { status: 500 });
  }
} 