import { NextResponse, NextRequest } from 'next/server';
import { getEntry, updateEntry, deleteEntry } from '@/lib/services/entryService';
import { Entry } from '@/lib/types/entry';

interface RouteParams {
  id: string;
}

/**
 * @swagger
 * /api/entries/{id}:
 *   get:
 *     summary: Retrieve a single entry by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: The requested entry.
 *         content: { application/json: { schema: { $ref: '#/components/schemas/Entry' } } }
 *       404:
 *         description: Entry not found.
 */
export async function GET(request: NextRequest, { params }: { params: RouteParams }) {
  try {
    const { id } = params;
    const entry = await getEntry(id);

    if (!entry) {
      return new NextResponse('Entry not found', { status: 404 });
    }

    return NextResponse.json(entry);
  } catch (error) {
    console.error(`API Error fetching entry ${params.id}:`, error);
    return new NextResponse('Internal server error', { status: 500 });
  }
}

/**
 * @swagger
 * /api/entries/{id}:
 *   put:
 *     summary: Update an existing entry
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateEntry'
 *     responses:
 *       200:
 *         description: The updated entry.
 *         content: { application/json: { schema: { $ref: '#/components/schemas/Entry' } } }
 *       400:
 *         description: Bad request.
 *       404:
 *         description: Entry not found.
 */
export async function PUT(request: NextRequest, { params }: { params: RouteParams }) {
  try {
    const { id } = params;
    const body: Partial<Omit<Entry, 'id'>> = await request.json();

    if (Object.keys(body).length === 0) {
      return new NextResponse('Request body cannot be empty', { status: 400 });
    }

    const updatedEntry = await updateEntry(id, body);
    return NextResponse.json(updatedEntry);
  } catch (error) {
    console.error(`API Error updating entry ${params.id}:`, error);
    if ((error as Error).message.includes('not found')) {
      return new NextResponse('Entry not found', { status: 404 });
    }
    return new NextResponse('Internal server error', { status: 500 });
  }
}

/**
 * @swagger
 * /api/entries/{id}:
 *   delete:
 *     summary: Delete an entry
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       204:
 *         description: Entry deleted successfully.
 *       404:
 *         description: Entry not found.
 */
export async function DELETE(request: NextRequest, { params }: { params: RouteParams }) {
  try {
    const { id } = params;
    await deleteEntry(id);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error(`API Error deleting entry ${params.id}:`, error);
    return new NextResponse('Internal server error', { status: 500 });
  }
} 