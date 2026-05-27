'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link2, Pencil, Trash2 } from 'lucide-react';
import { applyModifierSelection } from '@/lib/utils/adminListSelection';
import { useDraggable } from '@dnd-kit/core';
import { CSS as DndCss } from '@dnd-kit/utilities';
import JournalImage from '@/components/common/JournalImage';
import { Media } from '@/lib/types/photo';
import DimensionalTagVerticalChips from '@/components/admin/common/DimensionalTagVerticalChips';
import CardDimensionalTagCommandBar from '@/components/admin/common/CardDimensionalTagCommandBar';
import { useMedia } from '@/components/providers/MediaProvider';
import { useTag } from '@/components/providers/TagProvider';
import { getDisplayUrl } from '@/lib/utils/photoUtils';
import { formatCoreTagsTooltipLines, getCoreTagsByDimension } from '@/lib/utils/tagDisplay';
import MediaEditModal from '@/components/admin/media-admin/MediaEditModal';
import MediaLinkedCardsModal from '@/components/admin/media-admin/MediaLinkedCardsModal';
import useMediaReferenceSummaries from '@/components/admin/media-admin/useMediaReferenceSummaries';
import styles from './MediaAdminGrid.module.css';
import AdminGridCellChrome from '@/components/admin/common/AdminGridCellChrome';
import chromeStyles from '@/components/admin/common/AdminGridCellChrome.module.css';
import { adminChromeSelector, ADMIN_GRID_CHROME } from '@/components/admin/common/adminGridChromeAttr';
import { eventTargetToElement } from '@/lib/utils/domEventTarget';
import { useRouter } from 'next/navigation';
import { useAppFeedback } from '@/components/providers/AppFeedbackProvider';

export interface MediaAdminGridCellProps {
  media: Media;
  mediaIndex: number;
  tagNameMap: Map<string, string>;
  allTags: ReturnType<typeof useTag>['tags'];
  onSaveTags: (mediaId: string, nextTags: string[]) => Promise<void>;
  onSaveMediaFields: (
    mediaId: string,
    updates: Partial<Pick<Media, 'caption' | 'objectPosition'>>
  ) => Promise<void>;
  isSelected: boolean;
  onSelectionCheckboxClick: (e: React.MouseEvent | React.KeyboardEvent, mediaId: string, mediaIndex: number) => void;
  studioDragBind?: MediaAdminGridStudioDragBind;
  inlineCaptionEditing?: boolean;
  isAssignedToActiveCard?: boolean;
  authoritativeRelatedCardIds?: string[] | null;
}

