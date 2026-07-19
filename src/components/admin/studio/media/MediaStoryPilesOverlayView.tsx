'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import MediaAdminGrid from '@/components/admin/studio/media/MediaAdminGrid';
import type { MediaStackGridProps } from '@/components/admin/studio/media/MediaBrowseGroupedView';
import {
  StoryPileHeaderDropZone,
  postStoryPileMembershipMove,
} from '@/components/admin/studio/studioPileMembershipDnd';
import EditModal from '@/components/admin/studio/cards/EditModal';
import MacroTagSelector from '@/components/admin/studio/cards/MacroTagSelector';
import { useAppFeedback } from '@/components/providers/AppFeedbackProvider';
import { useMedia } from '@/components/providers/MediaProvider';
import { useTag } from '@/components/providers/TagProvider';
import { useStudioShellOptional } from '@/components/admin/studio/StudioShellContext';
import type { Media } from '@/lib/types/photo';
import type {
  ProvisionalCluster,
  ReviewLens,
  SuggestedTagIdsByDimension,
} from '@/lib/types/provisionalCluster';
import { flattenSuggestedTagIds } from '@/lib/types/provisionalCluster';
import { groupSelectedTagIdsByDimension } from '@/lib/utils/tagUtils';
import {
  STORY_PILE_UNSORTED_DROP_ID,
  storyPileDropId,
} from '@/lib/dnd/studioPileDragContract';
import type { AdminDimensionFilterState, AdminTagFilterScope } from '@/lib/preferences/adminFilters';
import { MAX_REVIEW_PILE_SIZE } from '@/lib/utils/reviewClusterHeuristics';
import { DIMENSION_ORDER, type TagDimension } from '@/lib/utils/tagDisplay';
import { getTagPathDisplay } from '@/lib/utils/tagDimensionResolve';
import type { StoryPileOverlaySection } from '@/lib/utils/mediaOrganizeUtils';
import styles from './mediaStoryPilesOverlayView.module.css';
import reviewStyles from './mediaReviewPanel.module.css';

type ApiErrorResponse = {
  message?: string;
  code?: string;
};

type MediaStoryPilesOverlayViewProps = {
  sections: StoryPileOverlaySection[];
  sectionExpanded: Record<string, boolean>;
  onSectionExpandedChange: (sectionId: string, expanded: boolean) => void;
  showTagSuggestions: boolean;
  onClustersChanged: () => void | Promise<void>;
  reviewLens: ReviewLens;
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

type ContextMenuState = {
  x: number;
  y: number;
  mediaIds: string[];
};

function suggestedTagsForDimension(
  suggested: ProvisionalCluster['suggestedTagIds'],
  dimension: TagDimension
): string[] {
  return suggested[dimension] ?? [];
}

function dimensionChipClass(dimension: TagDimension): string {
  switch (dimension) {
    case 'who':
      return styles.tagChipWho;
    case 'what':
      return styles.tagChipWhat;
    case 'when':
      return styles.tagChipWhen;
    case 'where':
      return styles.tagChipWhere;
    default:
      return '';
  }
}

function MediaPileMembershipContextMenu({
  state,
  piles,
  onClose,
  onMove,
  onRemove,
  onNewPile,
}: {
  state: ContextMenuState;
  piles: Array<{ clusterId: string; title: string }>;
  onClose: () => void;
  onMove: (targetClusterId: string) => void;
  onRemove: () => void;
  onNewPile: () => void;
}) {
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [search, setSearch] = useState('');
  const [moveOpen, setMoveOpen] = useState(false);

  useEffect(() => {
    setSearch('');
    setMoveOpen(false);
  }, [state.x, state.y, state.mediaIds.join(',')]);

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      if (menuRef.current?.contains(event.target as Node)) return;
      onClose();
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('pointerdown', handlePointerDown, true);
    document.addEventListener('keydown', handleKeyDown, true);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown, true);
      document.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [onClose]);

  const filteredPiles = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return piles;
    return piles.filter((pile) => pile.title.toLowerCase().includes(query));
  }, [piles, search]);

  return (
    <div
      ref={menuRef}
      className={styles.contextMenu}
      style={{ left: state.x, top: state.y }}
      role="menu"
      aria-label="Pile membership actions"
    >
      <button type="button" className={styles.contextMenuItem} role="menuitem" onClick={onRemove}>
        Remove to Unsorted
      </button>
      <button
        type="button"
        className={styles.contextMenuItem}
        role="menuitem"
        aria-expanded={moveOpen}
        onClick={() => setMoveOpen((open) => !open)}
      >
        Move to… {moveOpen ? '▾' : '▸'}
      </button>
      {moveOpen ? (
        <div className={styles.contextSubmenu} role="group" aria-label="Move to pile">
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search piles…"
            className={styles.contextSearch}
            aria-label="Search piles"
          />
          <div className={styles.contextPileList}>
            {filteredPiles.length === 0 ? (
              <p className={styles.contextEmpty}>No matching piles.</p>
            ) : (
              filteredPiles.map((pile) => (
                <button
                  key={pile.clusterId}
                  type="button"
                  className={styles.contextMenuItem}
                  role="menuitem"
                  onClick={() => onMove(pile.clusterId)}
                >
                  {pile.title}
                </button>
              ))
            )}
          </div>
          <button type="button" className={styles.contextMenuItem} role="menuitem" onClick={onNewPile}>
            New pile…
          </button>
        </div>
      ) : null}
    </div>
  );
}

