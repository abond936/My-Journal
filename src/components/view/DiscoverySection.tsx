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
        const sharedDimensions = {
          who: currentCard.who || [],
          what: currentCard.what || [],
          when: currentCard.when || [],
          where: currentCard.where || [],
        };

        const filteredParams = new URLSearchParams({
          count: '3',
          exclude: excludeIds.join(','),
        });
        if (cardType && cardType !== 'all') {
          filteredParams.set('type', cardType);
        }
        if (sharedDimensions.who.length > 0) {
          filteredParams.set('who', sharedDimensions.who.join(','));
        }
        if (sharedDimensions.what.length > 0) {
          filteredParams.set('what', sharedDimensions.what.join(','));
        }
        if (sharedDimensions.when.length > 0) {
          filteredParams.set('when', sharedDimensions.when.join(','));
        }
        if (sharedDimensions.where.length > 0) {
          filteredParams.set('where', sharedDimensions.where.join(','));
        }

        const randomParams = new URLSearchParams({
          count: '3',
          exclude: excludeIds.join(','),
          excludeDimensionalMatches: 'true',
        });
        if (cardType && cardType !== 'all') {
          randomParams.set('type', cardType);
        }
        if (sharedDimensions.who.length > 0) {
          randomParams.set('who', sharedDimensions.who.join(','));
        }
        if (sharedDimensions.what.length > 0) {
          randomParams.set('what', sharedDimensions.what.join(','));
        }
        if (sharedDimensions.when.length > 0) {
          randomParams.set('when', sharedDimensions.when.join(','));
        }
        if (sharedDimensions.where.length > 0) {
          randomParams.set('where', sharedDimensions.where.join(','));
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

  const detailReturnTo =
    currentCard.docId != null && currentCard.docId !== ''
      ? `/view/${currentCard.docId}`
      : '/view';

  const hasChildren = childrenCards.length > 0;
  const hasFiltered = filtered.length > 0;
  const hasRandom = random.length > 0;

  if (!hasChildren && !extrasLoading && !hasFiltered && !hasRandom && !extrasError) {
    return null;
  }

  if (!hasChildren && extrasLoading) {
    return (
      <section className={styles.discoverySection}>
        <h2 className={styles.discoveryTitle}>Explore More</h2>
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
        <h2 className={styles.discoveryTitle}>Explore More</h2>
        <div className={styles.errorContainer}>
          <p>Unable to load related content: {extrasError}</p>
        </div>
      </section>
    );
  }

  return (
    <section className={styles.discoverySection}>
      <h2 className={styles.discoveryTitle}>Explore More</h2>

      {hasChildren && (
        <div className={styles.discoveryGroup}>
          <h3 className={styles.groupTitle}>Related Content</h3>
          <div className={styles.cardRail} role="list" aria-label="Related content">
            {childrenCards.map(card => (
              <div key={card.docId} className={styles.cardRailCell} role="listitem">
                <V2ContentCard
                  card={card}
                  size="small"
                  fullWidth
                  adminEditReturnTo={detailReturnTo}
                />
              </div>
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
          <h3 className={styles.groupTitle}>Related</h3>
          {extrasLoading && !hasFiltered ? (
            <div className={styles.extrasLoadingRow}>
              <LoadingSpinner />
              <span>Loading related cards…</span>
            </div>
          ) : hasFiltered ? (
            <div className={styles.cardRail} role="list" aria-label="Related cards">
              {filtered.map(card => (
                <div key={card.docId} className={styles.cardRailCell} role="listitem">
                  <V2ContentCard
                    card={card}
                    size="small"
                    fullWidth
                    adminEditReturnTo={detailReturnTo}
                  />
                </div>
              ))}
            </div>
          ) : null}
        </div>
      )}

      {(extrasLoading || hasRandom) && (
        <div className={styles.discoveryGroup}>
          <h3 className={`${styles.groupTitle} ${styles.exploreGroupTitle}`}>Random</h3>
          {extrasLoading && !hasRandom ? (
            <div className={styles.extrasLoadingRow}>
              <LoadingSpinner />
              <span>Loading random cards…</span>
            </div>
          ) : hasRandom ? (
            <div className={styles.cardRail} role="list" aria-label="Random cards">
              {random.map(card => (
                <div key={card.docId} className={styles.cardRailCell} role="listitem">
                  <V2ContentCard
                    card={card}
                    size="small"
                    fullWidth
                    adminEditReturnTo={detailReturnTo}
                  />
                </div>
              ))}
            </div>
          ) : null}
        </div>
      )}
    </section>
  );
}
