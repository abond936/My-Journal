'use client';

import React from 'react';
import Link from 'next/link';
import { Card } from '@/lib/types/card';
import styles from './CollectionsList.module.css';

interface CollectionsListClientPageProps {
  collections: Card[];
}

export default function CollectionsListClientPage({ collections }: CollectionsListClientPageProps) {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1>My Stories</h1>
      </header>
      <main className={styles.grid}>
        {collections.map(card => (
          <Link key={card.id} href={`/collections/${card.id}`} className={styles.cardLink}>
            <div className={styles.card}>
              {card.coverImage && (
                <img
                  src={card.coverImage.url}
                  alt={card.title}
                  className={styles.cardImage}
                />
              )}
              <div className={styles.cardOverlay}>
                <h2 className={styles.cardTitle}>{card.title}</h2>
                {card.subtitle && <p className={styles.cardSubtitle}>{card.subtitle}</p>}
              </div>
            </div>
          </Link>
        ))}
      </main>
    </div>
  );
} 