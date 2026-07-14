'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import JournalImage from '@/components/common/JournalImage';
import MacroTagSelector from '@/components/admin/studio/cards/MacroTagSelector';
import { useTag } from '@/components/providers/TagProvider';
import { useMedia } from '@/components/providers/MediaProvider';
import { useAppFeedback } from '@/components/providers/AppFeedbackProvider';
import type { Media } from '@/lib/types/photo';
import type { ProvisionalCluster, ReviewLens, SuggestedTagIdsByDimension } from '@/lib/types/provisionalCluster';
import { flattenSuggestedTagIds, mergeSuggestedTagIds } from '@/lib/types/provisionalCluster';
import { tagIdsFromFlatList, MAX_REVIEW_PILE_SIZE } from '@/lib/utils/reviewClusterHeuristics';
import { DIMENSION_LABEL, DIMENSION_ORDER, type TagDimension } from '@/lib/utils/tagDisplay';
import { getStudioDisplayUrl } from '@/lib/utils/photoUtils';
import { getTagPathDisplay } from '@/lib/utils/tagDimensionResolve';
import styles from './mediaReviewPanel.module.css';

const LENS_OPTIONS: { value: ReviewLens; label: string }[] = [
  { value: 'suggested', label: 'Suggested' },
  { value: 'when', label: 'When' },
  { value: 'where', label: 'Where' },
  { value: 'who', label: 'Who' },
  { value: 'what', label: 'What (occasion)' },
];

type ApiErrorResponse = {
  message?: string;
  code?: string;
};

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

function suggestedTagsForDimension(
  suggested: SuggestedTagIdsByDimension,
  dimension: TagDimension
): string[] {
  return suggested[dimension] ?? [];
}

type MediaReviewPanelProps = {
  embedded?: boolean;
};

