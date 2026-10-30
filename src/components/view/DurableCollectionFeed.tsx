'use client';

import { useMemo } from 'react';
import AdminFAB from '@/components/admin/studio/cards/AdminFAB';
import CollectionIntroduction, { hasCollectionIntroduction } from '@/components/view/CollectionIntroduction';
import V2ContentCard from '@/components/view/V2ContentCard';
import { buildDurableCollectionReaderSelection } from '@/lib/utils/durableCollectionReader';
import type { DurableCollectionStructure } from '@/lib/utils/durableCollectionReader';
import styles from './CardFeedV2.module.css';

export default function DurableCollectionFeed({
  structure,
  selectedPlacementId,
}: {
  structure: DurableCollectionStructure;
  selectedPlacementId?: string | null;
}) {
  const selection = useMemo(
    () => buildDurableCollectionReaderSelection(structure, selectedPlacementId),
    [selectedPlacementId, structure]
  );
  const introduction = selection.introductionCard;
  const showIntroduction = hasCollectionIntroduction(introduction);
  return (
    <div className={styles.page}>
      <main className={styles.feedMain}>
        <div className={`${styles.curatedContextBar} ${showIntroduction ? styles.curatedContextBarWithIntroduction : ''}`}>
          <p className={styles.curatedContextLabel}>Collection</p>
          {selection.breadcrumbs.length > 1 ? (
            <nav aria-label="Collection breadcrumb">
              <ol className={styles.curatedBreadcrumbs}>
                {selection.breadcrumbs.slice(0, -1).map((node) => (
                  <li key={node.placementId}>{node.card.title || node.card.subtitle || 'Untitled'}</li>
                ))}
              </ol>
            </nav>
          ) : null}
          <div className={styles.curatedContextTitleRow}>
            <h1 className={styles.curatedContextTitle}>{selection.title}</h1>
            <span className={styles.curatedContextCount}>
              {selection.entries.length} {selection.entries.length === 1 ? 'card' : 'cards'}
            </span>
          </div>
          {introduction && showIntroduction ? <CollectionIntroduction card={introduction} /> : null}
        </div>
        {selection.entries.length ? (
          <div className={`${styles.grid} ${styles.guidedGrid}`} data-feed-virtualization="css-containment">
            {selection.entries.map(({ placementId, card }) => (
              <V2ContentCard key={placementId} card={card} size="medium" />
            ))}
          </div>
        ) : (
          <div className={styles.emptyFeed}>
            <p className={styles.emptyFeedTitle}>No cards are placed in this part of the Collection.</p>
          </div>
        )}
      </main>
      <AdminFAB />
    </div>
  );
}
