import { NextResponse } from 'next/server';
import { getCards, getCardsByIds } from '@/lib/services/cardService';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/authOptions';
import { Card } from '@/lib/types/card';
import { PaginatedResult } from '@/lib/types/services';
import { isTypesenseConfigured } from '@/lib/config/typesense';
import { searchCardsFiltered } from '@/lib/services/typesenseService';
import { parseListPageLimit, isInputCapFailure } from '@/lib/api/inputCaps';

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
  if (!session) {
    return errorResponse(
      {
        ok: false,
        code: 'AUTH_UNAUTHORIZED',
        message: 'Authentication required.',
        severity: 'error',
        retryable: false,
      },
      401
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q');
    
    if (!q) {
      return errorResponse(
        {
          ok: false,
          code: 'CARD_SEARCH_QUERY_REQUIRED',
          message: 'Query parameter "q" is required.',
          severity: 'error',
          retryable: false,
        },
        400
      );
    }

    const limitResult = parseListPageLimit(searchParams.get('limit'));
    if (isInputCapFailure(limitResult)) {
      return errorResponse(
        {
          ok: false,
          code: limitResult.error.code,
          message: limitResult.error.message,
          severity: 'error',
          retryable: false,
        },
        400
      );
    }
    const limit = limitResult.value;
    const lastDocId = searchParams.get('lastDocId') || undefined;
    const status = session?.user?.role === 'admin' ? 'all' : 'published';

    let result: PaginatedResult<Card>;

    if (isTypesenseConfigured()) {
      const page = searchParams.has('page') ? parseInt(searchParams.get('page')!, 10) : 0;
      const searchResult = await searchCardsFiltered({
        textQuery: q.trim(),
        status,
        page: Number.isFinite(page) && page >= 0 ? page : 0,
        perPage: limit,
        sortBy: 'title',
        sortDir: 'asc',
      });

      if (searchResult.docIds.length === 0) {
        result = { items: [], hasMore: false, lastDocId: undefined };
      } else {
        const items = await getCardsByIds(searchResult.docIds);
        result = {
          items,
          lastDocId: items.length > 0 ? items[items.length - 1].docId : undefined,
          hasMore: ((Number.isFinite(page) && page >= 0 ? page : 0) + 1) * limit < searchResult.totalFound,
        };
      }
    } else {
      // Degrade to Firestore title search rather than dynamic `filterTags.<term>` queries,
      // which would require arbitrary per-term composite indexes in hosted deployments.
      result = await getCards({
        q,
        status,
        limit,
        lastDocId,
        sortBy: 'title',
        sortDir: 'asc',
      });
    }

    return NextResponse.json(result);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    console.error('Error in GET /api/cards/search:', errorMessage);
    return errorResponse(
      {
        ok: false,
        code: 'CARD_SEARCH_FAILED',
        message: 'Internal server error.',
        severity: 'error',
        retryable: true,
        error: errorMessage,
      },
      500
    );
  }
} 
