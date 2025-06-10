import { NextResponse } from 'next/server';
import { getTagById, updateTag, deleteTag } from '@/lib/services/tagService';
import { Tag } from '@/lib/types/tag';

interface Params {
  id: string;
}

/**
 * @swagger
 * /api/tags/{id}:
 *   get:
 *     summary: Retrieve a single tag by ID
 *     description: Fetches detailed information for a specific tag.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the tag to retrieve.
 *     responses:
 *       200:
 *         description: The requested tag.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Tag'
 *       404:
 *         description: Tag not found.
 *       500:
 *         description: Internal server error.
 */
export async function GET(request: Request, { params }: { params: Params }) {
  try {
    const { id } = params;
    const tag = await getTagById(id);

    if (!tag) {
      return new NextResponse('Tag not found', { status: 404 });
    }

    return NextResponse.json(tag);
  } catch (error) {
    console.error(`API Error fetching tag with ID ${params.id}:`, error);
    return new NextResponse('Internal server error', { status: 500 });
  }
}

/**
 * @swagger
 * /api/tags/{id}:
 *   put:
 *     summary: Update a tag
 *     description: Modifies the details of an existing tag.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the tag to update.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateTag'
 *     responses:
 *       200:
 *         description: The updated tag.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Tag'
 *       400:
 *         description: Bad request, validation failed.
 *       404:
 *         description: Tag not found.
 *       500:
 *         description: Internal server error.
 */
export async function PUT(request: Request, { params }: { params: Params }) {
  try {
    const { id } = params;
    const body: Partial<Omit<Tag, 'id'>> = await request.json();

    // Basic validation
    if (Object.keys(body).length === 0) {
      return new NextResponse('Request body cannot be empty', { status: 400 });
    }

    const updatedTag = await updateTag(id, body);
    return NextResponse.json(updatedTag);
  } catch (error) {
    console.error(`API Error updating tag with ID ${params.id}:`, error);
    if (error instanceof SyntaxError) {
      return new NextResponse('Invalid JSON format', { status: 400 });
    }
    // Differentiate between "not found" and other errors if possible
    if ((error as Error).message.includes('not found')) {
        return new NextResponse('Tag not found', { status: 404 });
    }
    return new NextResponse('Internal server error', { status: 500 });
  }
}

/**
 * @swagger
 * /api/tags/{id}:
 *   delete:
 *     summary: Delete a tag
 *     description: Removes a tag and all its direct children from the database.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the tag to delete.
 *     responses:
 *       204:
 *         description: Tag deleted successfully.
 *       404:
 *         description: Tag not found.
 *       500:
 *         description: Internal server error.
 */
export async function DELETE(request: Request, { params }: { params: Params }) {
  try {
    const { id } = params;
    await deleteTag(id);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error(`API Error deleting tag with ID ${params.id}:`, error);
    if ((error as Error).message.includes('not found')) {
        return new NextResponse('Tag not found', { status: 404 });
    }
    return new NextResponse('Internal server error', { status: 500 });
  }
} 