'use client';

import React, { useCallback, useEffect } from 'react';
import { Copy, Save, Trash2, Undo2, X } from 'lucide-react';
import { useCardForm } from '@/components/providers/CardFormProvider';
import { useAppFeedback } from '@/components/providers/AppFeedbackProvider';
import styles from './ReaderCardEditModal.module.css';

export function ReaderCardEditActions({
  onClose,
  onDelete,
  onDuplicate,
  isDeleting,
  isDuplicating,
}: {
  onClose: () => void;
  onDelete: () => Promise<void>;
  onDuplicate: () => Promise<void>;
  isDeleting: boolean;
  isDuplicating: boolean;
}) {
  const { confirmLeaveIfDirtyAsync, isDirty, resetForm, formState } = useCardForm();
  const feedback = useAppFeedback();
  const { isSaving } = formState;

  const handleClose = async () => {
    if (!(await confirmLeaveIfDirtyAsync())) return;
    onClose();
  };
  const handleCancel = async () => {
    if (!isDirty || isSaving) return;
    const shouldDiscard = await feedback.confirm({
      title: 'Discard unsaved changes?',
      message: 'Discard your unsaved changes and reset the form?',
      confirmLabel: 'Discard',
      cancelLabel: 'Keep editing',
      tone: 'danger',
    });
    if (shouldDiscard) resetForm();
  };
  const handleDelete = async () => {
    if (await confirmLeaveIfDirtyAsync()) await onDelete();
  };
  const handleDuplicate = async () => {
    if (await confirmLeaveIfDirtyAsync()) await onDuplicate();
  };

  return (
    <div className={styles.formActions}>
      <button type="button" onClick={() => void handleDelete()} className={styles.deleteButton} disabled={isDeleting} aria-label={isDeleting ? 'Deleting card' : 'Delete card'} title={isDeleting ? 'Deleting card' : 'Delete card'}>
        <Trash2 size={16} aria-hidden="true" />
      </button>
      <button type="button" onClick={() => void handleDuplicate()} className={styles.cancelButton} disabled={isDuplicating} aria-label={isDuplicating ? 'Duplicating card' : 'Duplicate card'} title={isDuplicating ? 'Duplicating card' : 'Duplicate card'}>
        <Copy size={16} aria-hidden="true" />
      </button>
      <button type="button" onClick={() => void handleClose()} className={styles.cancelButton} disabled={isSaving} aria-label="Close compose window" title="Close compose window">
        <X size={16} aria-hidden="true" />
      </button>
      <button type="button" onClick={() => void handleCancel()} className={styles.cancelButton} disabled={!isDirty || isSaving} aria-label="Discard changes" title="Discard changes">
        <Undo2 size={16} aria-hidden="true" />
      </button>
      <button type="submit" form="card-form" className={styles.saveButton} disabled={!isDirty || isSaving} aria-label={isSaving ? 'Saving card' : 'Save card'} title={isSaving ? 'Saving card' : 'Save card'}>
        <Save size={16} aria-hidden="true" />
        <span>Save</span>
      </button>
    </div>
  );
}

export function ReaderCardEditTitleBar({
  title,
  onDragStart,
  onClose,
}: {
  title: string;
  onDragStart: (event: React.PointerEvent<HTMLDivElement>) => void;
  onClose: () => void;
}) {
  const { confirmLeaveIfDirtyAsync, formState } = useCardForm();
  const handleClose = useCallback(() => {
    void (async () => {
      if (await confirmLeaveIfDirtyAsync()) onClose();
    })();
  }, [confirmLeaveIfDirtyAsync, onClose]);

  return (
    <div className={styles.titleBar} onPointerDown={onDragStart}>
      <div className={styles.titleBarDragAffordance} aria-hidden="true"><span /><span /><span /></div>
      <h2 className={styles.titleBarTitle}>{title}</h2>
      <button type="button" className={styles.titleBarCloseButton} onClick={handleClose} disabled={formState.isSaving} aria-label="Close compose window">×</button>
    </div>
  );
}

export function ReaderCardEditBaselineSync({ syncKey }: { syncKey: string }) {
  const { syncPersistableBaseline } = useCardForm();
  useEffect(() => {
    const timer = window.setTimeout(syncPersistableBaseline, 0);
    return () => window.clearTimeout(timer);
  }, [syncKey, syncPersistableBaseline]);
  return null;
}
