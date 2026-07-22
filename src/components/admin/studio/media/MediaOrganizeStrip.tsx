'use client';

import React from 'react';
import type { OrganizeSourceMode } from '@/lib/utils/mediaOrganizeUtils';
import styles from './mediaOrganizeStrip.module.css';

export type MediaOrganizeStripProps = {
  expanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
  sourceMode: OrganizeSourceMode;
  onSourceModeChange: (mode: OrganizeSourceMode) => void;
  storyPilesOverlay: boolean;
  onStoryPilesOverlayChange: (enabled: boolean) => void;
  tagSuggestionsOnPiles: boolean;
  onTagSuggestionsOnPilesChange: (enabled: boolean) => void;
  scopedMediaCount: number;
  scopeHint?: string;
  onBuildPiles: () => void | Promise<void>;
  onNewPile: () => void | Promise<void>;
  onCollapseAllPileSections?: () => void;
  onExpandAllPileSections?: () => void;
  showPileSectionControls?: boolean;
  buildingPiles: boolean;
  creatingPile: boolean;
};

export default function MediaOrganizeStrip({
  storyPilesOverlay,
  onStoryPilesOverlayChange,
  tagSuggestionsOnPiles,
  onTagSuggestionsOnPilesChange,
  scopedMediaCount,
  onBuildPiles,
  onNewPile,
  onCollapseAllPileSections,
  onExpandAllPileSections,
  showPileSectionControls = false,
  buildingPiles,
  creatingPile,
}: MediaOrganizeStripProps) {
  return (
    <section
      className={styles.organizeStrip}
      aria-label="Pile tools"
    >
      <div className={styles.organizeStripRow}>
        <span className={styles.organizeStripLabel}>Piles</span>
        <button
          type="button"
          className={styles.organizeActionButton}
          onClick={() => void onBuildPiles()}
          disabled={buildingPiles || scopedMediaCount === 0}
        >
          {buildingPiles ? 'Building…' : 'Build piles'}
        </button>
        <button
          type="button"
          className={styles.organizeActionButton}
          onClick={() => void onNewPile()}
          disabled={creatingPile}
        >
          {creatingPile ? 'Creating…' : '+ New pile'}
        </button>
        <label className={styles.organizeToggleLabel}>
          <input
            type="checkbox"
            checked={storyPilesOverlay}
            onChange={(event) => onStoryPilesOverlayChange(event.target.checked)}
          />
          <span>Show piles</span>
        </label>
        <label className={styles.organizeToggleLabel}>
          <input
            type="checkbox"
            checked={tagSuggestionsOnPiles}
            onChange={(event) => onTagSuggestionsOnPilesChange(event.target.checked)}
            disabled={!storyPilesOverlay}
          />
          <span>Show tag suggestions</span>
        </label>
        {showPileSectionControls && storyPilesOverlay ? (
          <>
            <button
              type="button"
              className={styles.organizeActionButton}
              onClick={onExpandAllPileSections}
            >
              Expand all
            </button>
            <button
              type="button"
              className={styles.organizeActionButton}
              onClick={onCollapseAllPileSections}
            >
              Collapse all
            </button>
          </>
        ) : null}
      </div>
    </section>
  );
}
