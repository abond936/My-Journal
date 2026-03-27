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

interface DiscoveryData {
  children: Card[];
  filtered: Card[];
  random: Card[];
}

export default function DiscoverySection({ currentCard, childrenCards }: DiscoverySectionProps) {
  const { cardType } = useCardContext();
  const [discoveryData, setDiscoveryData] = useState<DiscoveryData>({
    children: childrenCards,
    filtered: [],
    random: []
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDiscoveryData = async () => {
      setLoading(true);
      setError(null);

      try {
        const excludeIds = [currentCard.docId, ...childrenCards.map(c => c.docId)];

        // Fetch filtered cards (same tags as current card)
        const filteredParams = new URLSearchParams({
          count: '3',
          exclude: excludeIds.join(',')
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
        if (currentCard.reflection && currentCard.reflection.length > 0) {
          filteredParams.set('reflection', currentCard.reflection.join(','));
        }

        // Fetch random cards (different tags, same card type filter)
        const randomParams = new URLSearchParams({
          count: '3',
          exclude: excludeIds.join(',')
        });
        if (cardType && cardType !== 'all') {
          randomParams.set('type', cardType);
        }

        // Make parallel requests
        const [filteredResponse, randomResponse] = await Promise.all([
          fetch(`/api/cards/random?${filteredParams.toString()}`),
          fetch(`/api/cards/random?${randomParams.toString()}`)
        ]);

        // Check responses individually for better error handling
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
          randomResponse.json()
        ]);

        setDiscoveryData({
          children: childrenCards,
          filtered: filteredCards,
          random: randomCards
        });

      } catch (err) {
        console.error('Error fetching discovery data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load discovery data');
      } finally {
        setLoading(false);
      }
    };

    fetchDiscoveryData();
  }, [currentCard, childrenCards, cardType]);

  if (loading) {
    return (
      <section className={styles.discoverySection}>
        <div className={styles.loadingContainer}>
          <LoadingSpinner />
          <p>Loading related content...</p>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className={styles.discoverySection}>
        <div className={styles.errorContainer}>
          <p>Unable to load related content: {error}</p>
        </div>
      </section>
    );
  }

  // Check if we have any content to show
  const hasChildren = discoveryData.children.length > 0;
  const hasFiltered = discoveryData.filtered.length > 0;
  const hasRandom = discoveryData.random.length > 0;

  if (!hasChildren && !hasFiltered && !hasRandom) {
    return null; // Don't show empty discovery section
  }

  return (
    <section className={styles.discoverySection}>
      <h2 className={styles.discoveryTitle}>Discover More</h2>
      
      {hasChildren && (
        <div className={styles.discoveryGroup}>
          <h3 className={styles.groupTitle}>Related Content</h3>
          <div className={styles.cardGrid}>
            {discoveryData.children.map(card => (
              <V2ContentCard
                key={card.docId}
                card={card}
                size="medium"
              />
            ))}
          </div>
        </div>
      )}

      {hasFiltered && (
        <div className={styles.discoveryGroup}>
          <h3 className={styles.groupTitle}>Similar Topics</h3>
          <div className={styles.cardGrid}>
            {discoveryData.filtered.map(card => (
              <V2ContentCard
                key={card.docId}
                card={card}
                size="medium"
              />
            ))}
          </div>
        </div>
      )}

      {hasRandom && (
        <div className={styles.discoveryGroup}>
          <h3 className={`${styles.groupTitle} ${styles.exploreGroupTitle}`}>Explore More</h3>
          <div className={styles.cardGrid}>
            {discoveryData.random.map(card => (
              <V2ContentCard
                key={card.docId}
                card={card}
                size="medium"
              />
            ))}
          </div>
        </div>
      )}
    </section>
  );
} 