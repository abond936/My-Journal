'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useCardForm } from '@/components/providers/CardFormProvider';
import styles from './page.module.css';

export type CardEditPageChromeProps = {
  cardId: string | null;
  onDelete: () => Promise<void>;
  onDuplicate: () => Promise<void>;
  isDeleting: boolean;
  isDuplicating: boolean;
};

/**
 * Header actions for card edit; must render inside CardFormProvider (dirty-state / leave confirm).
 */
export default function CardEditPageChrome({
  cardId,
  onDelete,
  onDuplicate,
  isDeleting,
  isDuplicating,
}: CardEditPageChromeProps) {
  const router = useRouter();
  const { confirmLeaveIfDirty } = useCardForm();

  const handleBack = () => {
    if (!confirmLeaveIfDirty()) return;
    router.back();
  };

  const handleDelete = async () => {
    if (!confirmLeaveIfDirty()) return;
    await onDelete();
  };

  const handleDuplicate = async () => {
    if (!confirmLeaveIfDirty()) return;
    await onDuplicate();
  };

  return (
    <div className={styles.formHeader}>
      <h1>{cardId ? 'Edit Card' : 'Create New Card'}</h1>
      <div className={styles.actions}>
        {cardId && (
          <>
            <button
              type="button"
              onClick={handleDelete}
              className={styles.deleteOutlineButton}
              disabled={isDeleting}
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </button>
            <button
              type="button"
              onClick={handleDuplicate}
              className={styles.duplicateButton}
              disabled={isDuplicating}
            >
              {isDuplicating ? 'Duplicating...' : 'Duplicate'}
            </button>
          </>
        )}
        <button type="button" onClick={handleBack} className={styles.cancelButton}>
          Back
        </button>
        <button type="submit" form="card-form" className={styles.submitButton}>
          {cardId ? 'Save' : 'Create Card'}
        </button>
      </div>
    </div>
  );
}
