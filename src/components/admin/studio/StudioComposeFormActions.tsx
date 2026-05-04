'use client';

import React, { useCallback, useMemo, useState } from 'react';
import EditModal from '@/components/admin/card-admin/EditModal';
import { useCardForm } from '@/components/providers/CardFormProvider';
import { useStudioShellOptional } from '@/components/admin/studio/StudioShellContext';
import { buildSingleCardDeletePrompt, fetchCardDeleteParents } from '@/lib/utils/cardDeleteWarnings';
import styles from './StudioWorkspace.module.css';

/**
 * Save / Cancel for Studio Compose — must render inside CardFormProvider.
 * Save uses `form="card-form"` so submit matches full-page CardForm (editor content + save notice).
 */
export default function StudioComposeFormActions() {
  const { isDirty, resetForm, formState } = useCardForm();
  const { isSaving } = formState;
  const studioShell = useStudioShellOptional();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteDialogLoading, setDeleteDialogLoading] = useState(false);
  const [deleteBlocked, setDeleteBlocked] = useState(false);
  const [deleteDialogMessage, setDeleteDialogMessage] = useState('');
  const cardId = formState.cardData.docId || null;

  const handleCancel = useCallback(() => {
    if (!isDirty) return;
    if (!window.confirm('Discard unsaved changes?')) return;
    resetForm();
  }, [isDirty, resetForm]);

  const openDeleteDialog = useCallback(async () => {
    if (!cardId) return;
    setDeleteDialogLoading(true);
    setDeleteDialogOpen(true);
    try {
      const { parentTitles, verificationFailed } = await fetchCardDeleteParents(cardId);
      const prompt = buildSingleCardDeletePrompt({
        title: formState.cardData.title,
        isCollectionRoot: formState.cardData.isCollectionRoot,
        childCount: formState.cardData.childrenIds?.length ?? 0,
        parentTitles,
        verificationFailed,
      });
      setDeleteBlocked(prompt.blocked);
      setDeleteDialogMessage(prompt.message);
    } finally {
      setDeleteDialogLoading(false);
    }
  }, [cardId, formState.cardData.childrenIds, formState.cardData.isCollectionRoot, formState.cardData.title]);

  const deleteMessageLines = useMemo(
    () => deleteDialogMessage.split('\n').filter(Boolean),
    [deleteDialogMessage]
  );

  return (
    <>
      <div className={styles.studioComposeFormActions}>
        {cardId ? (
          <button
            type="button"
            className={styles.studioComposeDeleteButton}
            disabled={isSaving || deleteDialogLoading}
            onClick={() => void openDeleteDialog()}
          >
            Delete
          </button>
        ) : null}
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
      <EditModal
        isOpen={deleteDialogOpen}
        onClose={() => {
          if (deleteDialogLoading) return;
          setDeleteDialogOpen(false);
        }}
        title={deleteBlocked ? 'Cannot delete card' : 'Delete card'}
      >
        <div className={styles.studioComposeDeleteDialogBody}>
          {deleteDialogLoading ? (
            <p className={styles.studioComposeDeleteDialogText}>Checking delete rules…</p>
          ) : (
            <>
              {deleteMessageLines.map((line, index) => (
                <p
                  key={`${line}-${index}`}
                  className={
                    index === 0
                      ? styles.studioComposeDeleteDialogLead
                      : styles.studioComposeDeleteDialogText
                  }
                >
                  {line}
                </p>
              ))}
              <div className={styles.studioComposeDeleteDialogActions}>
                {deleteBlocked ? (
                  <button
                    type="button"
                    className={styles.studioComposeCancelButton}
                    onClick={() => setDeleteDialogOpen(false)}
                  >
                    Close
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      className={styles.studioComposeDeleteButton}
                      onClick={async () => {
                        if (!cardId || !studioShell) return;
                        const deleted = await studioShell.deleteSelectedCard(cardId);
                        if (deleted) {
                          setDeleteDialogOpen(false);
                        }
                      }}
                    >
                      Delete
                    </button>
                    <button
                      type="button"
                      className={styles.studioComposeCancelButton}
                      onClick={() => setDeleteDialogOpen(false)}
                    >
                      Cancel
                    </button>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </EditModal>
    </>
  );
}
