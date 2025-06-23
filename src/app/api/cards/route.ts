import { NextResponse } from 'next/server';
import { createCard, getCards } from '@/lib/services/cardService';
import { Card } from '@/lib/types/card';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]/route';
import { PaginatedResult } from '@/lib/types/services';
import { cardSchema } from '@/lib/types/card';

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

    console.log(`[API_DEBUG] Request URL: ${request.url}`);
    const tags = searchParams.get('tags')?.split(',');
    console.log(`[API_DEBUG] Parsed tags:`, tags);

    let status = searchParams.get('status') as Card['status'] | 'all' | null;
    if (!status) {
      status = isAdmin ? 'all' : 'published';
    }
    
    // Security check: Only admins can request 'draft' or 'all' cards
    if ((status === 'draft' || status === 'all') && !isAdmin) {
      return new NextResponse(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

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

      return NextResponse.json(result);
    } catch (error) {
      console.error('Error in GET /api/cards:', error);
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
    const { title, type, status, displayMode } = cardData;

    const validationErrors: string[] = [];

    // 1. Validate Title
    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      validationErrors.push('A non-empty title is required.');
    }

    // 2. Validate Type
    if (!type || !cardSchema.shape.type.options.includes(type)) {
      validationErrors.push(`Type must be one of: ${cardSchema.shape.type.options.join(', ')}.`);
    }

    // 3. Validate Status
    if (!status || !cardSchema.shape.status.options.includes(status)) {
        validationErrors.push(`Status must be one of: ${cardSchema.shape.status.options.join(', ')}.`);
    }

    // 4. Validate DisplayMode
    if (!displayMode || !cardSchema.shape.displayMode.options.includes(displayMode)) {
        validationErrors.push(`Display Mode must be one of: ${cardSchema.shape.displayMode.options.join(', ')}.`);
    }

    if (validationErrors.length > 0) {
        return new NextResponse(JSON.stringify({ errors: validationErrors }), { 
            status: 400,
            headers: { 'Content-Type': 'application/json' }
        });
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