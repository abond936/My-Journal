import { NextResponse } from 'next/server';
import {
  createCard,
  expandFeedItemsWithChildren,
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
import {
  searchCardsFiltered,
  type TypesenseCardSortField,
} from '@/lib/services/typesenseService';

type ApiErrorPayload = {
  ok: false;
  code: string;
  message: string;
  severity: 'error' | 'warning';
  retryable: boolean;
  error?: string;
  details?: string[];
};

function errorResponse(payload: ApiErrorPayload, status: number) {
  return NextResponse.json(payload, { status });
}

const CARD_TYPES_QUERY = new Set<string>(['story', 'qa', 'quote', 'callout', 'gallery']);

function parseCardTypesList(raw: string | null): Card['type'][] | undefined {
  if (!raw?.trim()) return undefined;
  const out = raw
    .split(',')
    .map((s) => s.trim())
    .filter((t): t is Card['type'] => CARD_TYPES_QUERY.has(t));
  return out.length ? [...new Set(out)] : undefined;
}

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

    const dimensionMissing: {
      who?: boolean;
      what?: boolean;
      when?: boolean;
      where?: boolean;
    } = {};
    if (searchParams.get('whoMissing') === 'true') dimensionMissing.who = true;
    if (searchParams.get('whatMissing') === 'true') dimensionMissing.what = true;
    if (searchParams.get('whenMissing') === 'true') dimensionMissing.when = true;
    if (searchParams.get('whereMissing') === 'true') dimensionMissing.where = true;

    // Missing-dimension filter wins over same-dimension tag list (cannot intersect).
    if (dimensionMissing.who) delete dimensionalTags.who;
    if (dimensionMissing.what) delete dimensionalTags.what;
    if (dimensionMissing.when) delete dimensionalTags.when;
    if (dimensionMissing.where) delete dimensionalTags.where;

    const hasDimensionMissingFilters = Boolean(
      dimensionMissing.who ||
        dimensionMissing.what ||
        dimensionMissing.when ||
        dimensionMissing.where
    );

    let status = searchParams.get('status') as Card['status'] | 'all' | null;
    if (!status) {
      status = isAdmin ? 'all' : 'published';
    }
    
    // Security check: Only admins can request 'draft' or 'all' cards
    if ((status === 'draft' || status === 'all') && !isAdmin) {
      return errorResponse(
        {
          ok: false,
          code: 'AUTH_FORBIDDEN',
          message: 'Forbidden.',
          severity: 'error',
          retryable: false,
        },
        403
      );
    }

    const typesListParsed = parseCardTypesList(searchParams.get('types'));
    let type: Card['type'] | 'all' = (searchParams.get('type') as Card['type'] | 'all') || 'all';
    if (type !== 'all' && !CARD_TYPES_QUERY.has(type)) type = 'all';

    let typesForService: Card['type'][] | undefined;
    if (typesListParsed?.length) {
      if (typesListParsed.length === 1) {
        type = typesListParsed[0];
      } else {
        typesForService = typesListParsed;
        type = 'all';
      }
    }
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
    const includeChildren = searchParams.get('includeChildren') === 'true';

    /** Child expansion is only for tag/dimension-style discovery—not title-only or type-only. */
    const hasNonEmptyTags = Boolean(tags?.filter((t) => t?.trim()).length);
    const hasTagOrDimensionStyleFilter =
      hasNonEmptyTags ||
      Boolean(whoTags?.length) ||
      Boolean(whatTags?.length) ||
      Boolean(whenTags?.length) ||
      Boolean(whereTags?.length) ||
      hasDimensionMissingFilters;
    const shouldExpandChildren = includeChildren && hasTagOrDimensionStyleFilter;

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
        !hasDimensionMissingFilters &&
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
      const cardDimEmpty = (arr: string[] | undefined) => !arr || arr.length === 0;
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
          if (dimensionMissing.who && !cardDimEmpty(card.who)) return false;
          if (dimensionMissing.what && !cardDimEmpty(card.what)) return false;
          if (dimensionMissing.when && !cardDimEmpty(card.when)) return false;
          if (dimensionMissing.where && !cardDimEmpty(card.where)) return false;
          return true;
        });
      };

      if (isTypesenseConfigured()) {
        try {
          const pageIdx = Math.max(0, parseInt(searchParams.get('page') ?? '0', 10) || 0);
          const sortByResolved: TypesenseCardSortField =
            sortBy ?? (q?.trim() ? 'title' : 'when');
          const sortDirResolved = sortDir ?? (q?.trim() ? 'asc' : 'desc');

          const searchResult = await searchCardsFiltered({
            textQuery: q?.trim() || undefined,
            type,
            types:
              typesForService && typesForService.length > 1 ? typesForService : undefined,
            status,
            tags: tags?.filter((t): t is string => Boolean(t?.trim())),
            dimensionalTags:
              Object.keys(dimensionalTags).length > 0 ? dimensionalTags : undefined,
            childrenIds_contains,
            dimensionMissing: hasDimensionMissingFilters ? dimensionMissing : undefined,
            page: pageIdx,
            perPage: limit,
            sortBy: sortByResolved,
            sortDir: sortDirResolved,
            searchScope,
          });

          if (searchResult.docIds.length === 0) {
            return NextResponse.json({
              items: [],
              hasMore: false,
              lastDocId: undefined,
            } as PaginatedResult<Card>);
          }

          const rawItems = await getCardsByIds(searchResult.docIds, { hydrationMode });
          const filteredItems = applyPostFilters(rawItems);
          let items = filteredItems.slice(0, limit);
          if (shouldExpandChildren && items.length > 0) {
            items = await expandFeedItemsWithChildren(items, { status, hydrationMode });
          }
          const lastDocId =
            items.length > 0 ? items[items.length - 1].docId : undefined;
          const hasMore = (pageIdx + 1) * limit < searchResult.totalFound;

          return NextResponse.json({
            items,
            lastDocId,
            hasMore,
          } as PaginatedResult<Card>);
        } catch (tsError) {
          console.warn('Typesense list/search failed, falling back to Firestore:', tsError);
        }
      }

      const result: PaginatedResult<Card> = await getCards({
        q,
        status,
        type,
        types: typesForService,
        tags,
        dimensionalTags: Object.keys(dimensionalTags).length > 0 ? dimensionalTags : undefined,
        dimensionMissing: hasDimensionMissingFilters ? dimensionMissing : undefined,
        childrenIds_contains,
        limit,
        lastDocId,
        hydrationMode,
        ...(sortBy ? { sortBy } : {}),
        ...(sortDir ? { sortDir } : {}),
      });

      if (shouldExpandChildren && result.items.length > 0) {
        result.items = await expandFeedItemsWithChildren(result.items, { status, hydrationMode });
      }

      return NextResponse.json(result);
    } catch (error) {
      console.error('Error in GET /api/cards:', error);
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      return errorResponse(
        {
          ok: false,
          code: 'CARD_LIST_FAILED',
          message: 'Internal server error.',
          severity: 'error',
          retryable: true,
          error: errorMessage,
        },
        500
      );
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    console.error('Error in GET /api/cards:', errorMessage);
    return errorResponse(
      {
        ok: false,
        code: 'CARD_LIST_FAILED',
        message: 'Internal server error.',
        severity: 'error',
        retryable: true,
        error: errorMessage,
      },
      500
    );
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
    return errorResponse(
      {
        ok: false,
        code: 'AUTH_FORBIDDEN',
        message: 'Forbidden.',
        severity: 'error',
        retryable: false,
      },
      403
    );
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

      return errorResponse(
        {
          ok: false,
          code: 'CARD_CREATE_VALIDATION_FAILED',
          message: 'Validation failed.',
          severity: 'error',
          retryable: false,
          details: errorMessages,
        },
        400
      );
    }
    
    // The createCard service function will handle defaults and timestamps
    const newCard = await createCard(cardData as Omit<Card, 'docId' | 'createdAt' | 'updatedAt' | 'filterTags'>);

    return NextResponse.json(newCard, { status: 201 });
  } catch (error) {
    console.error('Error creating card:', error);
    if (error instanceof SyntaxError) {
      return errorResponse(
        {
          ok: false,
          code: 'CARD_CREATE_INVALID_JSON',
          message: 'Invalid JSON format.',
          severity: 'error',
          retryable: false,
        },
        400
      );
    }
    const message = error instanceof Error ? error.message : 'An unknown error occurred';
    return errorResponse(
      {
        ok: false,
        code: 'CARD_CREATE_FAILED',
        message: 'Internal server error.',
        severity: 'error',
        retryable: true,
        error: message,
      },
      500
    );
  }
} 