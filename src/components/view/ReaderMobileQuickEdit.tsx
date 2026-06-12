'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { useAppFeedback } from '@/components/providers/AppFeedbackProvider';
import type { Card } from '@/lib/types/card';
import {
  buildReaderMetadataQuickEditPatch,
  patchReaderCard,
  type ReaderMetadataQuickEditInitial,
} from '@/lib/utils/readerCardPatchReconcile';
import styles from './ReaderMobileQuickEdit.module.css';

export default function ReaderMobileQuickEdit({
  open,
  onClose,
  cardId,
  initial,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  cardId: string;
  initial: ReaderMetadataQuickEditInitial;
  onSaved: (savedCard: Card) => void;
}) {
  const feedback = useAppFeedback();
  const [title, setTitle] = useState(initial.title);
  const [subtitle, setSubtitle] = useState(initial.subtitle);
  const [excerpt, setExcerpt] = useState(initial.excerpt);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTitle(initial.title);
    setSubtitle(initial.subtitle);
    setExcerpt(initial.excerpt);
  }, [open, initial.title, initial.subtitle, initial.excerpt]);

  const isDirty = useMemo(() => {
    const draft = {
      title: title.trim(),
      subtitle: subtitle.trim(),
      excerpt: excerpt.trim(),
    };
    return (
      draft.title !== initial.title.trim() ||
      draft.subtitle !== (initial.subtitle ?? '').trim() ||
      draft.excerpt !== (initial.excerpt ?? '').trim()
    );
  }, [excerpt, initial.excerpt, initial.subtitle, initial.title, subtitle, title]);

  const requestClose = useCallback(async () => {
    if (isSaving) return;
    if (isDirty) {
      const shouldDiscard = await feedback.confirm({
        title: 'Discard changes?',
        message: 'You have unsaved text edits.',
        confirmLabel: 'Discard',
        cancelLabel: 'Keep editing',
        tone: 'danger',
      });
      if (!shouldDiscard) return;
    }
    onClose();
  }, [feedback, isDirty, isSaving, onClose]);

  const handleSave = useCallback(async () => {
    const draft = {
      title: title.trim(),
      subtitle: subtitle.trim(),
      excerpt: excerpt.trim(),
    };

    if (!draft.title) {
      feedback.showError('Title is required.', 'Cannot save');
      return;
    }

    const patch = buildReaderMetadataQuickEditPatch(draft, initial);
    if (Object.keys(patch).length === 0) {
      onClose();
      return;
    }

    setIsSaving(true);
    try {
      const saved = await patchReaderCard(cardId, patch);
      onSaved(saved);
      feedback.showSuccess('Card updated.');
      onClose();
    } catch (err) {
      feedback.showError(err instanceof Error ? err.message : 'Failed to save card.', 'Could not save');
    } finally {
      setIsSaving(false);
    }
  }, [cardId, excerpt, feedback, initial, onClose, onSaved, subtitle, title]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        void requestClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, requestClose]);

  if (!open) return null;

  return (
    <div className={styles.overlay} role="presentation" onClick={() => void requestClose()}>
      <div
        className={styles.sheet}
        role="dialog"
        aria-modal="true"
        aria-labelledby="reader-mobile-quick-edit-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className={styles.header}>
          <h2 id="reader-mobile-quick-edit-title" className={styles.title}>
            Quick edit
          </h2>
          <button
            type="button"
            className={styles.closeButton}
            onClick={() => void requestClose()}
            aria-label="Close quick edit"
            disabled={isSaving}
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        <label className={styles.field} htmlFor="reader-quick-edit-title">
          <span className={styles.label}>Title</span>
          <input
            id="reader-quick-edit-title"
            className={styles.input}
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            autoComplete="off"
            disabled={isSaving}
          />
        </label>

        <label className={styles.field} htmlFor="reader-quick-edit-subtitle">
          <span className={styles.label}>Subtitle</span>
          <input
            id="reader-quick-edit-subtitle"
            className={styles.input}
            value={subtitle}
            onChange={(event) => setSubtitle(event.target.value)}
            autoComplete="off"
            disabled={isSaving}
          />
        </label>

        <label className={styles.field} htmlFor="reader-quick-edit-excerpt">
          <span className={styles.label}>Excerpt</span>
          <textarea
            id="reader-quick-edit-excerpt"
            className={styles.textarea}
            value={excerpt}
            onChange={(event) => setExcerpt(event.target.value)}
            disabled={isSaving}
            placeholder="Custom excerpt"
          />
        </label>

        <div className={styles.actions}>
          <button
            type="button"
            className={styles.secondaryButton}
            onClick={() => void requestClose()}
            disabled={isSaving}
          >
            Cancel
          </button>
          <button
            type="button"
            className={styles.primaryButton}
            onClick={() => void handleSave()}
            disabled={isSaving || !isDirty}
          >
            {isSaving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
