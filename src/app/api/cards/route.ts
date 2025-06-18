import { NextResponse } from 'next/server';
import { createCard, getCards } from '@/lib/services/cardService';
import { Card } from '@/lib/types/card';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]/route';
import { PaginatedResult } from '@/lib/types/services';

export const dynamic = 'force-dynamic';

/**
 * @swagger
 * /api/cards:
 *   get:
 *     summary: Retrieve a paginated list of cards
 *     description: Fetches cards with support for pagination, and filtering by tags, type, and status.
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: The number of cards to return.
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
 *           enum: [published, draft, all]
 *         description: Filter cards by status.
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [story, qa, quote, callout, gallery, all]
 *         description: Filter cards by type.
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *         description: A search term to filter cards by title.
 *     responses:
 *       200:
 *         description: A paginated list of cards.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaginatedCards'
 *       403:
 *         description: Forbidden.
 *       500:
 *         description: Internal server error.
 */
export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  const isAdmin = session?.user?.role === 'admin';

  try {
    const { searchParams } = new URL(request.url);

    const status = (searchParams.get('status') as Card['status'] | 'all') || 'published';
    
    // Security check: Only admins can request 'draft' or 'all' cards
    if ((status === 'draft' || status === 'all') && !isAdmin) {
      return new NextResponse(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const tags = searchParams.get('tags')?.split(',');
    const type = (searchParams.get('type') as Card['type'] | 'all') || 'all';
    const q = searchParams.get('q') || undefined;
    const limit = searchParams.has('limit') ? parseInt(searchParams.get('limit')!, 10) : 10;
    const lastDocId = searchParams.get('lastDocId') || undefined;

    try {
      const result: PaginatedResult<Card> = await getCards({
        q,
        status,
        type,
        tags,
        limit,
        lastDocId,
      });

      // DIAGNOSTIC LOG
      console.log('[API /api/cards] Result from getCards:', JSON.stringify(result, null, 2));

      return NextResponse.json(result);
    } catch (error) {
      console.error('!!!!!!!!!! DETAILED ERROR IN /api/cards !!!!!!!!!!');
      console.dir(error, { depth: null }); // Print the full error object
      console.error('!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!');
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      return NextResponse.json({ error: 'Internal Server Error', detailedError: errorMessage }, { status: 500 });
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    console.error('Error in GET /api/cards:', errorMessage);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
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
    console.error('Error creating card:', error);
    if (error instanceof SyntaxError) {
      return new NextResponse(JSON.stringify({ error: 'Invalid JSON format' }), { status: 400 });
    }
    return new NextResponse('Internal server error', { status: 500 });
  }
} 