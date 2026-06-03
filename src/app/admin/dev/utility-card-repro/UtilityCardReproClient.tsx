'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { Card } from '@/lib/types/card';
import V2ContentCard from '@/components/view/V2ContentCard';
import feedStyles from '@/components/view/CardFeedV2.module.css';
import styles from './page.module.css';

type UtilityMeasurement = {
  cardHeight: number | null;
  shellHeight: number | null;
};

type UtilityCardReproClientProps = {
  questionCard: Card | null;
  quoteCards: Card[];
  calloutCards: Card[];
};

function roundHeight(value: number | null): number | null {
  if (value == null) return null;
  return Math.round(value * 100) / 100;
}

function buildReproCards(
  questionCard: Card | null,
  quoteCards: Card[],
  calloutCards: Card[]
): Card[] {
  const merged = [
    ...(questionCard ? [questionCard] : []),
    ...quoteCards,
    ...calloutCards,
  ];
  const seen = new Set<string>();

  return merged.filter((card) => {
    if (!card.docId || seen.has(card.docId)) return false;
    seen.add(card.docId);
    return true;
  });
}

export default function UtilityCardReproClient({
  questionCard,
  quoteCards,
  calloutCards,
}: UtilityCardReproClientProps) {
  const cards = useMemo(
    () => buildReproCards(questionCard, quoteCards, calloutCards),
    [calloutCards, questionCard, quoteCards]
  );
  const mountRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [measurements, setMeasurements] = useState<Record<string, UtilityMeasurement>>({});

  useEffect(() => {
    if (cards.length === 0) return;

    const updateMeasurements = () => {
      const nextMeasurements = cards.reduce<Record<string, UtilityMeasurement>>((acc, card) => {
        const mount = card.docId ? mountRefs.current[card.docId] : null;
        const shell = mount?.firstElementChild instanceof HTMLElement ? mount.firstElementChild : null;
        const renderedCard = mount?.querySelector('[data-card-id]') as HTMLElement | null;

        acc[card.docId] = {
          shellHeight: roundHeight(shell?.getBoundingClientRect().height ?? null),
          cardHeight: roundHeight(renderedCard?.getBoundingClientRect().height ?? null),
        };
        return acc;
      }, {});

      setMeasurements(nextMeasurements);
    };

    const frame = window.requestAnimationFrame(() => {
      window.requestAnimationFrame(updateMeasurements);
    });
    const resizeObserver = new ResizeObserver(updateMeasurements);

    cards.forEach((card) => {
      const mount = card.docId ? mountRefs.current[card.docId] : null;
      if (mount) resizeObserver.observe(mount);
    });

    window.addEventListener('resize', updateMeasurements);

    return () => {
      window.cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      window.removeEventListener('resize', updateMeasurements);
    };
  }, [cards]);

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Utility Card Repro</h1>
        <p className={styles.description}>
          This page renders one no-cover question baseline plus the live quote and callout cards with the
          actual Reader tile component. Heights below report the admin shell and the rendered card inside it.
        </p>
      </div>

      <div className={styles.summary}>
        <p>Question baseline: {questionCard ? `${questionCard.title || 'Untitled'} (${questionCard.docId})` : 'missing'}</p>
        <p>Quotes loaded: {quoteCards.length}</p>
        <p>Callouts loaded: {calloutCards.length}</p>
      </div>

      <div className={`${feedStyles.grid} ${styles.reproGrid}`}>
        {cards.map((card) => {
          const measurement = measurements[card.docId] ?? { shellHeight: null, cardHeight: null };

          return (
            <section key={card.docId} className={styles.reproCell}>
              <div className={styles.cardMeta}>
                <p className={styles.cardType}>{card.type}</p>
                <p className={styles.cardId}>{card.docId}</p>
                <p className={styles.cardMeasure}>
                  shell: {measurement.shellHeight ?? '...'}px
                  {' · '}
                  card: {measurement.cardHeight ?? '...'}px
                </p>
              </div>
              <div
                ref={(node) => {
                  mountRefs.current[card.docId] = node;
                }}
                className={styles.cardMount}
              >
                <V2ContentCard card={card} size="medium" />
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
