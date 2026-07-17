'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { useAppFeedback } from '@/components/providers/AppFeedbackProvider';
import type { Card } from '@/lib/types/card';
import {
  contentHtmlToPlainBodyDraft,
  isReaderBodyQuickEditEligible,
} from '@/lib/utils/readerBodyQuickEdit';
import {
  patchReaderQuickEdit,
  type ReaderQuickEditInitial,
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
  initial: ReaderQuickEditInitial;
  onSaved: (savedCard: Card) => void;
}) {
  const feedback = useAppFeedback();
  const [title, setTitle] = useState(initial.title);
  const [subtitle, setSubtitle] = useState(initial.subtitle);
  const [excerpt, setExcerpt] = useState(initial.excerpt);
  const [body, setBody] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const bodyEligible = useMemo(
    () => isReaderBodyQuickEditEligible(initial.content),
    [initial.content]
  );
  const initialBodyDraft = useMemo(
    () => contentHtmlToPlainBodyDraft(initial.content),
    [initial.content]
  );

  useEffect(() => {
    if (!open) return;
    setTitle(initial.title);
    setSubtitle(initial.subtitle);
    setExcerpt(initial.excerpt);
    setBody(initialBodyDraft);
  }, [initial.excerpt, initial.subtitle, initial.title, initialBodyDraft, open]);

  const isDirty = useMemo(() => {
    const draft = {
      title: title.trim(),
      subtitle: subtitle.trim(),
      excerpt: excerpt.trim(),
      body: body.trim(),
    };
    return (
      draft.title !== initial.title.trim() ||
      draft.subtitle !== (initial.subtitle ?? '').trim() ||
      draft.excerpt !== (initial.excerpt ?? '').trim() ||
      (bodyEligible && draft.body !== initialBodyDraft.trim())
    );
  }, [body, bodyEligible, excerpt, initial.excerpt, initial.subtitle, initial.title, initialBodyDraft, subtitle, title]);

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
      body: body.trim(),
    };

    if (!draft.title) {
      feedback.showError('Add a title before saving this card.', 'Title required');
      return;
    }

    if (!isDirty) {
      onClose();
      return;
    }

    setIsSaving(true);
    try {
      const saved = await patchReaderQuickEdit(cardId, draft, initial);
      if (!saved) {
        onClose();
        return;
      }
      onSaved(saved);
      onClose();
    } catch (err) {
      feedback.showError(
        err instanceof Error ? err.message : 'This card could not be saved. Your changes are still here. Try again.',
        'Card not saved'
      );
    } finally {
      setIsSaving(false);
    }
  }, [body, cardId, excerpt, feedback, initial, isDirty, onClose, onSaved, subtitle, title]);

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

  const sheet = (
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

        {bodyEligible ? (
          <label className={styles.field} htmlFor="reader-quick-edit-body">
            <span className={styles.label}>Body</span>
            <textarea
              id="reader-quick-edit-body"
              className={`${styles.textarea} ${styles.bodyTextarea}`}
              value={body}
              onChange={(event) => setBody(event.target.value)}
              disabled={isSaving}
              placeholder="Story body"
            />
          </label>
        ) : (
          <p className={styles.bodyHint}>
            This card&apos;s body includes images or rich formatting. Use the full editor on a wider screen or
            Studio for body edits.
          </p>
        )}

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

  return typeof document !== 'undefined' ? createPortal(sheet, document.body) : sheet;
}
