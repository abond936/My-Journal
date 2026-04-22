'use client';

import React, { useMemo } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { CSS as DndCss } from '@dnd-kit/utilities';
import JournalImage from '@/components/common/JournalImage';
import { Media } from '@/lib/types/photo';
import { DirectDimensionTagsRail } from '@/components/admin/common/DirectDimensionChips';
import EditModal from '@/components/admin/card-admin/EditModal';
import MacroTagSelector from '@/components/admin/card-admin/MacroTagSelector';
import type { MediaAdminRowStudioDragBind } from '@/components/admin/media-admin/MediaAdminRow';
import { useMedia } from '@/components/providers/MediaProvider';
import { useTag } from '@/components/providers/TagProvider';
import { getDisplayUrl } from '@/lib/utils/photoUtils';
import { formatCoreTagsTooltipLines, getCoreTagsByDimension } from '@/lib/utils/tagDisplay';
import styles from './MediaAdminGrid.module.css';
import AdminGridCellChrome from '@/components/admin/common/AdminGridCellChrome';
import chromeStyles from '@/components/admin/common/AdminGridCellChrome.module.css';
import { adminChromeSelector, ADMIN_GRID_CHROME } from '@/components/admin/common/adminGridChromeAttr';

export interface MediaAdminGridCellProps {
  media: Media;
  tagNameMap: Map<string, string>;
  allTags: ReturnType<typeof useTag>['tags'];
  onSaveTags: (mediaId: string, nextTags: string[]) => Promise<void>;
  isSelected: boolean;
  onToggleSelection: () => void;
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

function isMediaGridChromeInteractiveTarget(t: HTMLElement): boolean {
  return Boolean(
    t.closest(adminChromeSelector(ADMIN_GRID_CHROME.overlayTopStart)) ||
      t.closest(adminChromeSelector(ADMIN_GRID_CHROME.overlayTopEnd)) ||
      t.closest(adminChromeSelector(ADMIN_GRID_CHROME.tagRail)) ||
      t.closest(adminChromeSelector(ADMIN_GRID_CHROME.footerActions))
  );
}

function MediaAdminGridCell({
  media,
  tagNameMap,
  allTags,
  onSaveTags,
  isSelected,
  onToggleSelection,
  studioDragBind,
}: MediaAdminGridCellProps) {
  const core = useMemo(() => getCoreTagsByDimension(media), [media]);
  const [tagModalOpen, setTagModalOpen] = React.useState(false);
  const [pendingTags, setPendingTags] = React.useState<string[]>(media.tags ?? []);
  const [saveError, setSaveError] = React.useState<string | null>(null);
  const [saveNotice, setSaveNotice] = React.useState<string | null>(null);

  React.useEffect(() => {
    setPendingTags(media.tags ?? []);
  }, [media.docId, media.tags]);

  React.useEffect(() => {
    if (!saveNotice) return;
    const id = window.setTimeout(() => setSaveNotice(null), 2500);
    return () => window.clearTimeout(id);
  }, [saveNotice]);

  const selectedTags = React.useMemo(
    () => allTags.filter((tag) => tag.docId && pendingTags.includes(tag.docId)),
    [allTags, pendingTags]
  );

  const onCellClick = (e: React.MouseEvent) => {
    const t = e.target as HTMLElement;
    if (isMediaGridChromeInteractiveTarget(t)) return;
    if (t.closest('button')) return;
    onToggleSelection();
  };
  const onCellKeyDown = (e: React.KeyboardEvent) => {
    if ((e.target as HTMLElement).closest('input, textarea, button, [role="listbox"]')) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onToggleSelection();
    }
  };

