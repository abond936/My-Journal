'use client';

import React from 'react';
import MediaAdminGrid from '@/components/admin/studio/media/MediaAdminGrid';
import type { MediaStack } from '@/lib/types/mediaStack';
import type { Media } from '@/lib/types/photo';
import type { AdminDimensionFilterState, AdminTagFilterScope } from '@/lib/preferences/adminFilters';
import type { MediaBrowseGroup } from '@/lib/utils/mediaBrowseUtils';
import styles from './mediaBrowseGroupedView.module.css';

export type MediaStackGridProps = {
  stackById: Map<string, MediaStack>;
  showAllStacks: boolean;
  expandedStackIds: Set<string>;
  onToggleStackExpand: (stackId: string) => void;
  onDissolveStack: (stackId: string) => void;
};

type MediaBrowseGroupedViewProps = {
  groups: MediaBrowseGroup[];
  sourcePathFirst: boolean;
  dimensionFilters: AdminDimensionFilterState;
  tagFilterScope: AdminTagFilterScope;
  studioSourceDraggable?: boolean;
  inlineCaptionEditing?: boolean;
  clientSort: 'none' | 'filenameAsc' | 'filenameDesc';
  highlightedMediaIds: string[];
  onVisibleHighlightedCountChange?: (count: number) => void;
  gridTileMinPx: number;
  resolveMediaById: (id: string) => Media | undefined;
  allLoadedMedia: Media[];
} & MediaStackGridProps;

export default function MediaBrowseGroupedView(props: MediaBrowseGroupedViewProps) {
  const {
    groups,
    sourcePathFirst,
    dimensionFilters,
    tagFilterScope,
    studioSourceDraggable,
    inlineCaptionEditing,
    clientSort,
    highlightedMediaIds,
    onVisibleHighlightedCountChange,
    gridTileMinPx,
    resolveMediaById,
    allLoadedMedia,
    stackById,
    showAllStacks,
    expandedStackIds,
    onToggleStackExpand,
    onDissolveStack,
  } = props;

  const mediaById = new Map(allLoadedMedia.map((item) => [item.docId, item]));

  return (
    <div className={styles.container} style={{ ['--media-grid-min-col' as string]: `${gridTileMinPx}px` }}>
      {groups.map((group) => {
        const members = group.memberMediaIds
          .map((id) => resolveMediaById(id) ?? mediaById.get(id))
          .filter((item): item is NonNullable<typeof item> => Boolean(item?.docId));
        if (members.length === 0) return null;
        return (
          <section key={group.id} className={styles.groupSection}>
            <header className={styles.groupHeader}>
              <div className={styles.groupTitleBlock}>
                <h3 className={styles.groupTitle}>{group.title}</h3>
                {group.subtitle ? <p className={styles.groupSubtitle}>{group.subtitle}</p> : null}
              </div>
              <span className={styles.groupCount}>
                {members.length} item{members.length === 1 ? '' : 's'}
                {group.oversized ? ' · large group' : ''}
              </span>
            </header>
            <MediaAdminGrid
              mediaOverride={members}
              sourcePathFirst={sourcePathFirst}
              dimensionFilters={dimensionFilters}
              tagFilterScope={tagFilterScope}
              studioSourceDraggable={studioSourceDraggable}
              inlineCaptionEditing={inlineCaptionEditing}
              clientSort={clientSort}
              highlightedMediaIds={highlightedMediaIds}
              onVisibleHighlightedCountChange={onVisibleHighlightedCountChange}
              gridTileMinPx={gridTileMinPx}
              emptyMessage="No media in this group."
              stackById={stackById}
              showAllStacks={showAllStacks}
              expandedStackIds={expandedStackIds}
              onToggleStackExpand={onToggleStackExpand}
              onDissolveStack={onDissolveStack}
            />
          </section>
        );
      })}
    </div>
  );
}
