import { NextResponse, NextRequest } from 'next/server';
import { getEntries, createEntry } from '@/lib/services/entryService';
import { GetEntriesOptions } from '@/lib/types/entry';
import { Entry } from '@/lib/types/entry';

/**
 * @swagger
 * /api/entries:
 *   get:
 *     summary: Retrieve a paginated list of entries
 *     description: Fetches entries with support for pagination, filtering by tags, and status.
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: The number of entries to return.
 *       - in: query
 *         name: lastDocId
 *         schema:
 *           type: string
 *         description: The ID of the last document from the previous page for pagination.
 *       - in: query
 *         name: tags
 *         schema:
 *           type: string
 *         description: A comma-separated list of tag IDs to filter by.
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *         description: Filter entries by status (e.g., "published", "draft").
 *     responses:
 *       200:
 *         description: A paginated list of entries.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaginatedEntries'
 *       500:
 *         description: Internal server error.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const options: GetEntriesOptions = {
      limit: searchParams.has('limit') ? parseInt(searchParams.get('limit')!, 10) : 10,
      lastDocId: searchParams.get('lastDocId') || undefined,
      tags: searchParams.has('tags') ? searchParams.get('tags')!.split(',') : undefined,
      status: searchParams.get('status') || undefined,
    };

    const result = await getEntries(options);
    return NextResponse.json(result);
  } catch (error) {
    console.error('API Error fetching entries:', error);
    return new NextResponse('Internal server error', { status: 500 });
  }
}

/**
 * @swagger
 * /api/entries:
 *   post:
 *     summary: Create a new entry
 *     description: Adds a new journal entry to the database.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/NewEntry'
 *     responses:
 *       201:
 *         description: The created entry.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Entry'
 *       400:
 *         description: Bad request, validation failed.
 *       500:
 *         description: Internal server error.
 */
export async function POST(request: Request) {
  try {
    const body: Omit<Entry, 'id'> = await request.json();

    if (!body.title || !body.content) {
      return new NextResponse('Missing required fields: title and content', { status: 400 });
    }

    const newEntry = await createEntry(body);
    return NextResponse.json(newEntry, { status: 201 });
  } catch (error) {
    console.error('API Error creating entry:', error);
    if (error instanceof SyntaxError) {
      return new NextResponse('Invalid JSON format', { status: 400 });
    }
    return new NextResponse('Internal server error', { status: 500 });
  }
} 