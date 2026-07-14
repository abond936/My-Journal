'use client';

import React, { useCallback, useMemo, useState } from 'react';
import { useTag } from '@/components/providers/TagProvider';
import { useMedia } from '@/components/providers/MediaProvider';
import { useAppFeedback } from '@/components/providers/AppFeedbackProvider';
import { useStudioShellOptional } from '@/components/admin/studio/StudioShellContext';
import MacroTagSelector from '@/components/admin/studio/cards/MacroTagSelector';
import EditModal from '@/components/admin/studio/cards/EditModal';
import type { Tag } from '@/lib/types/tag';
import { getTagPathDisplay } from '@/lib/utils/tagDimensionResolve';
import { appendDimensionalTagQueryParams } from '@/lib/utils/tagUtils';
import type { TagDimension } from '@/lib/utils/tagDisplay';
import {
  isImportFacingTag,
  isLikelyBucketImportTag,
  isValidMapTargetTag,
  RECONCILE_BULK_WARN_MEDIA_COUNT,
  suggestMapTargetTags,
} from '@/lib/utils/tagReconciliationUtils';
import studioStyles from '@/components/admin/studio/StudioWorkspace.module.css';
import styles from './tagReconciliationPane.module.css';

export function countIncomingReconcileTags(allTags: Tag[]): number {
  const tagById = new Map(allTags.filter((t) => t.docId).map((tag) => [tag.docId!, tag]));
  return allTags.filter(
    (tag) => tag.docId && isImportFacingTag(tag, tagById) && (tag.mediaCount ?? 0) > 0
  ).length;
}

