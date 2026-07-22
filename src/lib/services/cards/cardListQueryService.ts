import { getAdminApp } from '@/lib/config/firebase/admin';
import type { Card } from '@/lib/types/card';
import { FieldPath } from 'firebase-admin/firestore';
import { hydrateCards as _hydrateCards, hydrateCoverImagesOnly as _hydrateCoverImagesOnly, hydrateReaderFeedCards as _hydrateReaderFeedCards } from './cardMediaHydrationService';
import type { CardHydrationMode } from './cardReadService';
import { cardMatchesCodificationFilter, type CardCodificationFilter } from '@/lib/utils/cardCodification';

const firestore = getAdminApp().firestore();
const CARDS_COLLECTION = 'cards';

export async function getCards(options: {
  q?: string;
  status?: Card['status'] | 'all';
  type?: Card['type'] | 'all';
  displayMode?: Card['displayMode'] | 'all';
  codification?: CardCodificationFilter;
  /** When 2+ values, Firestore `in` filter (OR). Omit when using single `type`. */
  types?: Card['type'][];
  tags?: string[];
  dimensionalTags?: {
    who?: string[];
    what?: string[];
    when?: string[];
    where?: string[];
  };
  /** Exact direct-tag dimensional matching (selected tags only, no descendants). */
  exactDimensionalTags?: {
    who?: string[];
    what?: string[];
    when?: string[];
    where?: string[];
  };
  /** When true for a dimension, keep only cards with no card-level tags in that dimension (empty or absent array). Applied in-memory with query oversampling. */
  dimensionMissing?: {
    who?: boolean;
    what?: boolean;
    when?: boolean;
    where?: boolean;
  };
  childrenIds_contains?: string;
  limit?: number;
  lastDocId?: string;
  hydrationMode?: CardHydrationMode;
  /** When `q` is set, title prefix search uses `orderBy('title_lowercase')` and this is ignored. */
  sortBy?: 'when' | 'created' | 'title' | 'who' | 'what' | 'where';
  sortDir?: 'asc' | 'desc';
} = {}): Promise<{ items: Card[]; lastDocId?: string; hasMore: boolean }> {
  const { 
    q,
    status = 'published',
    type = 'all',
    displayMode = 'all',
    codification = 'all',
    types: typesIn,
    tags,
    dimensionalTags,
    exactDimensionalTags,
    dimensionMissing,
    childrenIds_contains,
    limit = 10,
    lastDocId,
    hydrationMode = 'full',
    sortBy = 'when',
    sortDir = 'desc',
  } = options;

  const multiTypes =
    typesIn && typesIn.length > 1 ? [...new Set(typesIn)].slice(0, 10) : undefined;
  const singleTypeFilter =
    multiTypes !== undefined
      ? undefined
      : typesIn && typesIn.length === 1
        ? typesIn[0]
        : type && type !== 'all'
          ? type
          : undefined;

  let query: FirebaseFirestore.Query = firestore.collection(CARDS_COLLECTION);
  const trimmedQuery = q?.trim() ?? '';
  const hasSearch = trimmedQuery.length > 0;
  const hasDimensionMissingFilters = Boolean(
    dimensionMissing &&
      (dimensionMissing.who ||
        dimensionMissing.what ||
        dimensionMissing.when ||
        dimensionMissing.where)
  );
  const hasExactDimensionalFilters = Boolean(
    exactDimensionalTags &&
      (exactDimensionalTags.who ||
        exactDimensionalTags.what ||
        exactDimensionalTags.when ||
        exactDimensionalTags.where)
  );
  const hasCodificationFilter = codification !== 'all';
  const needsPostFilterOversample = hasDimensionMissingFilters || hasExactDimensionalFilters || hasCodificationFilter;

  // Combined text search and tag filtering
  if (hasSearch) {
    const lower = trimmedQuery.toLowerCase();
    query = query
      .where('title_lowercase', '>=', lower)
      .where('title_lowercase', '<=', lower + '\uf8ff')
      .orderBy('title_lowercase')
      .orderBy(FieldPath.documentId(), 'asc');
  }

  // --- Filter by tags ---
  if (tags && tags.length > 0) {
    // Use filterTags for efficient tag-based queries
    // Note: Firestore doesn't support 'array-contains-any' on map fields
    // We'll use individual field queries for each tag
    tags.forEach(tag => {
      query = query.where(`filterTags.${tag}`, '==', true);
    });
  }

  // Filter by status
  if (status && status !== 'all') {
    query = query.where('status', '==', status);
  }

  // Filter by type (single == or multi in)
  if (multiTypes && multiTypes.length > 1) {
    query = query.where('type', 'in', multiTypes);
  } else if (singleTypeFilter) {
    query = query.where('type', '==', singleTypeFilter);
  }

  if (displayMode && displayMode !== 'all') {
    query = query.where('displayMode', '==', displayMode);
  }

  // Filter by dimensional tags
  if (dimensionalTags) {
    const { who, what, when, where } = dimensionalTags;
    
    // Apply dimensional filtering with intra-dimension OR logic and inter-dimension AND logic
    if (who && who.length > 0) {
      query = query.where('who', 'array-contains-any', who);
    }
    if (what && what.length > 0) {
      query = query.where('what', 'array-contains-any', what);
    }
    if (when && when.length > 0) {
      query = query.where('when', 'array-contains-any', when);
    }
    if (where && where.length > 0) {
      query = query.where('where', 'array-contains-any', where);
    }
  }

  if (exactDimensionalTags) {
    const directExactTagUnion = [
      ...(exactDimensionalTags.who ?? []),
      ...(exactDimensionalTags.what ?? []),
      ...(exactDimensionalTags.when ?? []),
      ...(exactDimensionalTags.where ?? []),
    ];
    const directExactTags = [...new Set(directExactTagUnion)].slice(0, 30);
    if (directExactTags.length > 0) {
      query = query.where('tags', 'array-contains-any', directExactTags);
    }
  }

  // Filter by childrenIds_contains
  if (childrenIds_contains) {
    query = query.where('childrenIds', 'array-contains', childrenIds_contains);
  }

  // Apply sorting (title search uses range on title + orderBy title_lowercase).
  // `when` uses denormalized journal keys where undated items sort last.
  if (!hasSearch) {
    if (sortBy === 'created') {
      query =
        sortDir === 'asc'
          ? query.orderBy('createdAt', 'asc').orderBy(FieldPath.documentId(), 'asc')
          : query.orderBy('createdAt', 'desc').orderBy(FieldPath.documentId(), 'desc');
    } else if (sortBy === 'title') {
      query =
        sortDir === 'asc'
          ? query.orderBy('title_lowercase', 'asc').orderBy(FieldPath.documentId(), 'asc')
          : query.orderBy('title_lowercase', 'desc').orderBy(FieldPath.documentId(), 'desc');
    } else if (sortBy === 'who' || sortBy === 'what' || sortBy === 'where') {
      const key = sortBy === 'who' ? 'whoSortKey' : sortBy === 'what' ? 'whatSortKey' : 'whereSortKey';
      query =
        sortDir === 'asc'
          ? query.orderBy(key, 'asc').orderBy('title_lowercase', 'asc').orderBy(FieldPath.documentId(), 'asc')
          : query.orderBy(key, 'desc').orderBy('title_lowercase', 'asc').orderBy(FieldPath.documentId(), 'asc');
    } else {
      query =
        sortDir === 'asc'
          ? query.orderBy('journalWhenSortAsc', 'asc').orderBy(FieldPath.documentId(), 'asc')
          : query.orderBy('journalWhenSortDesc', 'desc').orderBy(FieldPath.documentId(), 'desc');
    }
  }

  // Apply pagination
  if (lastDocId) {
    const lastDocSnap = await firestore.collection(CARDS_COLLECTION).doc(lastDocId).get();
    if (lastDocSnap.exists) {
      query = query.startAfter(lastDocSnap);
    }
  }

  const oversampleLimit = hasExactDimensionalFilters
    ? Math.max(limit * 10, 200)
    : hasDimensionMissingFilters || hasCodificationFilter
      ? Math.max(limit * 5, 100)
      : limit;

  const querySnapshot = await query.limit(oversampleLimit).get();

  let cards: Card[] = querySnapshot.docs.map(doc => ({
    docId: doc.id,
    ...doc.data(),
  } as Card));
  
  const cardDimEmpty = (arr: string[] | undefined) => !arr || arr.length === 0;
  const cardDirectMatchesAny = (card: Card, required: string[] | undefined) => {
    if (!required || required.length === 0) return true;
    const directTags = Array.isArray(card.tags) ? new Set(card.tags) : null;
    if (!directTags || directTags.size === 0) return false;
    return required.some((tagId) => directTags.has(tagId));
  };

  if (hasExactDimensionalFilters && exactDimensionalTags) {
    cards = cards.filter((card) => {
      if (!cardDirectMatchesAny(card, exactDimensionalTags.who)) return false;
      if (!cardDirectMatchesAny(card, exactDimensionalTags.what)) return false;
      if (!cardDirectMatchesAny(card, exactDimensionalTags.when)) return false;
      if (!cardDirectMatchesAny(card, exactDimensionalTags.where)) return false;
      return true;
    });
  }

  if (hasDimensionMissingFilters && dimensionMissing) {
    cards = cards.filter((card) => {
      if (dimensionMissing.who && !cardDimEmpty(card.who)) return false;
      if (dimensionMissing.what && !cardDimEmpty(card.what)) return false;
      if (dimensionMissing.when && !cardDimEmpty(card.when)) return false;
      if (dimensionMissing.where && !cardDimEmpty(card.where)) return false;
      return true;
    });
  }

  if (hasCodificationFilter) {
    cards = cards.filter((card) => cardMatchesCodificationFilter(card, codification));
  }

  // --- HYDRATION STEP - Use selective hydration based on mode ---
  if (hydrationMode === 'cover-only') {
    cards = await _hydrateCoverImagesOnly(cards);
  } else if (hydrationMode === 'reader-feed') {
    cards = await _hydrateReaderFeedCards(cards);
  } else {
    cards = await _hydrateCards(cards);
  }

  if (cards.length > limit) {
    cards = cards.slice(0, limit);
  }

  const lastVisible = querySnapshot.docs[querySnapshot.docs.length - 1];
  let lastDocIdResult = lastVisible ? lastVisible.id : undefined;
  let hasMore = needsPostFilterOversample
    ? querySnapshot.size >= oversampleLimit
    : querySnapshot.size === limit;

  // Temporary safety net: if title_lowercase is missing on legacy docs, strict prefix search can miss obvious results.
  // Fall back to a bounded scan and in-memory title match so admin search remains usable until backfill runs.
  if (hasSearch && cards.length === 0) {
    let fallbackQuery: FirebaseFirestore.Query = firestore.collection(CARDS_COLLECTION);
    if (status && status !== 'all') fallbackQuery = fallbackQuery.where('status', '==', status);
    if (multiTypes && multiTypes.length > 1) {
      fallbackQuery = fallbackQuery.where('type', 'in', multiTypes);
    } else if (singleTypeFilter) {
      fallbackQuery = fallbackQuery.where('type', '==', singleTypeFilter);
    }
    if (tags && tags.length > 0) {
      tags.forEach((tag) => {
        fallbackQuery = fallbackQuery.where(`filterTags.${tag}`, '==', true);
      });
    }
    if (dimensionalTags) {
      const { who, what, when, where } = dimensionalTags;
      if (who && who.length > 0) fallbackQuery = fallbackQuery.where('who', 'array-contains-any', who);
      if (what && what.length > 0) fallbackQuery = fallbackQuery.where('what', 'array-contains-any', what);
      if (when && when.length > 0) fallbackQuery = fallbackQuery.where('when', 'array-contains-any', when);
      if (where && where.length > 0) fallbackQuery = fallbackQuery.where('where', 'array-contains-any', where);
    }
    if (exactDimensionalTags) {
      const directExactTagUnion = [
        ...(exactDimensionalTags.who ?? []),
        ...(exactDimensionalTags.what ?? []),
        ...(exactDimensionalTags.when ?? []),
        ...(exactDimensionalTags.where ?? []),
      ];
      const directExactTags = [...new Set(directExactTagUnion)].slice(0, 30);
      if (directExactTags.length > 0) {
        fallbackQuery = fallbackQuery.where('tags', 'array-contains-any', directExactTags);
      }
    }
    if (childrenIds_contains) {
      fallbackQuery = fallbackQuery.where('childrenIds', 'array-contains', childrenIds_contains);
    }

    if (sortBy === 'created') {
      fallbackQuery =
        sortDir === 'asc'
          ? fallbackQuery.orderBy('createdAt', 'asc').orderBy(FieldPath.documentId(), 'asc')
          : fallbackQuery.orderBy('createdAt', 'desc').orderBy(FieldPath.documentId(), 'desc');
    } else if (sortBy === 'title') {
      fallbackQuery =
        sortDir === 'asc'
          ? fallbackQuery.orderBy('title_lowercase', 'asc').orderBy(FieldPath.documentId(), 'asc')
          : fallbackQuery.orderBy('title_lowercase', 'desc').orderBy(FieldPath.documentId(), 'desc');
    } else if (sortBy === 'who' || sortBy === 'what' || sortBy === 'where') {
      const key = sortBy === 'who' ? 'whoSortKey' : sortBy === 'what' ? 'whatSortKey' : 'whereSortKey';
      fallbackQuery =
        sortDir === 'asc'
          ? fallbackQuery.orderBy(key, 'asc').orderBy('title_lowercase', 'asc').orderBy(FieldPath.documentId(), 'asc')
          : fallbackQuery.orderBy(key, 'desc').orderBy('title_lowercase', 'asc').orderBy(FieldPath.documentId(), 'asc');
    } else {
      fallbackQuery =
        sortDir === 'asc'
          ? fallbackQuery.orderBy('journalWhenSortAsc', 'asc').orderBy(FieldPath.documentId(), 'asc')
          : fallbackQuery.orderBy('journalWhenSortDesc', 'desc').orderBy(FieldPath.documentId(), 'desc');
    }

    const fallbackSnap = await fallbackQuery.limit(200).get();
    const lower = trimmedQuery.toLowerCase();
    let fallbackItems = fallbackSnap.docs
      .map((doc) => ({ docId: doc.id, ...(doc.data() as Card) } as Card))
      .filter((c) => (c.title || '').toLowerCase().includes(lower))
      .slice(0, 200);
    if (hasExactDimensionalFilters && exactDimensionalTags) {
      fallbackItems = fallbackItems.filter((card) => {
        if (!cardDirectMatchesAny(card, exactDimensionalTags.who)) return false;
        if (!cardDirectMatchesAny(card, exactDimensionalTags.what)) return false;
        if (!cardDirectMatchesAny(card, exactDimensionalTags.when)) return false;
        if (!cardDirectMatchesAny(card, exactDimensionalTags.where)) return false;
        return true;
      });
    }
    if (hasDimensionMissingFilters && dimensionMissing) {
      fallbackItems = fallbackItems.filter((card) => {
        if (dimensionMissing.who && !cardDimEmpty(card.who)) return false;
        if (dimensionMissing.what && !cardDimEmpty(card.what)) return false;
        if (dimensionMissing.when && !cardDimEmpty(card.when)) return false;
        if (dimensionMissing.where && !cardDimEmpty(card.where)) return false;
        return true;
      });
    }
    if (hasCodificationFilter) {
      fallbackItems = fallbackItems.filter((card) => cardMatchesCodificationFilter(card, codification));
    }
    fallbackItems = fallbackItems.slice(0, limit);

    if (fallbackItems.length > 0) {
      cards = hydrationMode === 'cover-only'
        ? await _hydrateCoverImagesOnly(fallbackItems)
        : hydrationMode === 'reader-feed'
          ? await _hydrateReaderFeedCards(fallbackItems)
          : await _hydrateCards(fallbackItems);
      lastDocIdResult = cards[cards.length - 1]?.docId;
      hasMore = false;
    }
  }

  return { items: cards, lastDocId: lastDocIdResult, hasMore };
}
