'use client';

import React, { useCallback, useMemo, useRef } from 'react';
import { applyModifierSelection } from '@/lib/utils/adminListSelection';
import { useDraggable } from '@dnd-kit/core';
import { CSS as DndCss } from '@dnd-kit/utilities';
import JournalImage from '@/components/common/JournalImage';
import { Media } from '@/lib/types/photo';
import DimensionalTagVerticalChips from '@/components/admin/common/DimensionalTagVerticalChips';
import CardDimensionalTagCommandBar from '@/components/admin/common/CardDimensionalTagCommandBar';
import type { MediaAdminRowStudioDragBind } from '@/components/admin/media-admin/MediaAdminRow';
import { useMedia } from '@/components/providers/MediaProvider';
import { useTag } from '@/components/providers/TagProvider';
import { getDisplayUrl } from '@/lib/utils/photoUtils';
import { formatCoreTagsTooltipLines, getCoreTagsByDimension } from '@/lib/utils/tagDisplay';
import styles from './MediaAdminGrid.module.css';
import AdminGridCellChrome from '@/components/admin/common/AdminGridCellChrome';
import chromeStyles from '@/components/admin/common/AdminGridCellChrome.module.css';
import { adminChromeSelector, ADMIN_GRID_CHROME } from '@/components/admin/common/adminGridChromeAttr';
import { eventTargetToElement } from '@/lib/utils/domEventTarget';

export interface MediaAdminGridCellProps {
  media: Media;
  mediaIndex: number;
  tagNameMap: Map<string, string>;
  allTags: ReturnType<typeof useTag>['tags'];
  onSaveTags: (mediaId: string, nextTags: string[]) => Promise<void>;
  isSelected: boolean;
  onSelectionCheckboxClick: (e: React.MouseEvent | React.KeyboardEvent, mediaId: string, mediaIndex: number) => void;
  /** When set (Admin Studio grid + `DndContext`), cell is `source:{mediaId}` for cover/gallery drops. */
  studioDragBind?: MediaAdminRowStudioDragBind;
}
type DimensionKey = 'who' | 'what' | 'when' | 'where';
type DimensionFilterMode = 'any' | 'hasAny' | 'isEmpty' | 'matches';
type DimensionFilters = Record<
  DimensionKey,
  {
    mode: DimensionFilterMode;
    tagId: string;
  }
>;

function isMediaGridChromeInteractiveTarget(target: EventTarget | null): boolean {
  const t = eventTargetToElement(target);
  if (!t) return false;
  return Boolean(
    t.closest(adminChromeSelector(ADMIN_GRID_CHROME.overlayTopStart)) ||
      t.closest(adminChromeSelector(ADMIN_GRID_CHROME.overlayTopEnd)) ||
      t.closest(adminChromeSelector(ADMIN_GRID_CHROME.tagRail)) ||
      t.closest(adminChromeSelector(ADMIN_GRID_CHROME.tagSearchFoot)) ||
      t.closest(adminChromeSelector(ADMIN_GRID_CHROME.footerActions))
  );
}

