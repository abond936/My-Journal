'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import JournalImage from '@/components/common/JournalImage';
import MediaEditModal from '@/components/admin/studio/media/MediaEditModal';
import { useAppFeedback } from '@/components/providers/AppFeedbackProvider';
import { useMedia } from '@/components/providers/MediaProvider';
import type { Media } from '@/lib/types/photo';
import type {
  MediaDuplicateDecision,
  MediaDuplicateReviewDecision,
  MediaDuplicateReviewStatus,
} from '@/lib/utils/mediaDuplicateEvidence';
import { getStudioDisplayUrl } from '@/lib/utils/photoUtils';
import styles from './MediaExactMatchesReview.module.css';

type ReviewGroup = {
  digest: string;
  media: Media[];
  decision: MediaDuplicateReviewDecision | null;
};

type ListResponse = {
  ok?: boolean;
  groups?: ReviewGroup[];
  message?: string;
};

function decisionLabel(decision: MediaDuplicateReviewDecision | null): string {
  if (!decision || decision.decision === 'defer') return decision ? 'Deferred' : 'Unresolved';
  return decision.decision === 'same_asset' ? 'Same asset' : 'Keep both';
}

export default function MediaExactMatchesReview() {
  const feedback = useAppFeedback();
  const { updateMedia } = useMedia();
  const [status, setStatus] = useState<MediaDuplicateReviewStatus>('unresolved');
  const [groups, setGroups] = useState<ReviewGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingPairKey, setSavingPairKey] = useState<string | null>(null);
  const [canonicalByPair, setCanonicalByPair] = useState<Record<string, string>>({});
  const [editingMediaId, setEditingMediaId] = useState<string | null>(null);

  const loadGroups = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/media/duplicates?status=${status}`, {
        cache: 'no-store',
        credentials: 'same-origin',
      });
      const payload = (await response.json().catch(() => ({}))) as ListResponse;
      if (!response.ok) throw new Error(payload.message ?? 'Could not load exact matches.');
      const nextGroups = payload.groups ?? [];
      setGroups(nextGroups);
      setCanonicalByPair(current => {
        const next = { ...current };
        for (const group of nextGroups) {
          const pairKey = group.media.map(item => item.docId).sort().join('__');
          if (group.decision?.canonicalMediaId) next[pairKey] = group.decision.canonicalMediaId;
        }
        return next;
      });
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Could not load exact matches.');
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => {
    void loadGroups();
  }, [loadGroups]);

  const editingGroup = useMemo(
    () => groups.find(group => group.media.some(item => item.docId === editingMediaId)) ?? null,
    [editingMediaId, groups]
  );

  const saveDecision = useCallback(async (
    group: ReviewGroup,
    decision: MediaDuplicateDecision
  ) => {
    const mediaIds = group.media.map(item => item.docId);
    if (mediaIds.length !== 2) {
      feedback.showError('This match group cannot be reviewed as a pair.', 'Could not save review');
      return;
    }
    const pairKey = [...mediaIds].sort().join('__');
    const canonicalMediaId = canonicalByPair[pairKey];
    if (decision === 'same_asset' && !canonicalMediaId) {
      feedback.showError('Choose which record should be retained during a later reconciliation.', 'Choose a record');
      return;
    }
    if (decision === 'same_asset') {
      const confirmed = await feedback.confirm({
        title: 'Record same asset?',
        message: 'This records your preferred library record. Nothing will be merged or deleted yet.',
        confirmLabel: 'Record decision',
        cancelLabel: 'Cancel',
      });
      if (!confirmed) return;
    }
    setSavingPairKey(pairKey);
    try {
      const response = await fetch('/api/admin/media/duplicates', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mediaIds,
          decision,
          ...(decision === 'same_asset' ? { canonicalMediaId } : {}),
        }),
      });
      const payload = (await response.json().catch(() => ({}))) as { message?: string };
      if (!response.ok) throw new Error(payload.message ?? 'Could not save this review.');
      feedback.showSuccess(
        decision === 'same_asset'
          ? 'Preferred record saved. No media were merged or deleted.'
          : decision === 'keep_both'
            ? 'Both records will remain in the library.'
            : 'This match remains available for later review.',
        'Review saved'
      );
      await loadGroups();
    } catch (saveError) {
      feedback.showError(
        saveError instanceof Error ? saveError.message : 'Could not save this review.',
        'Could not save review'
      );
    } finally {
      setSavingPairKey(null);
    }
  }, [canonicalByPair, feedback, loadGroups]);

  const handleSaveMediaFields = useCallback(async (
    mediaId: string,
    updates: Partial<Pick<Media, 'caption' | 'objectPosition' | 'tags' | 'subjectTagIds'>>
  ) => {
    const updated = await updateMedia(mediaId, updates);
    if (!updated) throw new Error('Could not update this media record.');
    setGroups(current => current.map(group => ({
      ...group,
      media: group.media.map(item => item.docId === mediaId ? updated : item),
    })));
  }, [updateMedia]);

  return (
    <section className={styles.review} aria-label="Exact media matches">
      <div className={styles.reviewHeader}>
        <div>
          <h3 className={styles.title}>Exact matches</h3>
          <p className={styles.intro}>Review records with identical original file bytes. Decisions do not merge or delete media.</p>
        </div>
        <div className={styles.statusTabs} role="group" aria-label="Exact match review status">
          {(['unresolved', 'reviewed', 'all'] as const).map(option => (
            <button
              key={option}
              type="button"
              className={`${styles.statusButton} ${status === option ? styles.statusButtonActive : ''}`}
              onClick={() => setStatus(option)}
              aria-pressed={status === option}
            >
              {option[0]!.toUpperCase() + option.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {loading ? <p className={styles.state}>Loading exact matches…</p> : null}
      {error ? (
        <div className={styles.error} role="alert">
          <span>{error}</span>
          <button type="button" onClick={() => void loadGroups()}>Try again</button>
        </div>
      ) : null}
      {!loading && !error && groups.length === 0 ? (
        <p className={styles.state}>No {status === 'all' ? '' : `${status} `}exact matches.</p>
      ) : null}

      <div className={styles.groupList}>
        {groups.map(group => {
          const pairKey = group.media.map(item => item.docId).sort().join('__');
          const selectedCanonical = canonicalByPair[pairKey] ?? '';
          const saving = savingPairKey === pairKey;
          return (
            <article key={`${group.digest}-${pairKey}`} className={styles.groupCard}>
              <div className={styles.groupHeading}>
                <span className={styles.decisionBadge}>{decisionLabel(group.decision)}</span>
                <span>{group.media.length} identical records</span>
              </div>
              <div className={styles.mediaPair}>
                {group.media.map(item => (
                  <div key={item.docId} className={styles.mediaCard}>
                    <button
                      type="button"
                      className={styles.previewButton}
                      onClick={() => setEditingMediaId(item.docId)}
                      aria-label={`Open details for ${item.filename}`}
                    >
                      <span className={styles.preview}>
                        <JournalImage
                          src={getStudioDisplayUrl(item)}
                          alt={item.caption?.trim() || item.filename}
                          fill
                          className={styles.image}
                          sizes="(max-width: 800px) 90vw, 360px"
                        />
                      </span>
                    </button>
                    <div className={styles.metadata}>
                      <strong title={item.filename}>{item.filename}</strong>
                      <span title={item.sourcePath}>{item.sourcePath || 'No source path'}</span>
                      <span>{item.tags?.length ?? 0} tags · {item.referencedByCardIds?.length ?? 0} card references</span>
                      <span>{item.caption?.trim() || 'No caption'}</span>
                    </div>
                    <label className={styles.canonicalChoice}>
                      <input
                        type="radio"
                        name={`canonical-${pairKey}`}
                        value={item.docId}
                        checked={selectedCanonical === item.docId}
                        onChange={() => setCanonicalByPair(current => ({ ...current, [pairKey]: item.docId }))}
                      />
                      <span>Keep this record</span>
                    </label>
                  </div>
                ))}
              </div>
              <div className={styles.actions}>
                <button type="button" disabled={saving || !selectedCanonical} onClick={() => void saveDecision(group, 'same_asset')}>
                  Same asset
                </button>
                <button type="button" disabled={saving} onClick={() => void saveDecision(group, 'keep_both')}>
                  Keep both
                </button>
                <button type="button" disabled={saving} onClick={() => void saveDecision(group, 'defer')}>
                  Defer
                </button>
                {saving ? <span className={styles.saving}>Saving…</span> : null}
              </div>
            </article>
          );
        })}
      </div>

      <MediaEditModal
        isOpen={Boolean(editingMediaId && editingGroup)}
        mediaItems={editingGroup?.media ?? []}
        selectedMediaId={editingMediaId}
        onSelectMedia={setEditingMediaId}
        onClose={() => setEditingMediaId(null)}
        onSaveMediaFields={handleSaveMediaFields}
        onMediaUpdated={updated => setGroups(current => current.map(group => ({
          ...group,
          media: group.media.map(item => item.docId === updated.docId ? updated : item),
        })))}
      />
    </section>
  );
}
