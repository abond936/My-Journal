import { NextResponse } from 'next/server';
import {
  createCard,
  getCards,
  getCardsByIds,
  getCardsByCollectionId,
  getCollectionCards,
  getParentCardsByChildId,
} from '@/lib/services/cardService';
import { Card } from '@/lib/types/card';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/authOptions';
import { PaginatedResult } from '@/lib/types/services';
import { cardSchema } from '@/lib/types/card';
import { isTypesenseConfigured } from '@/lib/config/typesense';
import { searchCards } from '@/lib/services/typesenseService';

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

    const tags = searchParams.get('tags')?.split(',');

    // Parse dimensional tags from query parameters
    const dimensionalTags: {
      who?: string[];
      what?: string[];
      when?: string[];
      where?: string[];
    } = {};
    
    const whoTags = searchParams.get('who')?.split(',').filter(tag => tag.trim());
    const whatTags = searchParams.get('what')?.split(',').filter(tag => tag.trim());
    const whenTags = searchParams.get('when')?.split(',').filter(tag => tag.trim());
    const whereTags = searchParams.get('where')?.split(',').filter(tag => tag.trim());
    
    if (whoTags && whoTags.length > 0) dimensionalTags.who = whoTags;
    if (whatTags && whatTags.length > 0) dimensionalTags.what = whatTags;
    if (whenTags && whenTags.length > 0) dimensionalTags.when = whenTags;
    if (whereTags && whereTags.length > 0) dimensionalTags.where = whereTags;

    const mediaDimensionalTags: {
      who?: string[];
      what?: string[];
      when?: string[];
      where?: string[];
    } = {};
    const mediaWhoTags = searchParams.get('mediaWho')?.split(',').filter(tag => tag.trim());
    const mediaWhatTags = searchParams.get('mediaWhat')?.split(',').filter(tag => tag.trim());
    const mediaWhenTags = searchParams.get('mediaWhen')?.split(',').filter(tag => tag.trim());
    const mediaWhereTags = searchParams.get('mediaWhere')?.split(',').filter(tag => tag.trim());
    if (mediaWhoTags && mediaWhoTags.length > 0) mediaDimensionalTags.who = mediaWhoTags;
    if (mediaWhatTags && mediaWhatTags.length > 0) mediaDimensionalTags.what = mediaWhatTags;
    if (mediaWhenTags && mediaWhenTags.length > 0) mediaDimensionalTags.when = mediaWhenTags;
    if (mediaWhereTags && mediaWhereTags.length > 0) mediaDimensionalTags.where = mediaWhereTags;

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
    const searchScopeParam = searchParams.get('searchScope');
    const searchScope: 'default' | 'admin-title' =
      searchScopeParam === 'admin-title' ? 'admin-title' : 'default';
    const limit = searchParams.has('limit') ? parseInt(searchParams.get('limit')!, 10) : 10;
    const lastDocId = searchParams.get('lastDocId') || undefined;
    const childrenIds_contains = searchParams.get('childrenIds_contains') || undefined;
    const collectionId = searchParams.get('collectionId') || undefined;
    const collectionsOnly = searchParams.get('collectionsOnly') === 'true';
    const hydrationParam = searchParams.get('hydration');
    const hydrationMode: 'full' | 'cover-only' =
      hydrationParam === 'cover-only' ? 'cover-only' : 'full';
    const sortByRaw = searchParams.get('sortBy');
    const sortBy: 'when' | 'created' | 'title' | 'who' | 'what' | 'where' | undefined =
      sortByRaw === 'created'
        ? 'created'
        : sortByRaw === 'title'
          ? 'title'
          : sortByRaw === 'who'
            ? 'who'
            : sortByRaw === 'what'
              ? 'what'
              : sortByRaw === 'where'
                ? 'where'
                : sortByRaw === 'when'
                  ? 'when'
                  : undefined;
    const sortDirRaw = searchParams.get('sortDir');
    const sortDir: 'asc' | 'desc' | undefined =
      sortDirRaw === 'asc' ? 'asc' : sortDirRaw === 'desc' ? 'desc' : undefined;

    try {
      // List cards that are collections (have children)
      if (collectionsOnly) {
        const collectionCards = await getCollectionCards(status, { hydrationMode });
        return NextResponse.json({ items: collectionCards, hasMore: false });
      }

      // Fetch a specific collection's children (paginated)
      if (collectionId) {
        const result = await getCardsByCollectionId(collectionId, {
          limit,
          lastDocId,
          hydrationMode,
        });
        return NextResponse.json(result);
      }

      // Dedicated narrow parent lookup path (used by admin delete warning flow).
      if (
        childrenIds_contains &&
        !q?.trim() &&
        !tags?.length &&
        Object.keys(dimensionalTags).length === 0 &&
        Object.keys(mediaDimensionalTags).length === 0 &&
        !sortBy
      ) {
        const items = await getParentCardsByChildId(childrenIds_contains, {
          status,
          limit,
          hydrationMode,
        });
        return NextResponse.json({
          items,
          hasMore: items.length >= limit,
        } as PaginatedResult<Card>);
      }

      const matchesAny = (candidate: string[] | undefined, required: string[] | undefined) => {
        if (!required || required.length === 0) return true;
        if (!candidate || candidate.length === 0) return false;
        const set = new Set(candidate);
        return required.some((id) => set.has(id));
      };
      const applyPostFilters = (items: Card[]): Card[] => {
        return items.filter((card) => {
          if (childrenIds_contains && !(card.childrenIds || []).includes(childrenIds_contains)) return false;
          if (tags && tags.length > 0) {
            const filterTags = card.filterTags || {};
            for (const tag of tags) {
              if (!filterTags[tag]) return false;
            }
          }
          if (dimensionalTags.who && dimensionalTags.who.length > 0 && !matchesAny(card.who, dimensionalTags.who)) return false;
          if (dimensionalTags.what && dimensionalTags.what.length > 0 && !matchesAny(card.what, dimensionalTags.what)) return false;
          if (dimensionalTags.when && dimensionalTags.when.length > 0 && !matchesAny(card.when, dimensionalTags.when)) return false;
          if (dimensionalTags.where && dimensionalTags.where.length > 0 && !matchesAny(card.where, dimensionalTags.where)) return false;
          if (mediaDimensionalTags.who && mediaDimensionalTags.who.length > 0 && !matchesAny(card.mediaWho, mediaDimensionalTags.who)) return false;
          if (mediaDimensionalTags.what && mediaDimensionalTags.what.length > 0 && !matchesAny(card.mediaWhat, mediaDimensionalTags.what)) return false;
          if (mediaDimensionalTags.when && mediaDimensionalTags.when.length > 0 && !matchesAny(card.mediaWhen, mediaDimensionalTags.when)) return false;
          if (mediaDimensionalTags.where && mediaDimensionalTags.where.length > 0 && !matchesAny(card.mediaWhere, mediaDimensionalTags.where)) return false;
          return true;
        });
      };

      if (q?.trim() && isTypesenseConfigured()) {
        try {
          const searchResult = await searchCards({
            query: q.trim(),
            type: type !== 'all' ? type : undefined,
            status: status !== 'all' ? status : undefined,
            perPage: Math.max(limit * 5, 100),
            searchScope,
          });

          if (searchResult.docIds.length === 0) {
            return NextResponse.json({ items: [], hasMore: false } as PaginatedResult<Card>);
          }

          const rawItems = await getCardsByIds(searchResult.docIds);
          const filteredItems = applyPostFilters(rawItems);
          const items = filteredItems.slice(0, limit);
          return NextResponse.json({
            items,
            hasMore: filteredItems.length > limit || searchResult.totalFound > searchResult.docIds.length,
          } as PaginatedResult<Card>);
        } catch (tsError) {
          console.warn('Typesense search failed, falling back to Firestore:', tsError);
        }
      }

      const result: PaginatedResult<Card> = await getCards({
        q,
        status,
        type,
        tags,
        dimensionalTags: Object.keys(dimensionalTags).length > 0 ? dimensionalTags : undefined,
        mediaDimensionalTags:
          Object.keys(mediaDimensionalTags).length > 0 ? mediaDimensionalTags : undefined,
        childrenIds_contains,
        limit,
        lastDocId,
        hydrationMode,
        ...(sortBy ? { sortBy } : {}),
        ...(sortDir ? { sortDir } : {}),
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
    
    console.log('[POST /api/cards] Received data:', cardData);

    // Use Zod validation for consistent error handling
    const validationResult = cardSchema.partial().safeParse(cardData);
    
    if (!validationResult.success) {
      console.log('[POST /api/cards] Validation failed:', validationResult.error);
      const formattedErrors = validationResult.error.flatten().fieldErrors;
      const errorMessages: string[] = [];
      
      for (const [field, errors] of Object.entries(formattedErrors)) {
        if (errors && errors.length > 0) {
          errorMessages.push(`${field}: ${errors[0]}`);
        }
      }
      
      console.log('[POST /api/cards] Error messages:', errorMessages);
      
      return new NextResponse(JSON.stringify({ 
        error: 'Validation failed',
        details: errorMessages 
      }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // The createCard service function will handle defaults and timestamps
    const newCard = await createCard(cardData as Omit<Card, 'docId' | 'createdAt' | 'updatedAt' | 'filterTags'>);

    return NextResponse.json(newCard, { status: 201 });
  } catch (error) {
    console.error('Error creating card:', error);
    if (error instanceof SyntaxError) {
      return new NextResponse(JSON.stringify({ error: 'Invalid JSON format' }), { status: 400 });
    }
    return new NextResponse('Internal server error', { status: 500 });
  }
} 