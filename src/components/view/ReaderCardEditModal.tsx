'use client';

import React, { useCallback, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import useSWR, { mutate as globalMutate } from 'swr';
import CardForm from '@/components/admin/card-admin/CardForm';
import { CardFormProvider, useCardForm } from '@/components/providers/CardFormProvider';
import { StudioCardFormStudioProvider } from '@/components/admin/studio/studioCardFormStudioContext';
import type { Card, CardUpdate } from '@/lib/types/card';
import type { Tag } from '@/lib/types/tag';
import styles from './ReaderCardEditModal.module.css';
import studioStyles from '@/components/admin/studio/StudioWorkspace.module.css';
import modalStyles from '@/components/admin/card-admin/EditModal.module.css';

const fetcher = (url: string) =>
  fetch(url, { cache: 'no-store', credentials: 'same-origin' }).then((res) => res.json());

function ModalActions({
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
  const { confirmLeaveIfDirty, isDirty, resetForm, formState } = useCardForm();
  const { isSaving } = formState;

  const handleClose = () => {
    if (!confirmLeaveIfDirty()) return;
    onClose();
  };

  const handleCancel = () => {
    if (!isDirty || isSaving) return;
    if (!window.confirm('Discard unsaved changes?')) return;
    resetForm();
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
    <div className={studioStyles.studioComposeFormActions}>
      <button
        type="button"
        onClick={handleDelete}
        className={studioStyles.studioComposeCancelButton}
        disabled={isDeleting}
      >
        {isDeleting ? 'Deleting…' : 'Delete'}
      </button>
      <button
        type="button"
        onClick={handleDuplicate}
        className={studioStyles.studioComposeCancelButton}
        disabled={isDuplicating}
      >
        {isDuplicating ? 'Duplicating…' : 'Duplicate'}
      </button>
      <button
        type="button"
        onClick={handleClose}
        className={studioStyles.studioComposeCancelButton}
        disabled={isSaving}
      >
        Close
      </button>
      <button
        type="button"
        onClick={handleCancel}
        className={studioStyles.studioComposeCancelButton}
        disabled={!isDirty || isSaving}
      >
        Cancel
      </button>
      <button
        type="submit"
        form="card-form"
        className={studioStyles.studioComposeSaveButton}
        disabled={!isDirty || isSaving}
      >
        {isSaving ? 'Saving…' : 'Save'}
      </button>
    </div>
  );
}

export default function ReaderCardEditModal({
  cardId,
  returnTo,
  className,
  onBeforeOpen,
  children,
}: {
  cardId: string;
  returnTo: string;
  className?: string;
  onBeforeOpen?: () => void;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [activeCardId, setActiveCardId] = useState(cardId);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDuplicating, setIsDuplicating] = useState(false);

  const { data: card, mutate: mutateCard } = useSWR<Card | null>(
    isOpen ? `/api/cards/${activeCardId}` : null,
    fetcher,
    { revalidateOnFocus: false, revalidateOnReconnect: false }
  );
  const { data: tags } = useSWR<Tag[]>(
    isOpen ? '/api/tags' : null,
    fetcher,
    { revalidateOnFocus: false, revalidateOnReconnect: false }
  );

  const modalReady = Boolean(card && tags);

  const openModal = () => {
    onBeforeOpen?.();
    setActiveCardId(cardId);
    setIsOpen(true);
  };

  const closeModal = useCallback(() => {
    setIsOpen(false);
  }, []);

  const handleSave = useCallback(
    async (cardData: CardUpdate): Promise<Card | null> => {
      const response = await fetch(`/api/cards/${activeCardId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cardData),
        cache: 'no-store',
        credentials: 'same-origin',
      });
      const savedData = (await response.json()) as Card & { error?: string };
      if (!response.ok) {
        throw new Error(savedData.error || 'Failed to save card.');
      }
      await mutateCard(savedData, false);
      void globalMutate((key) => typeof key === 'string' && key.startsWith('/api/cards?'), undefined, {
        revalidate: true,
      });
      router.refresh();
      return savedData;
    },
    [activeCardId, mutateCard, router]
  );

  const handleDelete = useCallback(async () => {
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/cards/${activeCardId}`, {
        method: 'DELETE',
        credentials: 'same-origin',
      });
      if (!response.ok) {
        throw new Error('Failed to delete card.');
      }
      closeModal();
      void globalMutate((key) => typeof key === 'string' && key.startsWith('/api/cards?'), undefined, {
        revalidate: true,
      });
      router.push(returnTo);
      router.refresh();
    } finally {
      setIsDeleting(false);
    }
  }, [activeCardId, closeModal, returnTo, router]);

  const handleDuplicate = useCallback(async () => {
    setIsDuplicating(true);
    try {
      const response = await fetch(`/api/cards/${activeCardId}/duplicate`, {
        method: 'POST',
        credentials: 'same-origin',
      });
      const payload = (await response.json().catch(() => ({}))) as Card & { error?: string };
      if (!response.ok || !payload.docId) {
        throw new Error(payload.error || 'Failed to duplicate card.');
      }
      setActiveCardId(payload.docId);
      void globalMutate((key) => typeof key === 'string' && key.startsWith('/api/cards?'), undefined, {
        revalidate: true,
      });
      router.refresh();
    } finally {
      setIsDuplicating(false);
    }
  }, [activeCardId, router]);

  const modalBody = useMemo(() => {
    if (!modalReady || !card || !tags) {
      return <p>Loading compose…</p>;
    }
    return (
      <CardFormProvider key={activeCardId} initialCard={card} allTags={tags} onSave={handleSave}>
        <div className={styles.modalShell}>
          <div className={styles.modalHeader}>
            <h2 className={styles.modalTitle}>Compose</h2>
            <ModalActions
              onClose={closeModal}
              onDelete={handleDelete}
              onDuplicate={handleDuplicate}
              isDeleting={isDeleting}
              isDuplicating={isDuplicating}
            />
          </div>
          <div className={styles.modalScroll}>
            <StudioCardFormStudioProvider value={{ studioShellCardForm: true }}>
              <CardForm />
            </StudioCardFormStudioProvider>
          </div>
        </div>
      </CardFormProvider>
    );
  }, [
    activeCardId,
    card,
    closeModal,
    handleDelete,
    handleDuplicate,
    handleSave,
    isDeleting,
    isDuplicating,
    modalReady,
    tags,
  ]);

  return (
    <>
      <button type="button" className={[styles.triggerButton, className ?? ''].join(' ').trim()} onClick={openModal}>
        {children}
      </button>
      {isOpen ? (
        <div className={modalStyles.overlay}>
          <div className={`${modalStyles.modal} ${modalStyles.modalWide}`} onClick={(e) => e.stopPropagation()}>
            <div className={modalStyles.body}>{modalBody}</div>
          </div>
        </div>
      ) : null}
    </>
  );
}
