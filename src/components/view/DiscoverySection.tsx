'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/lib/types/card';
import V2ContentCard from './V2ContentCard';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { useCardContext } from '@/components/providers/CardProvider';
import styles from './DiscoverySection.module.css';

interface DiscoverySectionProps {
  currentCard: Card;
  childrenCards: Card[];
}

export default function DiscoverySection({ currentCard, childrenCards }: DiscoverySectionProps) {
  const { cardType } = useCardContext();
  const [filtered, setFiltered] = useState<Card[]>([]);
  const [random, setRandom] = useState<Card[]>([]);
  const [extrasLoading, setExtrasLoading] = useState(true);
  const [extrasError, setExtrasError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const fetchExtras = async () => {
      setExtrasLoading(true);
      setExtrasError(null);
      setFiltered([]);
      setRandom([]);

      try {
        const excludeIds = [currentCard.docId, ...childrenCards.map(c => c.docId)];

        const filteredParams = new URLSearchParams({
          count: '3',
          exclude: excludeIds.join(','),
        });
        if (cardType && cardType !== 'all') {
          filteredParams.set('type', cardType);
        }
        if (currentCard.who && currentCard.who.length > 0) {
          filteredParams.set('who', currentCard.who.join(','));
        }
        if (currentCard.what && currentCard.what.length > 0) {
          filteredParams.set('what', currentCard.what.join(','));
        }
        if (currentCard.when && currentCard.when.length > 0) {
          filteredParams.set('when', currentCard.when.join(','));
        }
        if (currentCard.where && currentCard.where.length > 0) {
          filteredParams.set('where', currentCard.where.join(','));
        }

        const randomParams = new URLSearchParams({
          count: '3',
          exclude: excludeIds.join(','),
        });
        if (cardType && cardType !== 'all') {
          randomParams.set('type', cardType);
        }

        const [filteredResponse, randomResponse] = await Promise.all([
          fetch(`/api/cards/random?${filteredParams.toString()}`),
          fetch(`/api/cards/random?${randomParams.toString()}`),
        ]);

        if (!filteredResponse.ok) {
          const errorText = await filteredResponse.text();
          console.error('Filtered cards API error:', filteredResponse.status, errorText);
          throw new Error(`Filtered cards API failed: ${filteredResponse.status}`);
        }

        if (!randomResponse.ok) {
          const errorText = await randomResponse.text();
          console.error('Random cards API error:', randomResponse.status, errorText);
          throw new Error(`Random cards API failed: ${randomResponse.status}`);
        }

        const [filteredCards, randomCards] = await Promise.all([
          filteredResponse.json(),
          randomResponse.json(),
        ]);

        if (!cancelled) {
          setFiltered(filteredCards);
          setRandom(randomCards);
        }
      } catch (err) {
        console.error('Error fetching discovery data:', err);
        if (!cancelled) {
          setExtrasError(err instanceof Error ? err.message : 'Failed to load related content');
        }
      } finally {
        if (!cancelled) {
          setExtrasLoading(false);
        }
      }
    };

    fetchExtras();
    return () => {
      cancelled = true;
    };
  }, [currentCard, childrenCards, cardType]);

  const hasChildren = childrenCards.length > 0;
  const hasFiltered = filtered.length > 0;
  const hasRandom = random.length > 0;

  if (!hasChildren && !extrasLoading && !hasFiltered && !hasRandom && !extrasError) {
    return null;
  }

  if (!hasChildren && extrasLoading) {
    return (
      <section className={styles.discoverySection}>
        <h2 className={styles.discoveryTitle}>Discover More</h2>
        <div className={styles.loadingContainer}>
          <LoadingSpinner />
          <p>Loading related content...</p>
        </div>
      </section>
    );
  }

  if (!hasChildren && extrasError && !hasFiltered && !hasRandom) {
    return (
      <section className={styles.discoverySection}>
        <h2 className={styles.discoveryTitle}>Discover More</h2>
        <div className={styles.errorContainer}>
          <p>Unable to load related content: {extrasError}</p>
        </div>
      </section>
    );
  }

  return (
    <section className={styles.discoverySection}>
      <h2 className={styles.discoveryTitle}>Discover More</h2>

      {hasChildren && (
        <div className={styles.discoveryGroup}>
          <h3 className={styles.groupTitle}>Related Content</h3>
          <div className={styles.cardGrid}>
            {childrenCards.map(card => (
              <V2ContentCard key={card.docId} card={card} size="medium" />
            ))}
          </div>
        </div>
      )}

      {extrasError && hasChildren && (
        <div className={styles.errorContainer} role="alert">
          <p>Unable to load suggestions (similar / explore): {extrasError}</p>
        </div>
      )}

      {(extrasLoading || hasFiltered) && (
        <div className={styles.discoveryGroup}>
          <h3 className={styles.groupTitle}>Similar Topics</h3>
          {extrasLoading && !hasFiltered ? (
            <div className={styles.extrasLoadingRow}>
              <LoadingSpinner />
              <span>Loading similar topics…</span>
            </div>
          ) : hasFiltered ? (
            <div className={styles.cardGrid}>
              {filtered.map(card => (
                <V2ContentCard key={card.docId} card={card} size="medium" />
              ))}
            </div>
          ) : null}
        </div>
      )}

      {(extrasLoading || hasRandom) && (
        <div className={styles.discoveryGroup}>
          <h3 className={`${styles.groupTitle} ${styles.exploreGroupTitle}`}>Explore More</h3>
          {extrasLoading && !hasRandom ? (
            <div className={styles.extrasLoadingRow}>
              <LoadingSpinner />
              <span>Loading explore suggestions…</span>
            </div>
          ) : hasRandom ? (
            <div className={styles.cardGrid}>
              {random.map(card => (
                <V2ContentCard key={card.docId} card={card} size="medium" />
              ))}
            </div>
          ) : null}
        </div>
      )}
    </section>
  );
}