function MediaAdminGridCell({
  media,
  mediaIndex,
  tagNameMap,
  allTags,
  onSaveTags,
  isSelected,
  onSelectionCheckboxClick,
  studioDragBind,
}: MediaAdminGridCellProps) {
  const core = useMemo(() => getCoreTagsByDimension(media), [media]);
  const [saveNotice, setSaveNotice] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!saveNotice) return;
    const id = window.setTimeout(() => setSaveNotice(null), 2500);
    return () => window.clearTimeout(id);
  }, [saveNotice]);

  const handleTagUpdate = useCallback(
    async (nextTagIds: string[]) => {
      await onSaveTags(media.docId!, nextTagIds);
      setSaveNotice('Tags saved');
    },
    [media.docId, onSaveTags]
  );

  const handleSelectionClick = useCallback(
    (e: React.MouseEvent | React.KeyboardEvent) => {
      onSelectionCheckboxClick(e, media.docId, mediaIndex);
    },
    [media.docId, mediaIndex, onSelectionCheckboxClick]
  );

  const onCellClick = (e: React.MouseEvent) => {
    if (isMediaGridChromeInteractiveTarget(e.target)) return;
    const t = eventTargetToElement(e.target);
    if (t?.closest('button')) return;
    handleSelectionClick(e);
  };
  const onCellKeyDown = (e: React.KeyboardEvent) => {
    const t = eventTargetToElement(e.target);
    if (t?.closest('input, textarea, button, [role="listbox"]')) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleSelectionClick(e);
    }
  };

  const aspectStyle: React.CSSProperties =
    { aspectRatio: '4 / 3' };

  const displayTitle = media.caption?.trim() || '';

  const identityTooltip = `File: ${media.filename}\nID: ${media.docId}\nSource: ${media.sourcePath || '—'}`;
  const thumbnailTooltip = useMemo(() => {
    const tagLines = formatCoreTagsTooltipLines(core, (id) => tagNameMap.get(id) ?? id);
    return `${identityTooltip}\n\n${tagLines}`;
  }, [identityTooltip, core, tagNameMap]);

  const assigned = (media.referencedByCardIds?.length ?? 0) > 0;
  const studioRootExtras = studioDragBind
    ? {
        ref: studioDragBind.setNodeRef,
        style: studioDragBind.style,
        className: `${styles.cellStudioSource} ${styles.cellClickSurface}`,
      }
    : {};

  const gridCell = (
    <AdminGridCellChrome
      selected={isSelected}
      rootProps={{
        ...studioRootExtras,
        role: 'button',
        tabIndex: 0,
        title: thumbnailTooltip,
        onClick: onCellClick,
        onKeyDown: onCellKeyDown,
      }}
      overlayTopStart={
        <div onClick={(e) => e.stopPropagation()}>
          <input
            type="checkbox"
            readOnly
            checked={isSelected}
            onClick={(e) => handleSelectionClick(e)}
            onKeyDown={(e) => {
              if (e.key === ' ' || e.key === 'Enter') {
                e.preventDefault();
                e.stopPropagation();
                handleSelectionClick(e);
              }
            }}
            aria-label={`Select ${media.filename}`}
            className={chromeStyles.checkbox}
          />
        </div>
      }
      overlayTopEnd={
        studioDragBind ? (
          <div onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              ref={studioDragBind.setActivatorNodeRef}
              className={chromeStyles.studioSourceDragHandle}
              aria-label={`Drag ${media.filename} to selected card cover or gallery`}
              title="Drag to Cover or Gallery (Studio Card edit)"
              data-studio-dnd-return-focus={media.docId ? `source:${media.docId}` : undefined}
              onClick={(e) => e.stopPropagation()}
              {...studioDragBind.attributes}
              {...studioDragBind.listeners}
            >
              ⋮⋮
            </button>
          </div>
        ) : null
      }
      overlayLeftRail={undefined}
      overlayBottom={
        <div className={styles.overlayBottomRow}>
          <div className={styles.overlayBottomStart}>
            <span className={chromeStyles.metaBadgeMuted}>{media.source}</span>
            <span className={assigned ? chromeStyles.metaBadgeAssigned : chromeStyles.metaBadgeUnassigned}>
              {assigned ? 'Assigned' : 'Unassigned'}
            </span>
          </div>
        </div>
      }
      belowMeta={undefined}
      thumbnail={
        <div className={styles.thumbnailWrap} style={aspectStyle} title={thumbnailTooltip}>
          <JournalImage
            src={getDisplayUrl(media)}
            alt={media.caption || media.filename}
            fill
            className={styles.thumbnailNatural}
            sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 200px"
          />
        </div>
      }
      belowThumbnail={
        <>
          {displayTitle ? (
            <div className={styles.mediaTitle} title={displayTitle}>
              {displayTitle}
            </div>
          ) : null}
          <DimensionalTagVerticalChips
            className={styles.tagChipsInline}
            tagIds={media.tags ?? []}
            allTags={allTags}
            variant="inline"
            onUpdateTags={(next) => onSaveTags(media.docId, next)}
          />
          <div className={styles.tagSearchFoot} data-admin-chrome={ADMIN_GRID_CHROME.tagSearchFoot}>
            <CardDimensionalTagCommandBar
              card={{ tags: media.tags ?? [] }}
              allTags={allTags ?? []}
              variant="searchOnly"
              suggestionsDensity="dense"
              onUpdateTags={handleTagUpdate}
            />
          </div>
          {saveNotice ? <div className={styles.saveNotice}>{saveNotice}</div> : null}
        </>
      }
    />
  );

  return gridCell;
}