  const aspectStyle: React.CSSProperties =
    media.width > 0 && media.height > 0
      ? { aspectRatio: `${media.width} / ${media.height}` }
      : { aspectRatio: '4 / 3' };

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
            checked={isSelected}
            onChange={onToggleSelection}
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
      overlayLeftRail={<DirectDimensionTagsRail core={core} tagNameMap={tagNameMap} />}
      overlayBottom={
        <>
          <span className={chromeStyles.metaBadgeMuted}>{media.source}</span>
          <span className={assigned ? chromeStyles.metaBadgeAssigned : chromeStyles.metaBadgeUnassigned}>
            {assigned ? 'Assigned' : 'Unassigned'}
          </span>
        </>
      }
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
          {media.caption ? (
            <div className={styles.captionBelow} title={media.caption}>
              {media.caption}
            </div>
          ) : null}
          <div className={styles.inlineActions} data-admin-chrome={ADMIN_GRID_CHROME.footerActions}>
            <button
              type="button"
              className={styles.inlineActionButton}
              onClick={(e) => {
                e.stopPropagation();
                setSaveError(null);
                setTagModalOpen(true);
              }}
            >
              Edit tags…
            </button>
          </div>
          {saveNotice ? <div className={styles.saveNotice}>{saveNotice}</div> : null}
        </>
      }
    />
  );

  return (
    <>
      {gridCell}
      <EditModal
        isOpen={tagModalOpen}
        onClose={() => setTagModalOpen(false)}
        title={`Tags: ${media.filename}`}
        size="wide"
      >
        <MacroTagSelector
          startExpanded
          selectedTags={selectedTags}
          allTags={allTags}
          onChange={setPendingTags}
          error={saveError ?? undefined}
          onSaveSelection={async (nextSelection) => {
            setSaveError(null);
            try {
              await onSaveTags(media.docId, nextSelection);
              setSaveNotice('Tags saved');
              setTagModalOpen(false);
            } catch (error) {
              const message = error instanceof Error ? error.message : 'Failed to save tags.';
              setSaveError(message);
            }
          }}
          onRequestClose={() => setTagModalOpen(false)}
        />
      </EditModal>
    </>
  );
}

function MediaAdminGridCellStudioSource(props: Omit<MediaAdminGridCellProps, 'studioDragBind'>) {
  const mid = props.media.docId;
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, isDragging } = useDraggable({
    id: mid ? `source:${mid}` : 'source:invalid',
    disabled: !mid,
    data: { mediaId: mid },
  });
  const studioDragBind: MediaAdminRowStudioDragBind = {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    style: {
      opacity: isDragging ? 0.6 : 1,
      transform: DndCss.Translate.toString(transform),
    },
  };
  return <MediaAdminGridCell {...props} studioDragBind={studioDragBind} />;
}

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
  const { media, selectedMediaIds, toggleMediaSelection, selectAll, selectNone, updateMedia } = useMedia();
  const { tags } = useTag();
  const tagNameMap = new Map(tags.filter(t => t.docId).map(tag => [tag.docId as string, tag.name]));
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

  return (
    <div className={styles.container}>
      {sortedMedia.length > 0 && (
        <div className={styles.selectAllRow}>
          <input
            type="checkbox"
            checked={selectedMediaIds.length === sortedMedia.length}
            onChange={(e) => (e.target.checked ? selectAll() : selectNone())}
            aria-label="Select all on page"
          />
          <span className={styles.selectAllLabel}>Select all on page</span>
        </div>
      )}
      <div className={styles.grid}>
        {sortedMedia.map((item) =>
          studioSourceDraggable ? (
            <MediaAdminGridCellStudioSource
              key={item.docId}
              media={item}
              tagNameMap={tagNameMap}
              allTags={tags}
              onSaveTags={async (mediaId, nextTags) => {
                const updated = await updateMedia(mediaId, { tags: nextTags });
                if (!updated) {
                  throw new Error('Tag update failed. Please retry.');
                }
              }}
              isSelected={selectedMediaIds.includes(item.docId)}
              onToggleSelection={() => toggleMediaSelection(item.docId)}
            />
          ) : (
            <MediaAdminGridCell
              key={item.docId}
              media={item}
              tagNameMap={tagNameMap}
              allTags={tags}
              onSaveTags={async (mediaId, nextTags) => {
                const updated = await updateMedia(mediaId, { tags: nextTags });
                if (!updated) {
                  throw new Error('Tag update failed. Please retry.');
                }
              }}
              isSelected={selectedMediaIds.includes(item.docId)}
              onToggleSelection={() => toggleMediaSelection(item.docId)}
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
