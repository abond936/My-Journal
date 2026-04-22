'use client';

import React, { useCallback } from 'react';
import { useCardForm } from '@/components/providers/CardFormProvider';
import styles from './StudioWorkspace.module.css';

/**
 * Save / Cancel for Studio Compose — must render inside CardFormProvider.
 * Save uses `form="card-form"` so submit matches full-page CardForm (editor content + save notice).
 */
export default function StudioComposeFormActions() {
  const { isDirty, resetForm, formState } = useCardForm();
  const { isSaving } = formState;

  const handleCancel = useCallback(() => {
    if (!isDirty) return;
    if (!window.confirm('Discard unsaved changes?')) return;
    resetForm();
  }, [isDirty, resetForm]);

  return (
    <div className={styles.studioComposeFormActions}>
      <button
        type="button"
        className={styles.studioComposeCancelButton}
        disabled={!isDirty || isSaving}
        onClick={handleCancel}
      >
        Cancel
      </button>
      <button
        type="submit"
        form="card-form"
        className={styles.studioComposeSaveButton}
        disabled={!isDirty || isSaving}
      >
        {isSaving ? 'Saving…' : 'Save'}
      </button>
    </div>
  );
}
