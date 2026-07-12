'use client';

import { useState, useEffect, useRef } from 'react';
import { Card } from '@/lib/types/card';

/** Stable key for child-id set membership (order-independent). */
export function childIdsMembershipKey(childIds: string[]): string {
  return [...childIds].sort().join('\0');
}

/** Reorder already-fetched child cards to match `childIds` without a network round-trip. */
export function reorderCachedChildCards(childIds: string[], cardMap: Map<string, Card>): Card[] | null {
  const ordered = childIds.map((id) => cardMap.get(id)).filter((c): c is Card => !!c);
  if (ordered.length !== childIds.length) return null;
  return ordered;
}

export function useChildCards(childIds: string[]) {
  const [childCards, setChildCards] = useState<Card[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cardsByIdRef = useRef<Map<string, Card>>(new Map());
  const lastMembershipKeyRef = useRef<string>('');

  useEffect(() => {
    async function fetchChildCards() {
      if (!childIds || childIds.length === 0) {
        setChildCards([]);
        cardsByIdRef.current = new Map();
        lastMembershipKeyRef.current = '';
        return;
      }

      const membershipKey = childIdsMembershipKey(childIds);
      if (membershipKey === lastMembershipKeyRef.current && cardsByIdRef.current.size > 0) {
        const reordered = reorderCachedChildCards(childIds, cardsByIdRef.current);
        if (reordered) {
          setChildCards(reordered);
          return;
        }
      }

      setIsLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        childIds.forEach((id) => params.append('id', id));
        const response = await fetch(`/api/cards/by-ids?${params.toString()}`);
        if (!response.ok) {
          throw new Error('Failed to fetch child card details.');
        }
        const results: Card[] = await response.json();

        const cardMap = new Map(results.map((c) => [c.docId, c]));
        cardsByIdRef.current = cardMap;
        lastMembershipKeyRef.current = membershipKey;
        const orderedCards = reorderCachedChildCards(childIds, cardMap) ?? [];
        setChildCards(orderedCards);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An unknown error occurred.');
      } finally {
        setIsLoading(false);
      }
    }

    void fetchChildCards();
  }, [childIds]);

  return { childCards, isLoading, error };
}
