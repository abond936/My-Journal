import { NextResponse } from 'next/server';
import { createCard, getCards } from '@/lib/services/cardService';
import { Card } from '@/lib/types/card';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]/route';

export const dynamic = 'force-dynamic';

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
 *       401:
 *         description: Unauthorized.
 *       500:
 *         description: Internal server error.
 */
export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'admin') {
    return new NextResponse(JSON.stringify({ error: 'Forbidden' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';
    const status = (searchParams.get('status') as Card['status']) || 'all';
    const type = (searchParams.get('type') as Card['type']) || 'all';
    const childrenIds_contains = searchParams.get('childrenIds_contains') || undefined;
    const limit = searchParams.has('limit') ? parseInt(searchParams.get('limit')!, 10) : 10;

    // We are calling the SERVER-SIDE getCards function here.
    const { items } = await getCards({
      q: query,
      status,
      type,
      childrenIds_contains,
      limit,
    });

    return NextResponse.json(items);
  } catch (error) {
    console.error('API Error fetching cards:', error);
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
 *       403:
 *         description: Forbidden.
 *       500:
 *         description: Internal server error.
 */
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'admin') {
    return new NextResponse(JSON.stringify({ error: 'Forbidden' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const cardData: Partial<Card> = await request.json();

    // Basic validation
    if (!cardData.title || !cardData.type) {
      return new NextResponse(
        JSON.stringify({ error: 'Missing required fields: title and type.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // The createCard service function will handle defaults and timestamps
    const newCard = await createCard(cardData as Omit<Card, 'id' | 'createdAt' | 'updatedAt' | 'inheritedTags' | 'tagPaths'>);

    return NextResponse.json(newCard, { status: 201 });
  } catch (error) {
    console.error('API Error creating card:', error);
    if (error instanceof SyntaxError) {
      return new NextResponse(JSON.stringify({ error: 'Invalid JSON format' }), { status: 400 });
    }
    return new NextResponse(JSON.stringify({ error: 'Internal server error' }), { status: 500 });
  }
} 