export type MediaAdminGridStudioDragBind = {
  attributes: ReturnType<typeof useDraggable>['attributes'];
  listeners: ReturnType<typeof useDraggable>['listeners'];
  setNodeRef: ReturnType<typeof useDraggable>['setNodeRef'];
  style: React.CSSProperties;
};

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
  onSaveMediaFields,
  isSelected,
  onSelectionCheckboxClick,
  studioDragBind,
  inlineCaptionEditing = false,
  isAssignedToActiveCard = false,
  authoritativeRelatedCardIds = null,
}: MediaAdminGridCellProps) {
  const router = useRouter();
  const feedback = useAppFeedback();
  const core = useMemo(() => getCoreTagsByDimension(media), [media]);
  const { deleteMedia } = useMedia();
  const [saveNotice, setSaveNotice] = useState<string | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [linkedCardsModalOpen, setLinkedCardsModalOpen] = useState(false);
  const [captionDraft, setCaptionDraft] = useState(media.caption || '');
  const [captionSaving, setCaptionSaving] = useState(false);

  useEffect(() => {
    if (!saveNotice) return;
    const id = window.setTimeout(() => setSaveNotice(null), 2500);
    return () => window.clearTimeout(id);
  }, [saveNotice]);

  useEffect(() => {
    if (!editModalOpen) return;
    setCaptionDraft(media.caption || '');
  }, [editModalOpen, media.caption]);

  useEffect(() => {
    if (editModalOpen || captionSaving) return;
    setCaptionDraft(media.caption || '');
  }, [captionSaving, editModalOpen, media.caption, media.docId]);

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

  const aspectStyle: React.CSSProperties = { aspectRatio: '4 / 3' };
  const displayTitle = media.caption?.trim() || '';
  const identityTooltip = `File: ${media.filename}\nID: ${media.docId}\nSource: ${media.sourcePath || '-'}`;
  const thumbnailTooltip = useMemo(() => {
    const tagLines = formatCoreTagsTooltipLines(core, (id) => tagNameMap.get(id) ?? id);
    return `${identityTooltip}\n\n${tagLines}`;
  }, [identityTooltip, core, tagNameMap]);

  const handleInlineCaptionSave = useCallback(async () => {
    if (!inlineCaptionEditing || !media.docId) return;
    if (captionDraft === (media.caption || '')) return;
    setCaptionSaving(true);
    try {
      await onSaveMediaFields(media.docId, { caption: captionDraft });
      setSaveNotice('Caption saved');
    } finally {
      setCaptionSaving(false);
    }
  }, [captionDraft, inlineCaptionEditing, media.caption, media.docId, onSaveMediaFields]);

  const relatedCardIds = authoritativeRelatedCardIds ?? media.referencedByCardIds ?? [];
  const assigned = relatedCardIds.length > 0;
  const linkedCardCount = relatedCardIds.length;
  const handleOpenLinkedCards = useCallback(() => {
    if (relatedCardIds.length === 0) return;
    if (relatedCardIds.length === 1) {
      router.push(`/admin/studio?card=${encodeURIComponent(relatedCardIds[0]!)}`);
      return;
    }
    setLinkedCardsModalOpen(true);
  }, [relatedCardIds, router]);
  const handleDeleteMedia = useCallback(async () => {
    const shouldDelete = await feedback.confirm({
      title: 'Delete media?',
      message: `Delete "${media.filename}" from the library?`,
      confirmLabel: 'Delete',
      cancelLabel: 'Cancel',
      tone: 'danger',
    });
    if (!shouldDelete) return;
    await deleteMedia(media.docId);
  }, [deleteMedia, feedback, media.docId, media.filename]);
  const studioRootExtras = studioDragBind
    ? {
        ref: studioDragBind.setNodeRef,
        style: studioDragBind.style,
        className: `${styles.cellStudioSource} ${styles.cellClickSurface} ${isAssignedToActiveCard ? styles.cellAssignedToActiveCard : ''}`,
      }
    : {
        className: `${styles.cellClickSurface} ${isAssignedToActiveCard ? styles.cellAssignedToActiveCard : ''}`,
      };

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
        <div className={styles.overlayTopEndCluster} onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            className={styles.overlayEditButton}
            onClick={() => setEditModalOpen(true)}
            aria-label="Edit media"
            title="Edit media"
          >
            <Pencil size={16} aria-hidden="true" />
          </button>
          <button
            type="button"
            className={chromeStyles.deleteBtn}
            onClick={() => void handleDeleteMedia()}
            aria-label="Delete media"
            title="Delete media"
          >
            <Trash2 size={16} aria-hidden="true" />
          </button>
        </div>
      }
      overlayLeftRail={undefined}
      overlayBottom={
        <div className={styles.overlayBottomRow}>
          <div className={styles.overlayBottomStart}>
            <span className={chromeStyles.metaBadgeMuted}>{media.source}</span>
            <span className={assigned ? chromeStyles.metaBadgeAssigned : chromeStyles.metaBadgeUnassigned}>
              {assigned ? 'Assigned' : 'Unassigned'}
            </span>
            {isAssignedToActiveCard ? (
              <span className={styles.assignedToCardBadge}>On card</span>
            ) : null}
          </div>
          {linkedCardCount > 0 ? (
            <div className={styles.overlayBottomEnd}>
              <button
                type="button"
                className={styles.overlayBottomLinkButton}
                onClick={handleOpenLinkedCards}
                aria-label={
                  linkedCardCount === 1
                    ? 'Open linked card'
                    : `Open ${linkedCardCount} linked cards`
                }
                title={
                  linkedCardCount === 1
                    ? 'Open linked card'
                    : `Open ${linkedCardCount} linked cards`
                }
              >
                <Link2 size={13} aria-hidden="true" />
                <span className={styles.overlayLinkedCardsCount}>{linkedCardCount}</span>
              </button>
            </div>
          ) : null}
        </div>
      }
      belowMeta={undefined}
      thumbnail={
        <div
          className={`${styles.thumbnailWrap} ${studioDragBind ? styles.thumbnailWrapStudioDraggable : ''}`}
          style={aspectStyle}
          title={studioDragBind ? `${thumbnailTooltip}\n\nDrag image to selected card cover, gallery, or content.` : thumbnailTooltip}
          {...(studioDragBind ? studioDragBind.attributes : {})}
          {...(studioDragBind ? studioDragBind.listeners : {})}
        >
          <JournalImage
            src={getDisplayUrl(media)}
            alt={media.caption || media.filename}
            fill
            className={styles.thumbnailNatural}
            sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 200px"
            style={{ objectPosition: media.objectPosition || '50% 50%' }}
          />
        </div>
      }
      belowThumbnail={
        <>
          {inlineCaptionEditing ? (
            <div className={styles.mediaTitle}>
              <textarea
                id={`media-inline-caption-${media.docId}`}
                rows={2}
                className={styles.inlineCaptionInput}
                value={captionDraft}
                placeholder=" "
                onChange={(e) => setCaptionDraft(e.target.value)}
                onBlur={() => void handleInlineCaptionSave()}
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => {
                  e.stopPropagation();
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    void handleInlineCaptionSave();
                    e.currentTarget.blur();
                  }
                }}
                aria-label={`Caption for ${media.filename}`}
              />
            </div>
          ) : displayTitle ? (
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

  return (
    <>
      {gridCell}
      <MediaEditModal
        isOpen={editModalOpen}
        mediaItems={[media]}
        selectedMediaId={media.docId}
        onSelectMedia={() => undefined}
        onClose={() => setEditModalOpen(false)}
        onSaveMediaFields={onSaveMediaFields}
        onDeleteMedia={deleteMedia}
        relatedCardIdsOverride={relatedCardIds}
      />
      <MediaLinkedCardsModal
        isOpen={linkedCardsModalOpen}
        mediaTitle={media.caption?.trim() || media.filename}
        cardIds={relatedCardIds}
        onClose={() => setLinkedCardsModalOpen(false)}
      />
    </>
  );
}