const MemoizedMediaAdminGridCell = React.memo(MediaAdminGridCell, (prev, next) => {
  return (
    prev.media === next.media &&
    prev.mediaIndex === next.mediaIndex &&
    prev.tagNameMap === next.tagNameMap &&
    prev.allTags === next.allTags &&
    prev.onSaveTags === next.onSaveTags &&
    prev.isSelected === next.isSelected &&
    prev.onSelectionCheckboxClick === next.onSelectionCheckboxClick &&
    prev.studioDragBind === next.studioDragBind
  );
});

function MediaAdminGridCellStudioSource(props: Omit<MediaAdminGridCellProps, 'studioDragBind'>) {
  const mid = props.media.docId;
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, isDragging } = useDraggable({
    id: mid ? `source:${mid}` : 'source:invalid',
    disabled: !mid,
    data: { mediaId: mid, studioBankMedia: props.media },
  });
  const studioDragBind: MediaAdminRowStudioDragBind = {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    style: {
      opacity: isDragging ? 0.92 : 1,
      transform: DndCss.Translate.toString(transform),
      borderRadius: isDragging ? 'var(--border-radius-md)' : undefined,
      background: isDragging
        ? 'color-mix(in srgb, var(--admin-window-background-color) 92%, var(--admin-chrome-active-control-background-color) 8%)'
        : undefined,
      boxShadow: isDragging
        ? '0 14px 28px color-mix(in srgb, var(--admin-chrome-text-color) 14%, transparent), 0 0 0 1px color-mix(in srgb, var(--admin-chrome-active-control-background-color) 24%, transparent)'
        : undefined,
    },
  };
  return <MemoizedMediaAdminGridCell {...props} studioDragBind={studioDragBind} />;
}

const MemoizedMediaAdminGridCellStudioSource = React.memo(
  MediaAdminGridCellStudioSource,
  (prev, next) =>
    prev.media === next.media &&
    prev.mediaIndex === next.mediaIndex &&
    prev.tagNameMap === next.tagNameMap &&
    prev.allTags === next.allTags &&
    prev.onSaveTags === next.onSaveTags &&
    prev.isSelected === next.isSelected &&
    prev.onSelectionCheckboxClick === next.onSelectionCheckboxClick
);

