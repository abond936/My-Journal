import { NextResponse } from 'next/server';
import { getCardsByIds } from '@/lib/services/cardService';
import { Card } from '@/lib/types/card';

const CARD_TYPES = ['story', 'qa', 'quote', 'callout', 'gallery'] as const;
type CardTypeFilter = typeof CARD_TYPES[number] | 'all';

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

// In-memory cache for card IDs
let cardIdCache: {
  allCardIds: string[];
  cardIdsByType: Record<string, string[]>;
  cardIdsByDimension: {
    who: Record<string, string[]>;
    what: Record<string, string[]>;
    when: Record<string, string[]>;
    where: Record<string, string[]>;
  };
  lastUpdated: number;
} | null = null;

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Updates the card ID cache from Firestore
 */
async function updateCardIdCache() {
  const { getFirestore } = await import('firebase-admin/firestore');
  const firestore = getFirestore();
  
  try {
    // Get all published card IDs (include type for card-type filtering)
    const snapshot = await firestore.collection('cards')
      .where('status', '==', 'published')
      .get();
    
    const allCardIds: string[] = [];
    const cardIdsByType: Record<string, string[]> = {
      story: [],
      qa: [],
      quote: [],
      callout: [],
      gallery: []
    };
    const cardIdsByDimension = {
      who: {} as Record<string, string[]>,
      what: {} as Record<string, string[]>,
      when: {} as Record<string, string[]>,
      where: {} as Record<string, string[]>,
    };
    
    snapshot.docs.forEach(doc => {
      const data = doc.data();
      const cardId = doc.id;
      const cardType = (data.type as string) || 'story';
      allCardIds.push(cardId);
      
      if (cardIdsByType[cardType]) {
        cardIdsByType[cardType].push(cardId);
      }
      
      // Organize by dimensional tags
      ['who', 'what', 'when', 'where'].forEach(dimension => {
        const tags = data[dimension] || [];
        tags.forEach((tagId: string) => {
          if (!cardIdsByDimension[dimension][tagId]) {
            cardIdsByDimension[dimension][tagId] = [];
          }
          cardIdsByDimension[dimension][tagId].push(cardId);
        });
      });
    });
    
    cardIdCache = {
      allCardIds,
      cardIdsByType,
      cardIdsByDimension,
      lastUpdated: Date.now()
    };
    
    console.log(`Updated card ID cache: ${allCardIds.length} cards`);
  } catch (error) {
    console.error('Error updating card ID cache:', error);
    throw error;
  }
}

/**
 * Gets random card IDs from cache
 */
function getRandomCardIds(
  count: number,
  dimensionalTags?: {
    who?: string[];
    what?: string[];
    when?: string[];
    where?: string[];
  },
  excludeDimensionalTags?: {
    who?: string[];
    what?: string[];
    when?: string[];
    where?: string[];
  },
  excludeIds: string[] = [],
  type?: CardTypeFilter,
  types?: Card['type'][]
): string[] {
  if (!cardIdCache) {
    throw new Error('Card ID cache not initialized');
  }
  
  let availableCardIds: string[];
  
  if (dimensionalTags && Object.keys(dimensionalTags).some(dim => dimensionalTags[dim as keyof typeof dimensionalTags]?.length > 0)) {
    // Related logic: AND across provided dimensions, OR within each dimension.
    let intersectedIds: Set<string> | null = null;
    (['who', 'what', 'when', 'where'] as const).forEach((dimension) => {
      const tagIds = dimensionalTags[dimension] || [];
      if (!tagIds.length) return;
      const idsForDimension = new Set<string>();
      tagIds.forEach((tagId) => {
        const cardIds = cardIdCache!.cardIdsByDimension[dimension][tagId] || [];
        cardIds.forEach((cardId) => idsForDimension.add(cardId));
      });
      intersectedIds = intersectedIds === null
        ? idsForDimension
        : new Set([...intersectedIds].filter((id) => idsForDimension.has(id)));
    });
    availableCardIds = intersectedIds ? Array.from(intersectedIds) : [];
  } else {
    // Use all cards
    availableCardIds = [...cardIdCache.allCardIds];
  }
  
  // Filter by card type(s) if specified
  if (types && types.length > 0) {
    const typeSet = new Set<string>();
    for (const t of types) {
      (cardIdCache.cardIdsByType[t] || []).forEach((id) => typeSet.add(id));
    }
    availableCardIds = availableCardIds.filter((id) => typeSet.has(id));
  } else if (type && type !== 'all' && cardIdCache.cardIdsByType[type]) {
    const typeSet = new Set(cardIdCache.cardIdsByType[type]);
    availableCardIds = availableCardIds.filter(id => typeSet.has(id));
  }
  
  // Filter out excluded IDs
  availableCardIds = availableCardIds.filter(id => !excludeIds.includes(id));

  // Optional random logic: remove anything that matches provided dimensional tags.
  if (
    excludeDimensionalTags &&
    Object.keys(excludeDimensionalTags).some(
      (dim) => excludeDimensionalTags[dim as keyof typeof excludeDimensionalTags]?.length
    )
  ) {
    const excludedByDimension = new Set<string>();
    (['who', 'what', 'when', 'where'] as const).forEach((dimension) => {
      const tagIds = excludeDimensionalTags[dimension] || [];
      tagIds.forEach((tagId) => {
        const ids = cardIdCache!.cardIdsByDimension[dimension][tagId] || [];
        ids.forEach((id) => excludedByDimension.add(id));
      });
    });
    availableCardIds = availableCardIds.filter((id) => !excludedByDimension.has(id));
  }
  
  // If we don't have enough cards, return what we have
  if (availableCardIds.length <= count) {
    return availableCardIds;
  }
  
  // Reservoir sampling for true randomness
  const selectedIds: string[] = [];
  for (let i = 0; i < availableCardIds.length; i++) {
    if (i < count) {
      selectedIds.push(availableCardIds[i]);
    } else {
      const j = Math.floor(Math.random() * (i + 1));
      if (j < count) {
        selectedIds[j] = availableCardIds[i];
      }
    }
  }
  
  return selectedIds;
}

