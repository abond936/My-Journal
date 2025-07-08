import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { getCardsByIds } from '@/lib/services/cardService';
import { Card } from '@/lib/types/card';

// In-memory cache for card IDs
let cardIdCache: {
  allCardIds: string[];
  cardIdsByDimension: {
    who: Record<string, string[]>;
    what: Record<string, string[]>;
    when: Record<string, string[]>;
    where: Record<string, string[]>;
    reflection: Record<string, string[]>;
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
    // Get all published card IDs
    const snapshot = await firestore.collection('cards')
      .where('status', '==', 'published')
      .select('docId', 'who', 'what', 'when', 'where', 'reflection')
      .get();
    
    const allCardIds: string[] = [];
    const cardIdsByDimension = {
      who: {} as Record<string, string[]>,
      what: {} as Record<string, string[]>,
      when: {} as Record<string, string[]>,
      where: {} as Record<string, string[]>,
      reflection: {} as Record<string, string[]>
    };
    
    snapshot.docs.forEach(doc => {
      const data = doc.data();
      const cardId = doc.id;
      allCardIds.push(cardId);
      
      // Organize by dimensional tags
      ['who', 'what', 'when', 'where', 'reflection'].forEach(dimension => {
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
    reflection?: string[];
  },
  excludeIds: string[] = []
): string[] {
  if (!cardIdCache) {
    throw new Error('Card ID cache not initialized');
  }
  
  let availableCardIds: string[];
  
  if (dimensionalTags && Object.keys(dimensionalTags).some(dim => dimensionalTags[dim]?.length > 0)) {
    // Filter by dimensional tags
    const matchingCardIds = new Set<string>();
    
    Object.entries(dimensionalTags).forEach(([dimension, tagIds]) => {
      if (tagIds && tagIds.length > 0) {
        tagIds.forEach(tagId => {
          const cardIds = cardIdCache!.cardIdsByDimension[dimension][tagId] || [];
          cardIds.forEach(cardId => matchingCardIds.add(cardId));
        });
      }
    });
    
    availableCardIds = Array.from(matchingCardIds);
  } else {
    // Use all cards
    availableCardIds = [...cardIdCache.allCardIds];
  }
  
  // Filter out excluded IDs
  availableCardIds = availableCardIds.filter(id => !excludeIds.includes(id));
  
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
  const session = await getServerSession(authOptions);
  const isAdmin = session?.user?.role === 'admin';

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
      reflection?: string[];
    } = {};
    
    const whoParam = searchParams.get('who');
    const whatParam = searchParams.get('what');
    const whenParam = searchParams.get('when');
    const whereParam = searchParams.get('where');
    const reflectionParam = searchParams.get('reflection');
    
    const whoTags = whoParam ? whoParam.split(',').filter(tag => tag && tag.trim()) : undefined;
    const whatTags = whatParam ? whatParam.split(',').filter(tag => tag && tag.trim()) : undefined;
    const whenTags = whenParam ? whenParam.split(',').filter(tag => tag && tag.trim()) : undefined;
    const whereTags = whereParam ? whereParam.split(',').filter(tag => tag && tag.trim()) : undefined;
    const reflectionTags = reflectionParam ? reflectionParam.split(',').filter(tag => tag && tag.trim()) : undefined;
    
    if (whoTags && whoTags.length > 0) dimensionalTags.who = whoTags;
    if (whatTags && whatTags.length > 0) dimensionalTags.what = whatTags;
    if (whenTags && whenTags.length > 0) dimensionalTags.when = whenTags;
    if (whereTags && whereTags.length > 0) dimensionalTags.where = whereTags;
    if (reflectionTags && reflectionTags.length > 0) dimensionalTags.reflection = reflectionTags;

    // Update cache if needed
    if (!cardIdCache || Date.now() - cardIdCache.lastUpdated > CACHE_DURATION) {
      await updateCardIdCache();
    }
    
    // Get random card IDs from cache
    const randomCardIds = getRandomCardIds(count, dimensionalTags, excludeIds);
    
    if (randomCardIds.length === 0) {
      return NextResponse.json([]);
    }
    
    // Fetch only the selected cards by ID
    const randomCards = await getCardsByIds(randomCardIds);

    return NextResponse.json(randomCards);
  } catch (error) {
    console.error('Error in GET /api/cards/random:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ error: 'Internal Server Error', detailedError: errorMessage }, { status: 500 });
  }
} 