export default function TagReconciliationPane() {
  const feedback = useAppFeedback();
  const studioShell = useStudioShellOptional();
  const { tags: allTags } = useTag();
  const { bulkApplyTags } = useMedia();
  const [busyTagId, setBusyTagId] = useState<string | null>(null);
  const [mapTargetBySource, setMapTargetBySource] = useState<Record<string, string[]>>({});
  const [confirmState, setConfirmState] = useState<{
    sourceTagId: string;
    targetTagIds: string[];
  } | null>(null);
  const [pickerExpandedBySource, setPickerExpandedBySource] = useState<Record<string, boolean>>({});

  const tagById = useMemo(
    () => new Map(allTags.filter((t) => t.docId).map((tag) => [tag.docId!, tag])),
    [allTags]
  );

  const authorTags = useMemo(
    () => allTags.filter((tag) => tag.docId && !isImportFacingTag(tag, tagById)),
    [allTags, tagById]
  );

  const incomingTags = useMemo(
    () =>
      allTags
        .filter((tag) => tag.docId && isImportFacingTag(tag, tagById))
        .filter((tag) => (tag.mediaCount ?? 0) > 0)
        .sort((a, b) => (b.mediaCount ?? 0) - (a.mediaCount ?? 0)),
    [allTags, tagById]
  );

  const selectedSourceTagId = studioShell?.organizeReconcileSourceTagId ?? null;

  const selectSourceTag = useCallback(
    (tagId: string) => {
      if (!studioShell) return;
      const next = selectedSourceTagId === tagId ? null : tagId;
      studioShell.setOrganizeReconcileSourceTagId(next);
      if (next) {
        studioShell.openMediaPane();
      }
    },
    [selectedSourceTagId, studioShell]
  );

  const previewTarget = useCallback(
    (targetTagId: string | null) => {
      studioShell?.setOrganizeReconcileTargetTagId(targetTagId);
    },
    [studioShell]
  );

  const remapTagOnMedia = async (fromTagId: string, toTagIds: string[]) => {
    const targetId = toTagIds.find(Boolean);
    if (!targetId || targetId === fromTagId) return;
    setBusyTagId(fromTagId);
    try {
      const sourceTag = tagById.get(fromTagId);
      const dimension = sourceTag?.dimension;
      if (!dimension) throw new Error('Source tag dimension missing.');

      const collected: string[] = [];
      const params = new URLSearchParams({ limit: '250', includeTotal: 'false' });
      appendDimensionalTagQueryParams({ [dimension as TagDimension]: [fromTagId] }, params);
      const response = await fetch(`/api/media?${params.toString()}`, { credentials: 'same-origin' });
      if (!response.ok) throw new Error(`Failed to load media for tag (${response.status}).`);
      const payload = (await response.json()) as { media?: { docId: string }[] };
      collected.push(...(payload.media ?? []).map((item) => item.docId).filter(Boolean));

      if ((sourceTag?.mediaCount ?? 0) > collected.length) {
        feedback.showError(
          `Loaded ${collected.length} of ${sourceTag?.mediaCount ?? collected.length} media — refine with Browse filters and bulk edit for the rest.`,
          'Partial map'
        );
      }

      if (collected.length === 0) {
        feedback.showSuccess('No media still uses that tag.', 'Nothing to map');
        return;
      }

      await bulkApplyTags(collected, {
        tagIds: [targetId],
        mode: 'add',
      });
      await bulkApplyTags(collected, {
        tagIds: [fromTagId],
        mode: 'remove',
      });

      feedback.showSuccess(
        `Mapped ${collected.length} media item${collected.length === 1 ? '' : 's'} to the selected tag.`,
        'Tag mapped'
      );
      if (selectedSourceTagId === fromTagId) {
        studioShell?.clearOrganizeReconcile();
      }
    } catch (error) {
      feedback.showError(
        error instanceof Error ? error.message : 'Failed to map tag on media.',
        'Map failed'
      );
    } finally {
      setBusyTagId(null);
      setConfirmState(null);
    }
  };

  const requestMap = (sourceTagId: string, targetTagIds: string[]) => {
    const targetId = targetTagIds.find(Boolean);
    if (!targetId) return;
    const targetTag = tagById.get(targetId);
    if (!targetTag || !isValidMapTargetTag(targetTag, tagById)) {
      feedback.showError('Choose a specific author tag in the tree — not a dimension label or folder.', 'Invalid target');
      return;
    }
    setConfirmState({ sourceTagId, targetTagIds: [targetId] });
  };

  const confirmSourceTag = confirmState ? tagById.get(confirmState.sourceTagId) : null;
  const confirmTargetTag = confirmState?.targetTagIds[0]
    ? tagById.get(confirmState.targetTagIds[0]!)
    : null;

  return (
    <div className={styles.container}>
      <p className={styles.lead}>
        Import tags still assigned on media. Select a row to preview those images in{' '}
        <strong>Media</strong>, pick a target in your tag tree, then confirm the remap.
      </p>
      {incomingTags.length === 0 ? (
        <p className={studioStyles.tagPaneBody}>No import-facing tags with media assignments.</p>
      ) : (
        <ul className={styles.list}>
          {incomingTags.map((tag) => {
            const suggestions = suggestMapTargetTags(tag, authorTags, tagById);
            const selectedTargets = mapTargetBySource[tag.docId!] ?? [];
            const isSelected = selectedSourceTagId === tag.docId;
            const isBucket = isLikelyBucketImportTag(tag, tagById);
            const mediaCount = tag.mediaCount ?? 0;
            const pickerExpanded = pickerExpandedBySource[tag.docId!] ?? false;

            return (
              <li
                key={tag.docId}
                className={`${styles.row} ${isSelected ? styles.rowSelected : ''}`}
              >
                <button
                  type="button"
                  className={styles.rowSelectButton}
                  onClick={() => selectSourceTag(tag.docId!)}
                  aria-pressed={isSelected}
                >
                  <div className={styles.rowMain}>
                    <span className={styles.tagName}>{getTagPathDisplay(tag, tagById)}</span>
                    <span className={styles.meta}>
                      {mediaCount} media · {tag.dimension ?? 'tag'}
                      {isSelected ? ' · showing in Media' : ''}
                    </span>
                    {isBucket ? (
                      <p className={styles.bucketNote}>
                        Broad import bucket — review media in Media before mapping all items to one tag.
                      </p>
                    ) : null}
                    {suggestions.length > 0 ? (
                      <div className={styles.suggestions}>
                        <span className={styles.suggestLabel}>Suggested:</span>
                        {suggestions.map(({ tag: candidate }) => (
                          <button
                            key={candidate.docId}
                            type="button"
                            className={styles.suggestButton}
                            disabled={busyTagId === tag.docId}
                            onMouseEnter={() => previewTarget(candidate.docId!)}
                            onMouseLeave={() => previewTarget(null)}
                            onClick={(event) => {
                              event.stopPropagation();
                              previewTarget(candidate.docId!);
                              requestMap(tag.docId!, [candidate.docId!]);
                            }}
                          >
                            {candidate.name}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <p className={styles.noSuggest}>No automatic match — choose a target below.</p>
                    )}
                  </div>
                </button>
                <div className={styles.mapAction}>
                  <MacroTagSelector
                    selectedTags={selectedTargets
                      .map((id) => tagById.get(id))
                      .filter((item): item is Tag => Boolean(item))}
                    allTags={authorTags.filter((item) => isValidMapTargetTag(item, tagById))}
                    onChange={(nextIds) => {
                      setMapTargetBySource((prev) => ({ ...prev, [tag.docId!]: nextIds }));
                      previewTarget(nextIds[0] ?? null);
                    }}
                    expanded={pickerExpanded}
                    onExpandedChange={(open) =>
                      setPickerExpandedBySource((prev) => ({ ...prev, [tag.docId!]: open }))
                    }
                    collapsedSummary="sparseTrees"
                  />
                  {!pickerExpanded ? (
                    <button
                      type="button"
                      className={styles.chooseButton}
                      disabled={busyTagId === tag.docId}
                      onClick={() =>
                        setPickerExpandedBySource((prev) => ({ ...prev, [tag.docId!]: true }))
                      }
                    >
                      Choose target…
                    </button>
                  ) : null}
                  <button
                    type="button"
                    className={styles.applyButton}
                    disabled={busyTagId === tag.docId || selectedTargets.length === 0}
                    onClick={() => requestMap(tag.docId!, selectedTargets)}
                  >
                    {busyTagId === tag.docId ? 'Mapping…' : 'Map media…'}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <EditModal
        isOpen={Boolean(confirmState && confirmSourceTag && confirmTargetTag)}
        onClose={() => setConfirmState(null)}
        title="Confirm tag map"
      >
        {confirmSourceTag && confirmTargetTag ? (
          <div className={styles.confirmBody}>
            <p>
              Add <strong>{getTagPathDisplay(confirmTargetTag, tagById)}</strong> and remove{' '}
              <strong>{getTagPathDisplay(confirmSourceTag, tagById)}</strong> on up to{' '}
              {Math.min(confirmSourceTag.mediaCount ?? 0, 250)} loaded media item
              {(confirmSourceTag.mediaCount ?? 0) === 1 ? '' : 's'}
              {(confirmSourceTag.mediaCount ?? 0) > 250 ? ' (first page)' : ''}.
            </p>
            {isLikelyBucketImportTag(confirmSourceTag, tagById) ||
            (confirmSourceTag.mediaCount ?? 0) > RECONCILE_BULK_WARN_MEDIA_COUNT ? (
              <p className={styles.confirmWarn}>
                This import tag looks like a bucket or covers many items. Confirm only if one target tag
                is correct for all of them.
              </p>
            ) : null}
            <div className={styles.confirmActions}>
              <button
                type="button"
                className={styles.applyButton}
                disabled={busyTagId === confirmSourceTag.docId}
                onClick={() =>
                  void remapTagOnMedia(confirmSourceTag.docId!, confirmState!.targetTagIds)
                }
              >
                Confirm map
              </button>
              <button
                type="button"
                className={styles.chooseButton}
                onClick={() => setConfirmState(null)}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : null}
      </EditModal>
    </div>
  );
}
