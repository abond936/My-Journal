import { NextResponse } from 'next/server';
import { searchCards } from '@/lib/services/cardService';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]/route';
import { Card } from '@/lib/types/card';
import { PaginatedResult } from '@/lib/types/services';

export const dynamic = 'force-dynamic';

/**
 * @swagger
 * /api/cards/search:
 *   get:
 *     summary: Search for cards
 *     description: Searches cards by a query term with support for pagination.
 *     parameters:
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *         description: The search term to filter cards by title, excerpt, or content.
 *         required: true
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
 *     responses:
 *       200:
 *         description: A paginated list of matching cards.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaginatedCards'
 *       400:
 *         description: Bad request, missing query term.
 *       403:
 *         description: Forbidden.
 *       500:
 *         description: Internal server error.
 */
export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  // Search should be available to all users, not just admins
  // if (!session) {
  //   return new NextResponse(JSON.stringify({ error: 'Forbidden' }), {
  //     status: 403,
  //     headers: { 'Content-Type': 'application/json' },
  //   });
  // }

  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q');
    
    if (!q) {
      return NextResponse.json({ error: 'Query parameter "q" is required.' }, { status: 400 });
    }

    const limit = searchParams.has('limit') ? parseInt(searchParams.get('limit')!, 10) : 10;
    const lastDocId = searchParams.get('lastDocId') || undefined;
    const status = session?.user?.role === 'admin' ? 'all' : 'published';

    const result: PaginatedResult<Card> = await searchCards({
      q,
      status,
      limit,
      lastDocId,
    });

    return NextResponse.json(result);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    console.error('Error in GET /api/cards/search:', errorMessage);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
} 