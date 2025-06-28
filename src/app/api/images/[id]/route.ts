import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { deleteMediaAsset, updateMediaStatus } from '@/lib/services/images/imageImportService';
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
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'admin') {
    return new NextResponse('Forbidden', { status: 403 });
  }

  const mediaId = params.id;
  if (!mediaId) {
    return NextResponse.json({ message: 'Media ID is required.' }, { status: 400 });
  }

  try {
    const body = await request.json();
    const status = body.status;

    // Validate the status against the schema's enum
    const statusValidation = mediaSchema.shape.status.safeParse(status);
    if (!statusValidation.success) {
      return NextResponse.json({ message: 'Invalid status provided.', issues: statusValidation.error.issues }, { status: 400 });
    }

    await updateMediaStatus(mediaId, status);

    return NextResponse.json({ message: `Media asset ${mediaId} status updated to ${status}.` });
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
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'admin') {
    return new NextResponse('Forbidden', { status: 403 });
  }

  const mediaId = params.id;
  if (!mediaId) {
    return NextResponse.json({ message: 'Media ID is required.' }, { status: 400 });
  }

  try {
    await deleteMediaAsset(mediaId);
    return NextResponse.json({ message: `Media asset ${mediaId} deleted successfully.` });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    console.error(`Error deleting media asset ${mediaId}:`, errorMessage);
    return NextResponse.json({ message: 'Error deleting media asset.', error: errorMessage }, { status: 500 });
  }
} 