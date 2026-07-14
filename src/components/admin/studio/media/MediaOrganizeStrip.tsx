'use client';

import React from 'react';
import type { OrganizeSourceMode } from '@/lib/utils/mediaOrganizeUtils';
import styles from './mediaOrganizeStrip.module.css';

const SOURCE_OPTIONS: { value: OrganizeSourceMode; label: string }[] = [
  { value: 'raw', label: 'Raw' },
  { value: 'foldered', label: 'Foldered' },
  { value: 'phone', label: 'Phone' },
];

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
  expanded,
  onExpandedChange,
  sourceMode,
  onSourceModeChange,
  storyPilesOverlay,
  onStoryPilesOverlayChange,
  tagSuggestionsOnPiles,
  onTagSuggestionsOnPilesChange,
  scopedMediaCount,
  scopeHint,
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
      className={`${styles.organizeStrip} ${expanded ? '' : styles.organizeStripCollapsed}`}
      aria-label="Organize imported media"
    >
      <div className={styles.organizeStripHeader}>
        <div>
          <h3 className={styles.organizeStripTitle}>Organize</h3>
          <span className={styles.organizeStripMeta}>
            {scopedMediaCount} photo{scopedMediaCount === 1 ? '' : 's'}
            {scopeHint ? ` · ${scopeHint}` : ''}
          </span>
        </div>
        <button
          type="button"
          className={styles.organizeStripToggle}
          onClick={() => onExpandedChange(!expanded)}
          aria-expanded={expanded}
        >
          {expanded ? 'Collapse' : 'Expand'}
        </button>
      </div>

      {expanded ? (
        <div className={styles.organizeStripBody}>
          <div className={styles.organizeStripRow}>
            <span className={styles.organizeStripLabel}>Source</span>
            <div className={styles.sourceToggle} role="group" aria-label="Pile source mode">
              {SOURCE_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={`${styles.sourceToggleButton} ${
                    sourceMode === option.value ? styles.sourceToggleButtonActive : ''
                  }`}
                  onClick={() => onSourceModeChange(option.value)}
                  aria-pressed={sourceMode === option.value}
                >
                  {option.label}
                </button>
              ))}
            </div>
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
          </div>

          <div className={styles.organizeStripRow}>
            <label className={styles.organizeToggleLabel}>
              <input
                type="checkbox"
                checked={storyPilesOverlay}
                onChange={(event) => onStoryPilesOverlayChange(event.target.checked)}
              />
              <span>Story piles overlay</span>
            </label>
            <label className={styles.organizeToggleLabel}>
              <input
                type="checkbox"
                checked={tagSuggestionsOnPiles}
                onChange={(event) => onTagSuggestionsOnPilesChange(event.target.checked)}
                disabled={!storyPilesOverlay}
              />
              <span>Tag suggestions on piles</span>
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
        </div>
      ) : null}
    </section>
  );
}
