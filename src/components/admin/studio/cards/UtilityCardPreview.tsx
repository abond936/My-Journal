'use client';

import React from 'react';
import JournalImage from '@/components/common/JournalImage';
import TipTapRenderer from '@/components/common/TipTapRenderer';
import type { Card } from '@/lib/types/card';
import styles from './UtilityCardPreview.module.css';

type UtilityCardPreviewProps = {
  card: Card;
};

export default function UtilityCardPreview({ card }: UtilityCardPreviewProps) {
  if (card.type === 'callout') {
    const titleText = card.title?.trim() ?? '';
    const showBody = Boolean(card.content?.trim());

    return (
      <div className={`${styles.surface} ${styles.callout}`}>
        <div className={styles.calloutPinOverlay} aria-hidden>
          <JournalImage
            src="/images/pushpin.svg"
            alt=""
            width={458}
            height={443}
            className={styles.calloutPinWatermark}
            priority={false}
          />
        </div>
        <div className={styles.content}>
          {titleText ? <h3 className={styles.calloutTitle}>{titleText}</h3> : null}
          {showBody ? (
            <div className={styles.calloutBody}>
              <TipTapRenderer content={card.content} surface="transparent" headingVariant="callout" />
            </div>
          ) : null}
        </div>
      </div>
    );
  }

  if (card.type === 'quote') {
    return (
      <div className={`${styles.surface} ${styles.quote}`}>
        <div className={styles.content}>
          <div className={styles.quoteTextBlock}>
            <h3 className={styles.quoteHeadline}>{card.title || 'Untitled'}</h3>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`${styles.surface} ${styles.question}`}>
      <div className={styles.content}>
        <div className={styles.questionTextBlock}>
          <h3 className={styles.questionHeadline}>{card.title || 'Untitled'}</h3>
        </div>
      </div>
    </div>
  );
}