export default function MediaStoryPilesOverlayView(props: MediaStoryPilesOverlayViewProps) {
  const {
    sections,
    sectionExpanded,
    onSectionExpandedChange,
    showTagSuggestions,
    onClustersChanged,
    reviewLens,
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

  const router = useRouter();
  const feedback = useAppFeedback();
  const studioShell = useStudioShellOptional();
  const { tags: allTags } = useTag();
  const { fetchMedia } = useMedia();
  const [busyClusterId, setBusyClusterId] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [editingCluster, setEditingCluster] = useState<ProvisionalCluster | null>(null);
  const [draftPileTagIds, setDraftPileTagIds] = useState<string[]>([]);
  const [savingPileTags, setSavingPileTags] = useState(false);
  const [mergingCluster, setMergingCluster] = useState<ProvisionalCluster | null>(null);
  const [mergeTargetClusterId, setMergeTargetClusterId] = useState('');
  const tagById = new Map(allTags.filter((tag) => tag.docId).map((tag) => [tag.docId!, tag]));
  const mediaById = new Map(allLoadedMedia.map((item) => [item.docId, item]));

  const pileOptions = useMemo(
    () =>
      sections
        .filter((section) => section.cluster?.docId && !section.isUnsorted)
        .map((section) => ({
          clusterId: section.cluster!.docId!,
          title: section.title,
        })),
    [sections]
  );

  const moveMediaIds = useCallback(
    async (mediaIds: string[], targetClusterId: string | null) => {
      if (mediaIds.length === 0) return;
      await postStoryPileMembershipMove({ mediaIds, targetClusterId });
      await onClustersChanged();
    },
    [onClustersChanged]
  );

  const handleMediaContextMenu = useCallback(
    (event: React.MouseEvent, mediaId: string) => {
      event.preventDefault();
      event.stopPropagation();
      const selected = studioShell?.selectedMediaIds ?? [];
      const mediaIds =
        selected.includes(mediaId) && selected.length > 0
          ? Array.from(new Set(selected))
          : [mediaId];
      setContextMenu({ x: event.clientX, y: event.clientY, mediaIds });
    },
    [studioShell?.selectedMediaIds]
  );

  const closeContextMenu = useCallback(() => setContextMenu(null), []);

  const handleContextRemove = useCallback(async () => {
    if (!contextMenu) return;
    const mediaIds = contextMenu.mediaIds;
    closeContextMenu();
    try {
      await moveMediaIds(mediaIds, null);
      feedback.showSuccess(
        mediaIds.length > 1
          ? `${mediaIds.length} photos moved to Unsorted.`
          : 'Photo moved to Unsorted.',
        'Moved'
      );
    } catch (error) {
      feedback.showError(
        error instanceof Error ? error.message : 'Failed to move to Unsorted.',
        'Move failed'
      );
    }
  }, [closeContextMenu, contextMenu, feedback, moveMediaIds]);

  const handleContextMove = useCallback(
    async (targetClusterId: string) => {
      if (!contextMenu) return;
      const mediaIds = contextMenu.mediaIds;
      closeContextMenu();
      try {
        await moveMediaIds(mediaIds, targetClusterId);
        feedback.showSuccess(
          mediaIds.length > 1 ? `${mediaIds.length} photos moved to pile.` : 'Photo moved to pile.',
          'Moved'
        );
      } catch (error) {
        feedback.showError(
          error instanceof Error ? error.message : 'Failed to move photos.',
          'Move failed'
        );
      }
    },
    [closeContextMenu, contextMenu, feedback, moveMediaIds]
  );

  const handleContextNewPile = useCallback(async () => {
    if (!contextMenu) return;
    const mediaIds = contextMenu.mediaIds;
    const title = window.prompt('Name for the new pile');
    closeContextMenu();
    if (!title?.trim()) return;
    try {
      const response = await fetch('/api/admin/media/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ mode: 'create-empty', title: title.trim(), lens: reviewLens }),
      });
      const payload = (await response.json().catch(() => ({}))) as ApiErrorResponse & {
        cluster?: ProvisionalCluster;
      };
      if (!response.ok) {
        throw new Error(payload.message || `HTTP ${response.status}`);
      }
      const clusterId = payload.cluster?.docId;
      if (!clusterId) {
        throw new Error('New pile was not created.');
      }
      await moveMediaIds(mediaIds, clusterId);
      feedback.showSuccess(`Created “${title.trim()}” and moved photos.`, 'New pile');
    } catch (error) {
      feedback.showError(
        error instanceof Error ? error.message : 'Failed to create pile.',
        'New pile'
      );
    }
  }, [closeContextMenu, contextMenu, feedback, moveMediaIds, reviewLens]);

  const dismissCluster = useCallback(
    async (cluster: ProvisionalCluster) => {
      if (!cluster.docId) return;
      const memberCount = cluster.memberMediaIds.length;
      if (memberCount > MAX_REVIEW_PILE_SIZE) {
        const confirmed = await feedback.confirm({
          title: 'Dismiss this pile?',
          message: `${memberCount} photos will return to Unsorted. No tags will be applied.`,
          confirmLabel: 'Dismiss pile',
          cancelLabel: 'Keep pile',
          tone: 'danger',
        });
        if (!confirmed) return;
      }
      setBusyClusterId(cluster.docId);
      try {
        const response = await fetch(
          `/api/admin/media/review/${encodeURIComponent(cluster.docId)}/actions`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'dismiss' }),
            credentials: 'same-origin',
          }
        );
        const payload = (await response.json().catch(() => ({}))) as ApiErrorResponse;
        if (!response.ok) {
          throw new Error(payload.message || `HTTP ${response.status}`);
        }
        feedback.showSuccess('Dismissed pile. Members returned to Unsorted.', 'Dismissed');
        await onClustersChanged();
      } catch (error) {
        feedback.showError(
          error instanceof Error ? error.message : 'Failed to dismiss pile.',
          'Dismiss'
        );
      } finally {
        setBusyClusterId(null);
      }
    },
    [feedback, onClustersChanged]
  );

  const applyTagsToPhotos = useCallback(
    async (cluster: ProvisionalCluster) => {
      if (!cluster.docId) return;
      const tagCount = flattenSuggestedTagIds(cluster.suggestedTagIds).length;
      if (tagCount === 0) {
        feedback.showError('Add pile tags first, then apply them to member photos.', 'Apply to photos');
        return;
      }
      setBusyClusterId(cluster.docId);
      try {
        const response = await fetch(
          `/api/admin/media/review/${encodeURIComponent(cluster.docId)}/actions`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'accept-tags' }),
            credentials: 'same-origin',
          }
        );
        const payload = (await response.json().catch(() => ({}))) as ApiErrorResponse;
        if (!response.ok) {
          throw new Error(payload.message || `HTTP ${response.status}`);
        }
        await fetchMedia(1);
        feedback.showSuccess(
          `Applied pile tags to ${cluster.memberMediaIds.length} photo${
            cluster.memberMediaIds.length === 1 ? '' : 's'
          }. Pile stays pending for review.`,
          'Apply to photos'
        );
      } catch (error) {
        feedback.showError(
          error instanceof Error ? error.message : 'Failed to apply tags to photos.',
          'Apply to photos'
        );
      } finally {
        setBusyClusterId(null);
      }
    },
    [feedback, fetchMedia]
  );

  const openEditPileTags = useCallback((cluster: ProvisionalCluster) => {
    setEditingCluster(cluster);
    setDraftPileTagIds(flattenSuggestedTagIds(cluster.suggestedTagIds));
  }, []);

  const closeEditPileTags = useCallback(() => {
    if (savingPileTags) return;
    setEditingCluster(null);
    setDraftPileTagIds([]);
  }, [savingPileTags]);

  const savePileTags = useCallback(async () => {
    if (!editingCluster?.docId) return;
    setSavingPileTags(true);
    try {
      const suggestedTagIds = groupSelectedTagIdsByDimension(
        draftPileTagIds,
        allTags
      ) as SuggestedTagIdsByDimension;
      const response = await fetch(
        `/api/admin/media/review/${encodeURIComponent(editingCluster.docId)}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ suggestedTagIds }),
          credentials: 'same-origin',
        }
      );
      const payload = (await response.json().catch(() => ({}))) as ApiErrorResponse;
      if (!response.ok) {
        throw new Error(payload.message || `HTTP ${response.status}`);
      }
      feedback.showSuccess('Updated pile tags.', 'Edit pile tags');
      setEditingCluster(null);
      setDraftPileTagIds([]);
      await onClustersChanged();
    } catch (error) {
      feedback.showError(
        error instanceof Error ? error.message : 'Failed to save pile tags.',
        'Edit pile tags'
      );
    } finally {
      setSavingPileTags(false);
    }
  }, [allTags, draftPileTagIds, editingCluster, feedback, onClustersChanged]);

  const draftPileSelectedTags = useMemo(
    () => allTags.filter((tag) => tag.docId && draftPileTagIds.includes(tag.docId)),
    [allTags, draftPileTagIds]
  );

  const mergeTargetOptions = useMemo(
    () =>
      sections
        .filter(
          (section) =>
            section.cluster?.docId &&
            section.cluster.docId !== mergingCluster?.docId &&
            !section.isUnsorted
        )
        .map((section) => ({
          clusterId: section.cluster!.docId!,
          title: section.title,
          memberCount: section.memberMediaIds.length,
        })),
    [mergingCluster?.docId, sections]
  );

  const openMergePile = useCallback((cluster: ProvisionalCluster) => {
    setMergingCluster(cluster);
    setMergeTargetClusterId('');
  }, []);

  const closeMergePile = useCallback(() => {
    if (busyClusterId) return;
    setMergingCluster(null);
    setMergeTargetClusterId('');
  }, [busyClusterId]);

  const mergePile = useCallback(async () => {
    if (!mergingCluster?.docId || !mergeTargetClusterId) return;
    const target = mergeTargetOptions.find((option) => option.clusterId === mergeTargetClusterId);
    if (!target) return;
    const confirmed = await feedback.confirm({
      title: 'Merge these piles?',
      message: `Move ${mergingCluster.memberMediaIds.length} photos from “${mergingCluster.title}” into “${target.title}” (${target.memberCount} photos). “${target.title}” keeps its name and pile tags. Source pile tags are not transferred.`,
      confirmLabel: 'Merge piles',
      cancelLabel: 'Cancel',
    });
    if (!confirmed) return;

    setBusyClusterId(mergingCluster.docId);
    try {
      const response = await fetch(
        `/api/admin/media/review/${encodeURIComponent(mergingCluster.docId)}/actions`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'same-origin',
          body: JSON.stringify({ action: 'merge', targetClusterId: mergeTargetClusterId }),
        }
      );
      const payload = (await response.json().catch(() => ({}))) as ApiErrorResponse;
      if (!response.ok) throw new Error(payload.message || `HTTP ${response.status}`);
      setMergingCluster(null);
      setMergeTargetClusterId('');
      await onClustersChanged();
      feedback.showSuccess(`Merged into “${target.title}”.`, 'Piles merged');
    } catch (error) {
      feedback.showError(error instanceof Error ? error.message : 'Failed to merge piles.', 'Merge failed');
    } finally {
      setBusyClusterId(null);
    }
  }, [feedback, mergeTargetClusterId, mergeTargetOptions, mergingCluster, onClustersChanged]);

  const createCardFromPile = useCallback(
    async (cluster: ProvisionalCluster) => {
      if (!cluster.docId || cluster.memberMediaIds.length === 0) return;
      setBusyClusterId(cluster.docId);
      try {
        const tagResponse = await fetch(
          `/api/admin/media/review/${encodeURIComponent(cluster.docId)}/actions`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'accept-tags' }),
            credentials: 'same-origin',
          }
        );
        const tagPayload = (await tagResponse.json().catch(() => ({}))) as ApiErrorResponse;
        if (!tagResponse.ok) {
          throw new Error(tagPayload.message || `HTTP ${tagResponse.status}`);
        }

        const galleryMedia = cluster.memberMediaIds
          .map((mediaId, order) => ({ mediaId, order }))
          .filter((item) => item.mediaId);
        const firstMediaId = galleryMedia[0]?.mediaId;
        if (!firstMediaId) {
          throw new Error('No valid media in pile.');
        }

        const cardResponse = await fetch('/api/cards', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: cluster.title.slice(0, 120) || 'Untitled',
            type: 'gallery',
            status: 'draft',
            coverImageId: firstMediaId,
            galleryMedia,
          }),
          credentials: 'same-origin',
        });
        const cardPayload = (await cardResponse.json().catch(() => ({}))) as ApiErrorResponse & {
          docId?: string;
        };
        if (!cardResponse.ok) {
          throw new Error(cardPayload.message || `HTTP ${cardResponse.status}`);
        }

        const pileResponse = await fetch(
          `/api/admin/media/review/${encodeURIComponent(cluster.docId)}/actions`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'accept-pile' }),
            credentials: 'same-origin',
          }
        );
        if (!pileResponse.ok) {
          const pilePayload = (await pileResponse.json().catch(() => ({}))) as ApiErrorResponse;
          throw new Error(pilePayload.message || `HTTP ${pileResponse.status}`);
        }

        await fetchMedia(1);
        await onClustersChanged();
        feedback.showSuccess('Created draft card from pile.', 'Create card');
        if (cardPayload.docId) {
          router.push(`/admin/studio?card=${encodeURIComponent(cardPayload.docId)}`);
        }
      } catch (error) {
        feedback.showError(
          error instanceof Error ? error.message : 'Failed to create card from pile.',
          'Create card'
        );
      } finally {
        setBusyClusterId(null);
      }
    },
    [feedback, fetchMedia, onClustersChanged, router]
  );

  return (
    <div className={styles.container} style={{ ['--media-grid-min-col' as string]: `${gridTileMinPx}px` }}>
      {sections.map((section) => {
        const expanded = sectionExpanded[section.id] ?? true;
        const members = section.memberMediaIds
          .map((id) => resolveMediaById(id) ?? mediaById.get(id))
          .filter((item): item is NonNullable<typeof item> => Boolean(item?.docId));
        const cluster = section.cluster;
        const isBusy = Boolean(cluster?.docId && busyClusterId === cluster.docId);
        const canCreateCard = Boolean(cluster && members.length > 0);
        const pileTagCount = cluster ? flattenSuggestedTagIds(cluster.suggestedTagIds).length : 0;
        const dropId = section.isUnsorted
          ? STORY_PILE_UNSORTED_DROP_ID
          : cluster?.docId
            ? storyPileDropId(cluster.docId)
            : null;

        const headerInner = (
          <>
            <div className={styles.sectionHeaderMain}>
              {!section.isUnsorted ? (
                <span className={styles.sectionChevron} aria-hidden="true">
                  {expanded ? '▾' : '▸'}
                </span>
              ) : null}
              <div className={styles.sectionTitleBlock}>
                <h3 className={styles.sectionTitle}>{section.title}</h3>
                {section.subtitle ? (
                  <p className={styles.sectionSubtitle}>{section.subtitle}</p>
                ) : null}
              </div>
              <span className={styles.sectionCount}>
                {members.length} photo{members.length === 1 ? '' : 's'}
                {section.oversized ? ' · large pile' : ''}
              </span>
            </div>
            {cluster && !section.isUnsorted ? (
              <div
                className={styles.sectionActions}
                onClick={(event) => event.stopPropagation()}
                onKeyDown={(event) => event.stopPropagation()}
              >
                <button
                  type="button"
                  className={styles.sectionActionButton}
                  disabled={isBusy}
                  onClick={() => openEditPileTags(cluster)}
                >
                  Edit pile tags
                </button>
                <button
                  type="button"
                  className={styles.sectionActionButton}
                  disabled={isBusy || pileTagCount === 0}
                  onClick={() => void applyTagsToPhotos(cluster)}
                >
                  Apply to photos
                </button>
                <button
                  type="button"
                  className={styles.sectionActionButton}
                  disabled={isBusy || pileOptions.length < 2}
                  onClick={() => openMergePile(cluster)}
                >
                  Merge
                </button>
                <button
                  type="button"
                  className={`${styles.sectionActionButton} ${styles.sectionActionButtonPrimary}`}
                  disabled={isBusy || !canCreateCard}
                  onClick={() => void createCardFromPile(cluster)}
                >
                  Create card
                </button>
                <button
                  type="button"
                  className={`${styles.sectionActionButton} ${styles.sectionActionButtonDanger}`}
                  disabled={isBusy}
                  onClick={() => void dismissCluster(cluster)}
                >
                  Dismiss
                </button>
              </div>
            ) : null}
          </>
        );

        return (
          <section
            key={section.id}
            className={`${styles.section} ${section.isUnsorted ? styles.sectionUnsorted : ''}`}
          >
            {dropId ? (
              <StoryPileHeaderDropZone
                id={dropId}
                ariaLabel={
                  section.isUnsorted
                    ? 'Unsorted drop target: drop photos here to remove from piles'
                    : `Pile drop target: ${section.title}`
                }
                className={`${styles.sectionHeader} ${section.isUnsorted ? styles.sectionHeaderStatic : ''} ${styles.sectionHeaderDropZone}`}
              >
                <div
                  role={section.isUnsorted ? undefined : 'button'}
                  tabIndex={section.isUnsorted ? undefined : 0}
                  aria-expanded={section.isUnsorted ? undefined : expanded}
                  className={styles.sectionHeaderInteract}
                  onClick={
                    section.isUnsorted
                      ? undefined
                      : () => onSectionExpandedChange(section.id, !expanded)
                  }
                  onKeyDown={
                    section.isUnsorted
                      ? undefined
                      : (event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            onSectionExpandedChange(section.id, !expanded);
                          }
                        }
                  }
                >
                  {headerInner}
                </div>
              </StoryPileHeaderDropZone>
            ) : (
              <div
                className={`${styles.sectionHeader} ${section.isUnsorted ? styles.sectionHeaderStatic : ''}`}
              >
                {headerInner}
              </div>
            )}

            {showTagSuggestions && cluster && !section.isUnsorted ? (
              <div className={styles.tagChipRow}>
                {DIMENSION_ORDER.map((dimension) => {
                  const tagIds = suggestedTagsForDimension(cluster.suggestedTagIds, dimension);
                  if (tagIds.length === 0) return null;
                  return tagIds.map((tagId) => {
                    const tag = tagById.get(tagId);
                    if (!tag) return null;
                    return (
                      <span
                        key={`${section.id}-${dimension}-${tagId}`}
                        className={`${styles.tagChip} ${dimensionChipClass(dimension)} ${reviewStyles.tagChip}`}
                      >
                        {getTagPathDisplay(tag, tagById)}
                      </span>
                    );
                  });
                })}
              </div>
            ) : null}

            {section.oversized && expanded ? (
              <p className={styles.oversizedNote}>
                Large pile ({members.length} photos). Dismiss returns members to Unsorted, or move photos
                to another pile.
              </p>
            ) : null}

            {expanded ? (
              members.length > 0 ? (
                <div className={styles.sectionBody}>
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
                    emptyMessage="No media in this pile."
                    stackById={stackById}
                    showAllStacks={showAllStacks}
                    expandedStackIds={expandedStackIds}
                    onToggleStackExpand={onToggleStackExpand}
                    onDissolveStack={onDissolveStack}
                    onMediaContextMenu={handleMediaContextMenu}
                  />
                </div>
              ) : (
                <p className={styles.emptySection}>
                  {section.isUnsorted
                    ? 'All scoped media are assigned to story piles.'
                    : 'Empty pile — drag media here or use Move to….'}
                </p>
              )
            ) : null}
          </section>
        );
      })}

      {contextMenu ? (
        <MediaPileMembershipContextMenu
          state={contextMenu}
          piles={pileOptions}
          onClose={closeContextMenu}
          onMove={(targetClusterId) => void handleContextMove(targetClusterId)}
          onRemove={() => void handleContextRemove()}
          onNewPile={() => void handleContextNewPile()}
        />
      ) : null}

      <EditModal
        isOpen={Boolean(mergingCluster)}
        onClose={closeMergePile}
        title={mergingCluster ? `Merge pile — ${mergingCluster.title}` : 'Merge pile'}
      >
        <label className={styles.mergePileField}>
          <span>Merge into</span>
          <select
            value={mergeTargetClusterId}
            onChange={(event) => setMergeTargetClusterId(event.target.value)}
            disabled={Boolean(busyClusterId)}
            aria-label="Merge into pile"
          >
            <option value="">Select a pile</option>
            {mergeTargetOptions.map((option) => (
              <option key={option.clusterId} value={option.clusterId}>
                {option.title} ({option.memberCount} photos)
              </option>
            ))}
          </select>
        </label>
        <div className={styles.pileTagEditActions}>
          <button type="button" className={styles.sectionActionButton} onClick={closeMergePile} disabled={Boolean(busyClusterId)}>
            Cancel
          </button>
          <button
            type="button"
            className={`${styles.sectionActionButton} ${styles.sectionActionButtonPrimary}`}
            onClick={() => void mergePile()}
            disabled={!mergeTargetClusterId || Boolean(busyClusterId)}
          >
            {busyClusterId ? 'Merging…' : 'Review merge'}
          </button>
        </div>
      </EditModal>

      <EditModal
        isOpen={Boolean(editingCluster)}
        onClose={closeEditPileTags}
        title={editingCluster ? `Pile tags — ${editingCluster.title}` : 'Pile tags'}
        size="wideTall"
      >
        <MacroTagSelector
          startExpanded
          suppressOverlay
          selectedTags={draftPileSelectedTags}
          allTags={allTags}
          onChange={setDraftPileTagIds}
          collapsedSummary="none"
        />
        <div className={styles.pileTagEditActions}>
          <button
            type="button"
            className={styles.sectionActionButton}
            onClick={closeEditPileTags}
            disabled={savingPileTags}
          >
            Cancel
          </button>
          <button
            type="button"
            className={`${styles.sectionActionButton} ${styles.sectionActionButtonPrimary}`}
            onClick={() => void savePileTags()}
            disabled={savingPileTags}
          >
            {savingPileTags ? 'Saving…' : 'Save pile tags'}
          </button>
        </div>
      </EditModal>
    </div>
  );
}