const MemoizedMediaAdminGridCell = React.memo(MediaAdminGridCell, (prev, next) => {
  return (
    prev.media === next.media &&
    prev.mediaIndex === next.mediaIndex &&
    prev.tagNameMap === next.tagNameMap &&
    prev.allTags === next.allTags &&
    prev.onSaveTags === next.onSaveTags &&
    prev.onSaveMediaFields === next.onSaveMediaFields &&
    prev.isSelected === next.isSelected &&
    prev.onSelectionCheckboxClick === next.onSelectionCheckboxClick &&
    prev.studioDragBind === next.studioDragBind &&
    prev.inlineCaptionEditing === next.inlineCaptionEditing &&
    prev.isAssignedToActiveCard === next.isAssignedToActiveCard &&
    prev.authoritativeRelatedCardIds === next.authoritativeRelatedCardIds
  );
});

function MediaAdminGridCellStudioSource(props: Omit<MediaAdminGridCellProps, 'studioDragBind'>) {
  const mid = props.media.docId;
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: mid ? `source:${mid}` : 'source:invalid',
    disabled: !mid,
    data: { mediaId: mid, studioBankMedia: props.media },
  });
  const studioDragBind: MediaAdminGridStudioDragBind = {
    attributes,
    listeners,
    setNodeRef,
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
    prev.onSaveMediaFields === next.onSaveMediaFields &&
    prev.isSelected === next.isSelected &&
    prev.onSelectionCheckboxClick === next.onSelectionCheckboxClick &&
    prev.inlineCaptionEditing === next.inlineCaptionEditing &&
    prev.isAssignedToActiveCard === next.isAssignedToActiveCard
);

