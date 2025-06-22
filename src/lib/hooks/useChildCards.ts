'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/lib/types/card';

export function useChildCards(childIds: string[]) {
  const [childCards, setChildCards] = useState<Card[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchChildCards() {
      if (!childIds || childIds.length === 0) {
        setChildCards([]);
        return;
      }

      setIsLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({ ids: childIds.join(',') });
        // This endpoint doesn't exist yet. We will need to create it.
        const response = await fetch(`/api/cards/by-ids?${params.toString()}`); 
        if (!response.ok) {
          throw new Error('Failed to fetch child card details.');
        }
        const results: Card[] = await response.json();
        
        // Ensure the order from the original childIds array is preserved
        const cardMap = new Map(results.map(c => [c.id, c]));
        const orderedCards = childIds.map(id => cardMap.get(id)).filter((c): c is Card => !!c);

        setChildCards(orderedCards);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An unknown error occurred.');
      } finally {
        setIsLoading(false);
      }
    }

    fetchChildCards();
  }, [childIds]);

  return { childCards, isLoading, error };
} 