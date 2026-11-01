'use client';

import { useEffect, useMemo, useState } from 'react';
import EditModal from '@/components/admin/studio/cards/EditModal';
import type { Tag } from '@/lib/types/tag';
import type { TagSplitReview, TagSplitRecordKind } from '@/lib/services/tagSplitService';
import { throwIfJsonApiFailed } from '@/lib/utils/httpJsonApiErrors';
import styles from './WhoRelationshipModal.module.css';

type Selection = Record<TagSplitRecordKind, Set<string>>;

function emptySelection(): Selection {
  return { card: new Set(), media: new Set(), question: new Set() };
}

export function TagSplitModal({ source, onClose, onComplete }: {
  source: Tag | null;
  onClose: () => void;
  onComplete: () => Promise<void>;
}) {
  const [review, setReview] = useState<TagSplitReview | null>(null);
  const [newName, setNewName] = useState('');
  const [selection, setSelection] = useState<Selection>(emptySelection);
  const [loading, setLoading] = useState(false);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [operationId, setOperationId] = useState<string | null>(null);

  useEffect(() => {
    if (!source?.docId) return;
    const controller = new AbortController();
    setReview(null);
    setNewName('');
    setSelection(emptySelection());
    setOperationId(null);
    setError(null);
    setLoading(true);
    void fetch(`/api/tags/${source.docId}/split`, { signal: controller.signal, cache: 'no-store' })
      .then(async (response) => {
        const body = await response.json().catch(() => null);
        throwIfJsonApiFailed(response, body, 'Unable to review this Tag split.');
        const nextReview = body as TagSplitReview;
        setReview(nextReview);
        if (nextReview.resumableOperation) {
          setOperationId(nextReview.resumableOperation.operationId);
          setNewName(nextReview.resumableOperation.newName);
          setSelection({
            card: new Set(nextReview.resumableOperation.selection.cardIds),
            media: new Set(nextReview.resumableOperation.selection.mediaIds),
            question: new Set(nextReview.resumableOperation.selection.questionIds),
          });
        }
      })
      .catch((caught) => {
        if (caught instanceof DOMException && caught.name === 'AbortError') return;
        setError(caught instanceof Error ? caught.message : 'Unable to review this Tag split.');
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [source]);

  const selectedCount = useMemo(() =>
    selection.card.size + selection.media.size + selection.question.size,
  [selection]);
  if (!source?.docId) return null;

  const toggle = (kind: TagSplitRecordKind, id: string) => {
    setSelection((current) => {
      const next = { ...current, [kind]: new Set(current[kind]) };
      if (next[kind].has(id)) next[kind].delete(id);
      else next[kind].add(id);
      return next;
    });
    setOperationId(null);
  };

  const submit = async () => {
    if (!review?.canSplit || !newName.trim() || selectedCount < 1) return;
    const retryToken = operationId ?? crypto.randomUUID();
    setOperationId(retryToken);
    setWorking(true);
    setError(null);
    try {
      const response = await fetch(`/api/tags/${source.docId}/split`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          operationId: retryToken,
          newName: newName.trim(),
          selection: {
            cardIds: [...selection.card],
            mediaIds: [...selection.media],
            questionIds: [...selection.question],
          },
        }),
      });
      const body = await response.json().catch(() => null);
      throwIfJsonApiFailed(response, body, 'Unable to split this Tag.');
      await onComplete();
      onClose();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to split this Tag. Retry to resume the same operation.');
    } finally {
      setWorking(false);
    }
  };

  return <EditModal isOpen onClose={working ? () => undefined : onClose} title={`Split: ${source.name}`} size="wide">
    <div className={styles.form}>
      <p className={styles.status}>Create a sibling Tag, then choose the exact records whose direct assignment and subject use should move to it. Unselected records and child Tags remain with {source.name}.</p>
      {review?.directChildCount ? <p className={styles.status}>{review.directChildCount} direct child Tag{review.directChildCount === 1 ? '' : 's'} will remain beneath {source.name}.</p> : null}
      <label>New Tag name<input value={newName} onChange={(event) => setNewName(event.target.value)} disabled={working || Boolean(operationId)} /></label>
      {loading ? <p className={styles.status}>Loading exact affected records…</p> : null}
      {review && !review.canSplit ? <p className={styles.error}>{review.blockedReason}</p> : null}
      {review?.canSplit ? <div className={styles.rows}>
        {review.candidates.map((candidate) => <label className={styles.row} key={`${candidate.kind}:${candidate.id}`}>
          <span>
            <input
              type="checkbox"
              checked={selection[candidate.kind].has(candidate.id)}
              onChange={() => toggle(candidate.kind, candidate.id)}
              disabled={working || Boolean(operationId)}
            />{' '}
            {candidate.label}
          </span>
          <span>{candidate.kind === 'question' ? 'Prompt' : candidate.kind === 'media' ? 'Media' : 'Card'} · {candidate.alreadyMoved ? 'already moved; retry pending' : `${candidate.directAssignment ? 'assigned' : ''}${candidate.directAssignment && candidate.subjectAssignment ? ' + ' : ''}${candidate.subjectAssignment ? 'subject' : ''}`}</span>
        </label>)}
      </div> : null}
      {error ? <p className={styles.error}>{error}</p> : null}
      <p className={styles.status}>{selectedCount} record{selectedCount === 1 ? '' : 's'} selected. Nothing moves until you confirm.</p>
      <div className={styles.actions}>
        <button type="button" disabled={working} onClick={onClose}>Cancel</button>
        <button type="button" disabled={working || !review?.canSplit || !newName.trim() || selectedCount < 1} onClick={() => void submit()}>
          {working ? 'Applying reviewed split…' : operationId ? 'Retry reviewed split' : 'Apply reviewed split'}
        </button>
      </div>
    </div>
  </EditModal>;
}