export default function MediaAdminGrid({
  sourcePathFirst = false,
  dimensionFilters,
  studioSourceDraggable = false,
  inlineCaptionEditing = false,
  clientSort = 'none',
  highlightedMediaIds = [],
  onVisibleHighlightedCountChange,
  mediaOverride,
  emptyMessage = 'No media found matching the current filters.',
}: {
  sourcePathFirst?: boolean;
  dimensionFilters: DimensionFilters;
  studioSourceDraggable?: boolean;
  inlineCaptionEditing?: boolean;
  clientSort?: 'none' | 'filenameAsc' | 'filenameDesc';
  highlightedMediaIds?: string[];
  onVisibleHighlightedCountChange?: (count: number) => void;
  mediaOverride?: Media[] | null;
  emptyMessage?: string;
}) {
  const { media, selectedMediaIds, setSelectedMediaIds, updateMedia } = useMedia();
  const selectionAnchorIndexRef = useRef<number | null>(null);
  const { tags } = useTag();
  const tagNameMap = useMemo(
    () => new Map(tags.filter((t) => t.docId).map((tag) => [tag.docId as string, tag.name])),
    [tags]
  );

  const sourceMedia = mediaOverride ?? media;

  const sortedMedia = useMemo(() => {
    const normalize = (value: string | undefined) => (value ?? '').trim().toLowerCase();
    const modeFiltered = sourceMedia.filter((item) => {
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
  }, [sourceMedia, sourcePathFirst, dimensionFilters, clientSort]);

  const sortedIds = useMemo(() => sortedMedia.map((m) => m.docId), [sortedMedia]);
  const highlightedIdSet = useMemo(() => new Set(highlightedMediaIds), [highlightedMediaIds]);
  const referenceSummaries = useMediaReferenceSummaries(sortedMedia);

  useEffect(() => {
    if (!onVisibleHighlightedCountChange) return;
    let count = 0;
    for (const id of sortedIds) {
      if (highlightedIdSet.has(id)) count += 1;
    }
    onVisibleHighlightedCountChange(count);
  }, [highlightedIdSet, onVisibleHighlightedCountChange, sortedIds]);

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

  const handleSaveMediaFields = useCallback(
    async (mediaId: string, updates: Partial<Pick<Media, 'caption' | 'objectPosition'>>) => {
      const updated = await updateMedia(mediaId, updates);
      if (!updated) {
        throw new Error('Media update failed. Please retry.');
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

  const allVisibleSelected = sortedIds.length > 0 && sortedIds.every((id) => selectedMediaIds.includes(id));

  return (
    <div className={styles.container}>
      {sortedMedia.length > 0 && (
        <div className={styles.selectAllRow}>
          <input
            type="checkbox"
            checked={allVisibleSelected}
            onChange={handleSelectAllOnPage}
            aria-label="Select visible media"
          />
          <span className={styles.selectAllLabel}>Select visible</span>
        </div>
      )}
      <div className={styles.grid}>
        {sortedMedia.map((item, index) => {
          const isAssignedToActiveCard = highlightedIdSet.has(item.docId);
          const itemKey = `${item.docId}:${isAssignedToActiveCard ? 'on-card' : 'default'}`;
          return studioSourceDraggable ? (
            <MemoizedMediaAdminGridCellStudioSource
              key={itemKey}
              media={item}
              mediaIndex={index}
              tagNameMap={tagNameMap}
              allTags={tags}
              onSaveTags={handleSaveTags}
              onSaveMediaFields={handleSaveMediaFields}
              isSelected={selectedMediaIds.includes(item.docId)}
              onSelectionCheckboxClick={handleGridSelection}
              inlineCaptionEditing={inlineCaptionEditing}
              isAssignedToActiveCard={isAssignedToActiveCard}
              authoritativeRelatedCardIds={referenceSummaries[item.docId] ?? null}
            />
          ) : (
            <MemoizedMediaAdminGridCell
              key={itemKey}
              media={item}
              mediaIndex={index}
              tagNameMap={tagNameMap}
              allTags={tags}
              onSaveTags={handleSaveTags}
              onSaveMediaFields={handleSaveMediaFields}
              isSelected={selectedMediaIds.includes(item.docId)}
              onSelectionCheckboxClick={handleGridSelection}
              inlineCaptionEditing={inlineCaptionEditing}
              isAssignedToActiveCard={isAssignedToActiveCard}
              authoritativeRelatedCardIds={referenceSummaries[item.docId] ?? null}
            />
          );
        })}
      </div>
      {sortedMedia.length === 0 && (
        <div className={styles.emptyState}>
          <p>{emptyMessage}</p>
        </div>
      )}
    </div>
  );
}