export default function MediaReviewPanel({ embedded = false }: MediaReviewPanelProps) {
  const router = useRouter();
  const feedback = useAppFeedback();
  const { tags: allTags } = useTag();
  const { resolveMediaById, fetchMedia } = useMedia();
  const [lens, setLens] = useState<ReviewLens>('suggested');
  const [clusters, setClusters] = useState<ProvisionalCluster[]>([]);
  const [loading, setLoading] = useState(false);
  const [busyClusterId, setBusyClusterId] = useState<string | null>(null);
  const [splitClusterId, setSplitClusterId] = useState<string | null>(null);
  const [splitSelection, setSplitSelection] = useState<Set<string>>(new Set());

  const tagById = useMemo(() => new Map(allTags.map((tag) => [tag.docId!, tag])), [allTags]);

  const loadClusters = useCallback(async (nextLens: ReviewLens) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/media/review?lens=${encodeURIComponent(nextLens)}`, {
        cache: 'no-store',
        credentials: 'same-origin',
      });
      const payload = (await response.json().catch(() => ({}))) as {
        clusters?: ProvisionalCluster[];
        message?: string;
      };
      if (!response.ok) {
        throw new Error(payload.message || `HTTP ${response.status}`);
      }
      setClusters(payload.clusters ?? []);
    } catch (error) {
      feedback.showError(
        error instanceof Error ? error.message : 'Failed to load review piles.',
        'Review load failed'
      );
    } finally {
      setLoading(false);
    }
  }, [feedback]);

  useEffect(() => {
    void loadClusters(lens);
  }, [lens, loadClusters]);

  const generateClusters = useCallback(
    async (mediaIds?: string[]) => {
      setLoading(true);
      try {
        const response = await fetch('/api/admin/media/review', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ lens, mediaIds }),
          credentials: 'same-origin',
        });
        const payload = (await response.json().catch(() => ({}))) as {
          clusters?: ProvisionalCluster[];
          created?: number;
          message?: string;
        };
        if (!response.ok) {
          throw new Error(payload.message || `HTTP ${response.status}`);
        }
        setClusters(payload.clusters ?? []);
        feedback.showSuccess(
          payload.created === 1 ? 'Built 1 review pile.' : `Built ${payload.created ?? 0} review piles.`,
          'Review refreshed'
        );
      } catch (error) {
        feedback.showError(
          error instanceof Error ? error.message : 'Failed to generate review piles.',
          'Review generate failed'
        );
      } finally {
        setLoading(false);
      }
    },
    [feedback, lens]
  );

  const patchSuggestedTags = useCallback(
    async (clusterId: string, suggestedTagIds: SuggestedTagIdsByDimension) => {
      const response = await fetch(`/api/admin/media/review/${encodeURIComponent(clusterId)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ suggestedTagIds }),
        credentials: 'same-origin',
      });
      const payload = (await response.json().catch(() => ({}))) as {
        cluster?: ProvisionalCluster;
        message?: string;
      };
      if (!response.ok) {
        throw new Error(payload.message || `HTTP ${response.status}`);
      }
      if (payload.cluster) {
        setClusters((prev) => prev.map((item) => (item.docId === clusterId ? payload.cluster! : item)));
      }
    },
    []
  );

  const runAction = useCallback(
    async (
      clusterId: string,
      action: 'accept-tags' | 'accept-pile' | 'dismiss' | 'split',
      splitOffMediaIds?: string[]
    ) => {
      setBusyClusterId(clusterId);
      try {
        const response = await fetch(
          `/api/admin/media/review/${encodeURIComponent(clusterId)}/actions`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action, splitOffMediaIds }),
            credentials: 'same-origin',
          }
        );
        const payload = (await response.json().catch(() => ({}))) as ApiErrorResponse & {
          original?: ProvisionalCluster;
          split?: ProvisionalCluster;
        };
        if (!response.ok) {
          throw new Error(payload.message || `HTTP ${response.status}`);
        }

        if (action === 'split' && payload.original && payload.split) {
          setClusters((prev) =>
            prev
              .map((item) => (item.docId === clusterId ? payload.original! : item))
              .concat(payload.split!)
          );
          setSplitClusterId(null);
          setSplitSelection(new Set());
          feedback.showSuccess('Split pile into two review groups.', 'Split complete');
          return;
        }

        setClusters((prev) => prev.filter((item) => item.docId !== clusterId));
        if (action === 'accept-tags' || action === 'accept-pile') {
          await fetchMedia(1);
        }
        if (action === 'accept-tags') {
          feedback.showSuccess('Applied suggested tags to pile media.', 'Tags accepted');
        } else if (action === 'accept-pile') {
          feedback.showSuccess('Accepted pile and applied tags.', 'Pile accepted');
        } else {
          feedback.showSuccess('Dismissed provisional pile.', 'Dismissed');
        }
      } catch (error) {
        feedback.showError(
          error instanceof Error ? error.message : 'Review action failed.',
          'Action failed'
        );
      } finally {
        setBusyClusterId(null);
      }
    },
    [feedback, fetchMedia]
  );

  const removeSuggestedTag = async (
    cluster: ProvisionalCluster,
    dimension: TagDimension,
    tagId: string,
    event: React.MouseEvent
  ) => {
    event.preventDefault();
    event.stopPropagation();
    const next = {
      ...cluster.suggestedTagIds,
      [dimension]: suggestedTagsForDimension(cluster.suggestedTagIds, dimension).filter((id) => id !== tagId),
    };
    try {
      await patchSuggestedTags(cluster.docId!, next);
    } catch (error) {
      feedback.showError(
        error instanceof Error ? error.message : 'Failed to update tags.',
        'Update failed'
      );
    }
  };

  const acceptTagsAndCreateCard = useCallback(
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

        setClusters((prev) => prev.filter((item) => item.docId !== cluster.docId));
        await fetchMedia(1);
        feedback.showSuccess('Applied tags, created a draft card, and closed the pile.', 'Pile promoted');
        if (cardPayload.docId) {
          router.push(`/admin/studio?card=${encodeURIComponent(cardPayload.docId)}`);
        }
      } catch (error) {
        feedback.showError(
          error instanceof Error ? error.message : 'Failed to promote pile to card.',
          'Promote failed'
        );
      } finally {
        setBusyClusterId(null);
      }
    },
    [feedback, fetchMedia, router]
  );

  const addSuggestedTags = async (cluster: ProvisionalCluster, tagIds: string[]) => {
    const dimensional = tagIdsFromFlatList(tagIds, allTags);
    const merged = mergeSuggestedTagIds(cluster.suggestedTagIds, dimensional);
    for (const dimension of DIMENSION_ORDER) {
      const existing = new Set(suggestedTagsForDimension(cluster.suggestedTagIds, dimension));
      const added = dimensional[dimension] ?? [];
      merged[dimension] = [...existing, ...added.filter((id) => !existing.has(id))];
    }
    try {
      await patchSuggestedTags(cluster.docId!, merged);
    } catch (error) {
      feedback.showError(
        error instanceof Error ? error.message : 'Failed to update tags.',
        'Update failed'
      );
    }
  };

  const resolveMemberMedia = (memberMediaIds: string[]): Media[] =>
    memberMediaIds
      .map((id) => resolveMediaById(id))
      .filter((item): item is Media => Boolean(item?.docId));

  return (
    <div className={styles.reviewPanel} data-embedded={embedded ? 'true' : 'false'}>
      <div className={styles.reviewToolbar}>
        <label className={styles.reviewToolbarGroup}>
          <span className="sr-only">Review lens</span>
          <select
            className={styles.lensSelect}
            value={lens}
            onChange={(event) => setLens(event.target.value as ReviewLens)}
            aria-label="Change grouping lens"
          >
            {LENS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          className={styles.toolbarButton}
          onClick={() => void generateClusters()}
          disabled={loading}
        >
          {loading ? 'Working…' : 'Refresh piles'}
        </button>
      </div>
      <p className={styles.reviewHint}>
        {lens === 'suggested'
          ? 'Suggested groups combine capture day and import folder. Same photo may appear in multiple piles until you accept tags or dismiss.'
          : 'Provisional piles only — accepting tags writes confirmed media tags; dismiss removes suggestions only.'}
      </p>

      {loading && clusters.length === 0 ? (
        <div className={styles.loadingState}>Loading review piles…</div>
      ) : null}

      {!loading && clusters.length === 0 ? (
        <div className={styles.emptyState}>
          No review piles for this lens yet. Import media or choose Refresh piles to build groups from recent
          media.
        </div>
      ) : null}

      <div className={styles.reviewList}>
        {clusters.map((cluster) => {
          const members = resolveMemberMedia(cluster.memberMediaIds);
          const isSplitting = splitClusterId === cluster.docId;
          const isBusy = busyClusterId === cluster.docId;
          const flatTagCount = flattenSuggestedTagIds(cluster.suggestedTagIds).length;
          const isOversized = cluster.memberMediaIds.length > MAX_REVIEW_PILE_SIZE;

          return (
            <article key={cluster.docId} className={styles.pileCard}>
              <div className={styles.pileHeader}>
                <div className={styles.pileTitleBlock}>
                  <h3 className={styles.pileTitle}>{cluster.title}</h3>
                  <p className={styles.pileReason}>{cluster.reason}</p>
                  {isOversized ? (
                    <p className={styles.pileOversized}>
                      Large pile ({cluster.memberMediaIds.length} photos). Use Split or refresh piles after
                      import to get folder-sized groups.
                    </p>
                  ) : null}
                  {cluster.coverageNote ? (
                    <p className={styles.pileCoverage}>{cluster.coverageNote}</p>
                  ) : null}
                </div>
                <div className={styles.pileActions}>
                  <button
                    type="button"
                    className={styles.pileActionButton}
                    disabled={isBusy || flatTagCount === 0}
                    onClick={() => void runAction(cluster.docId!, 'accept-tags')}
                  >
                    Accept tags only
                  </button>
                  <button
                    type="button"
                    className={`${styles.pileActionButton} ${styles.pileActionButtonPrimary}`}
                    disabled={isBusy}
                    onClick={() => void acceptTagsAndCreateCard(cluster)}
                  >
                    Accept & create card
                  </button>
                  <button
                    type="button"
                    className={styles.pileActionButton}
                    disabled={isBusy}
                    onClick={() => void runAction(cluster.docId!, 'accept-pile')}
                  >
                    Accept pile
                  </button>
                  <button
                    type="button"
                    className={styles.pileActionButton}
                    disabled={isBusy}
                    onClick={() => {
                      if (isSplitting) {
                        setSplitClusterId(null);
                        setSplitSelection(new Set());
                        return;
                      }
                      setSplitClusterId(cluster.docId!);
                      setSplitSelection(new Set());
                    }}
                  >
                    {isSplitting ? 'Cancel split' : 'Split'}
                  </button>
                  <button
                    type="button"
                    className={`${styles.pileActionButton} ${styles.pileActionButtonDanger}`}
                    disabled={isBusy}
                    onClick={() => void runAction(cluster.docId!, 'dismiss')}
                  >
                    Dismiss
                  </button>
                </div>
              </div>

              <div className={styles.thumbStrip}>
                {cluster.memberMediaIds.map((mediaId) => {
                  const mediaItem = members.find((item) => item.docId === mediaId);
                  const selected = splitSelection.has(mediaId);
                  return (
                    <button
                      key={mediaId}
                      type="button"
                      className={`${styles.thumbButton} ${isSplitting ? styles.thumbButtonSelectable : ''} ${
                        selected ? styles.thumbButtonSelected : ''
                      }`}
                      onClick={() => {
                        if (!isSplitting) return;
                        setSplitSelection((prev) => {
                          const next = new Set(prev);
                          if (next.has(mediaId)) next.delete(mediaId);
                          else next.add(mediaId);
                          return next;
                        });
                      }}
                      aria-pressed={isSplitting ? selected : undefined}
                      aria-label={mediaItem?.filename ?? mediaId}
                    >
                      <JournalImage
                        src={mediaItem ? getStudioDisplayUrl(mediaItem) : ''}
                        alt=""
                        width={56}
                        height={56}
                        className={styles.thumbImage}
                      />
                    </button>
                  );
                })}
              </div>

              {isSplitting ? (
                <div className={styles.splitBar}>
                  <span className={styles.reviewHint}>Select photos to move into a new pile.</span>
                  <button
                    type="button"
                    className={styles.pileActionButton}
                    disabled={isBusy || splitSelection.size === 0}
                    onClick={() =>
                      void runAction(cluster.docId!, 'split', Array.from(splitSelection))
                    }
                  >
                    Split selected
                  </button>
                </div>
              ) : null}

              <div className={styles.tagSection}>
                <span className={styles.tagSectionLabel}>Suggested tags</span>
                {DIMENSION_ORDER.map((dimension) => {
                  const tagIds = suggestedTagsForDimension(cluster.suggestedTagIds, dimension);
                  if (tagIds.length === 0) return null;
                  return (
                    <div key={dimension} className={styles.tagChipRow}>
                      <span className={styles.tagSectionLabel}>{DIMENSION_LABEL[dimension]}:</span>
                      {tagIds.map((tagId) => {
                        const tag = tagById.get(tagId);
                        const label = tag
                          ? getTagPathDisplay(tag, tagById)
                          : tagId;
                        return (
                          <span
                            key={tagId}
                            className={`${styles.tagChip} ${dimensionChipClass(dimension)}`}
                          >
                            {label}
                            <button
                              type="button"
                              className={styles.tagChipRemove}
                              aria-label={`Remove ${label}`}
                              onClick={(event) => void removeSuggestedTag(cluster, dimension, tagId, event)}
                            >
                              ×
                            </button>
                          </span>
                        );
                      })}
                    </div>
                  );
                })}
                <div className={styles.addTagsSlot}>
                  <MacroTagSelector
                    selectedTags={flattenSuggestedTagIds(cluster.suggestedTagIds)
                      .map((id) => tagById.get(id))
                      .filter((tag): tag is NonNullable<typeof tag> => Boolean(tag))}
                    allTags={allTags}
                    onChange={(nextTagIds) => void addSuggestedTags(cluster, nextTagIds)}
                    collapsedSummary="sparseTrees"
                    startExpanded={false}
                  />
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}

export async function generateReviewClustersForImport(mediaIds: string[]): Promise<void> {
  if (mediaIds.length === 0) return;
  await fetch('/api/admin/media/review', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ lens: 'suggested', mediaIds }),
    credentials: 'same-origin',
  });
}
