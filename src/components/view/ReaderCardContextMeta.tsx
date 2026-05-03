'use client';

import React from 'react';
import type { ReaderCardContextChip } from '@/lib/utils/readerCardContext';
import styles from './ReaderCardContextMeta.module.css';

interface ReaderCardContextMetaProps {
  badgeLabel?: string | null;
  chips: ReaderCardContextChip[];
  variant: 'overlay' | 'inline' | 'detail';
}

export default function ReaderCardContextMeta({
  badgeLabel,
  chips,
  variant,
}: ReaderCardContextMetaProps) {
  if (!badgeLabel && chips.length === 0) return null;

  return (
    <div className={`${styles.root} ${styles[variant]}`}>
      <div className={styles.chips}>
        {badgeLabel ? <span className={styles.badge}>{badgeLabel}</span> : null}
        {chips.map((chip) => (
          <span key={`${chip.dimension}:${chip.label}`} className={styles.chip} data-dimension={chip.dimension}>
            {chip.label}
          </span>
        ))}
      </div>
    </div>
  );
}