export default function MediaAdminGrid({
  sourcePathFirst = false,
  dimensionFilters,
  studioSourceDraggable = false,
  clientSort = 'none',
}: {
  sourcePathFirst?: boolean;
  dimensionFilters: DimensionFilters;
  /** Admin Studio: grid tiles register as `source:*` for cover/gallery (requires parent `DndContext`). */
  studioSourceDraggable?: boolean;
  clientSort?: 'none' | 'filenameAsc' | 'filenameDesc';
}) {
  const { media, selectedMediaIds, setSelectedMediaIds, updateMedia } = useMedia();
  const selectionAnchorIndexRef = useRef<number | null>(null);
  const { tags } = useTag();
  const tagNameMap = useMemo(
    () => new Map(tags.filter((t) => t.docId).map((tag) => [tag.docId as string, tag.name])),
    [tags]
  );
  const sortedMedia = useMemo(() => {
    const normalize = (value: string | undefined) => (value ?? '').trim().toLowerCase();
    const modeFiltered = media.filter((item) => {
      return (['who', 'what', 'when', 'where'] as DimensionKey[]).every((dimension) => {
        const state = dimensionFilters[dimension];
        const ids = Array.isArray(item[dimension]) ? (item[dimension] as string[]) : [];
        if (state.mode === 'any') return true;
        if (state.mode === 'hasAny') return ids.length > 0;
        if (state.mode === 'isEmpty') return ids.length === 0;
        if (state.mode === 'matches') return state.tagId ? ids.includes(state.tagId) : true;
        return true;
      });
    });
    const applyClientSort = (rows: typeof media) => {
      if (clientSort === 'filenameAsc') {
        return [...rows].sort((a, b) => normalize(a.filename).localeCompare(normalize(b.filename)));
      }
      if (clientSort === 'filenameDesc') {
        return [...rows].sort((a, b) => normalize(b.filename).localeCompare(normalize(a.filename)));
      }
      return rows;
    };

    const afterDim = applyClientSort(modeFiltered);

    if (!sourcePathFirst) return afterDim;
    return [...afterDim].sort((a, b) => {
      const sourcePathCompare = normalize(a.sourcePath).localeCompare(normalize(b.sourcePath));
      if (sourcePathCompare !== 0) return sourcePathCompare;
      const fileCompare = normalize(a.filename).localeCompare(normalize(b.filename));
      if (fileCompare !== 0) return fileCompare;
      return normalize(a.docId).localeCompare(normalize(b.docId));
    });
  }, [media, sourcePathFirst, dimensionFilters, clientSort]);

  const sortedIds = useMemo(() => sortedMedia.map((m) => m.docId), [sortedMedia]);

  const handleGridSelection = useCallback(
    (e: React.MouseEvent | React.KeyboardEvent, id: string, index: number) => {
      e.preventDefault();
      e.stopPropagation();
      applyModifierSelection({
        orderedIds: sortedIds,
        id,
        index,
        modifiers: e,
        selected: selectedMediaIds,
        setSelected: setSelectedMediaIds,
        anchorIndexRef: selectionAnchorIndexRef,
      });
    },
    [sortedIds, selectedMediaIds, setSelectedMediaIds]
  );

  const handleSaveTags = useCallback(
    async (mediaId: string, nextTags: string[]) => {
      const updated = await updateMedia(mediaId, { tags: nextTags });
      if (!updated) {
        throw new Error('Tag update failed. Please retry.');
      }
    },
    [updateMedia]
  );

  const handleSelectAllOnPage = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.checked) {
        setSelectedMediaIds((prev) => {
          const s = new Set(prev);
          sortedIds.forEach((id) => s.add(id));
          return [...s];
        });
        selectionAnchorIndexRef.current = sortedIds.length > 0 ? sortedIds.length - 1 : null;
      } else {
        setSelectedMediaIds((prev) => {
          const v = new Set(sortedIds);
          return prev.filter((id) => !v.has(id));
        });
        selectionAnchorIndexRef.current = null;
      }
    },
    [sortedIds, setSelectedMediaIds]
  );

  const allOnPageSelected =
    sortedIds.length > 0 && sortedIds.every((id) => selectedMediaIds.includes(id));

  return (
    <div className={styles.container}>
      {sortedMedia.length > 0 && (
        <div className={styles.selectAllRow}>
          <input
            type="checkbox"
            checked={allOnPageSelected}
            onChange={handleSelectAllOnPage}
            aria-label="Select all on page"
          />
          <span className={styles.selectAllLabel}>Select all on page</span>
        </div>
      )}
      <div className={styles.grid}>
        {sortedMedia.map((item, index) =>
          studioSourceDraggable ? (
            <MemoizedMediaAdminGridCellStudioSource
              key={item.docId}
              media={item}
              mediaIndex={index}
              tagNameMap={tagNameMap}
              allTags={tags}
              onSaveTags={handleSaveTags}
              isSelected={selectedMediaIds.includes(item.docId)}
              onSelectionCheckboxClick={handleGridSelection}
            />
          ) : (
            <MemoizedMediaAdminGridCell
              key={item.docId}
              media={item}
              mediaIndex={index}
              tagNameMap={tagNameMap}
              allTags={tags}
              onSaveTags={handleSaveTags}
              isSelected={selectedMediaIds.includes(item.docId)}
              onSelectionCheckboxClick={handleGridSelection}
            />
          )
        )}
      </div>
      {sortedMedia.length === 0 && (
        <div className={styles.emptyState}>
          <p>No media found matching the current filters.</p>
        </div>
      )}
    </div>
  );
}
