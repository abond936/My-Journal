'use client';

import React from 'react';
import { Card } from '@/lib/types/card';
import styles from './FeedTileMetaBand.module.css';

interface FeedTileMetaBandProps {
  card: Card;
  titleClassName: string;
  typeBadgeInline?: React.ReactNode;
}

/** Closed feed title band (square tiles): title only; chips live in `FeedTileChipStrip`. */
export default function FeedTileMetaBand({
  card,
  titleClassName,
  typeBadgeInline,
}: FeedTileMetaBandProps) {
  return (
    <div className={styles.feedTileMetaBand}>
      {typeBadgeInline}
      <h3 className={titleClassName}>{card.title}</h3>
    </div>
  );
}