/**
 * GET handler for fetching random cards.
 * @param request - The incoming NextRequest.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Parse parameters
    const count = searchParams.has('count') ? parseInt(searchParams.get('count')!, 10) : 3;
    const excludeParam = searchParams.get('exclude');
    const excludeIds = excludeParam ? excludeParam.split(',').filter(id => id && id.trim()) : [];
    
    // Parse dimensional tags for filtering
    const dimensionalTags: {
      who?: string[];
      what?: string[];
      when?: string[];
      where?: string[];
    } = {};
    
    const whoParam = searchParams.get('who');
    const whatParam = searchParams.get('what');
    const whenParam = searchParams.get('when');
    const whereParam = searchParams.get('where');
    
    const whoTags = whoParam ? whoParam.split(',').filter(tag => tag && tag.trim()) : undefined;
    const whatTags = whatParam ? whatParam.split(',').filter(tag => tag && tag.trim()) : undefined;
    const whenTags = whenParam ? whenParam.split(',').filter(tag => tag && tag.trim()) : undefined;
    const whereTags = whereParam ? whereParam.split(',').filter(tag => tag && tag.trim()) : undefined;
    
    if (whoTags && whoTags.length > 0) dimensionalTags.who = whoTags;
    if (whatTags && whatTags.length > 0) dimensionalTags.what = whatTags;
    if (whenTags && whenTags.length > 0) dimensionalTags.when = whenTags;
    if (whereTags && whereTags.length > 0) dimensionalTags.where = whereTags;

    const typeParam = searchParams.get('type') as CardTypeFilter | null;
    const type =
      typeParam && CARD_TYPES.includes(typeParam as (typeof CARD_TYPES)[number])
        ? typeParam
        : undefined;
    const typesRaw = searchParams.get('types');
    const typesList =
      typesRaw
        ?.split(',')
        .map((s) => s.trim())
        .filter((t): t is Card['type'] =>
          CARD_TYPES.includes(t as (typeof CARD_TYPES)[number])
        ) ?? [];
    const typesFilter = typesList.length > 0 ? [...new Set(typesList)] : undefined;
    const excludeDimensionalMatches = searchParams.get('excludeDimensionalMatches') === 'true';

    // Update cache if needed
    if (!cardIdCache || Date.now() - cardIdCache.lastUpdated > CACHE_DURATION) {
      await updateCardIdCache();
    }
    
    // Get random card IDs from cache
    let typeResolved: CardTypeFilter = type || 'all';
    let typesResolved: Card['type'][] | undefined;
    if (typesFilter && typesFilter.length > 0) {
      if (typesFilter.length === 1) {
        typeResolved = typesFilter[0];
      } else {
        typesResolved = typesFilter;
        typeResolved = 'all';
      }
    }

    const randomCardIds = getRandomCardIds(
      count,
      excludeDimensionalMatches ? undefined : dimensionalTags,
      excludeDimensionalMatches ? dimensionalTags : undefined,
      excludeIds,
      typeResolved,
      typesResolved
    );
    
    if (randomCardIds.length === 0) {
      return NextResponse.json([]);
    }
    
    // Fetch only the selected cards by ID
    const randomCards = await getCardsByIds(randomCardIds);

    return NextResponse.json(randomCards);
  } catch (error) {
    console.error('Error in GET /api/cards/random:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return errorResponse(
      {
        ok: false,
        code: 'CARD_RANDOM_FETCH_FAILED',
        message: 'Internal server error.',
        severity: 'error',
        retryable: true,
        error: errorMessage,
      },
      500
    );
  }
} 