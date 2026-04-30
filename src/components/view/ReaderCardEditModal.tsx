'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import useSWR, { mutate as globalMutate } from 'swr';
import CardForm from '@/components/admin/card-admin/CardForm';
import { CardFormProvider, useCardForm } from '@/components/providers/CardFormProvider';
import { useOptionalCardContext } from '@/components/providers/CardProvider';
import { StudioCardFormStudioProvider } from '@/components/admin/studio/studioCardFormStudioContext';
import type { Card, CardUpdate } from '@/lib/types/card';
import type { Tag } from '@/lib/types/tag';
import { throwIfJsonApiFailed } from '@/lib/utils/httpJsonApiErrors';
import {
  buildSingleCardDeletePrompt,
  fetchCardDeleteParents,
} from '@/lib/utils/cardDeleteWarnings';
import styles from './ReaderCardEditModal.module.css';
import studioStyles from '@/components/admin/studio/StudioWorkspace.module.css';

const fetcher = (url: string) =>
  fetch(url, { cache: 'no-store', credentials: 'same-origin' }).then((res) => res.json());

type ModalFrame = {
  width: number;
  height: number;
  x: number;
  y: number;
};

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

function ModalTitleBar({
  title,
  onDragStart,
  onClose,
}: {
  title: string;
  onDragStart: (event: React.PointerEvent<HTMLDivElement>) => void;
  onClose: () => void;
}) {
  const { confirmLeaveIfDirty, formState } = useCardForm();
  const { isSaving } = formState;

  const handleClose = useCallback(() => {
    if (!confirmLeaveIfDirty()) return;
    onClose();
  }, [confirmLeaveIfDirty, onClose]);

  return (
    <div className={styles.titleBar} onPointerDown={onDragStart}>
      <div className={styles.titleBarDragAffordance} aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
      <h2 className={styles.titleBarTitle}>{title}</h2>
      <button
        type="button"
        className={styles.titleBarCloseButton}
        onClick={handleClose}
        disabled={isSaving}
        aria-label="Close compose window"
      >
        ×
      </button>
    </div>
  );
}

function ReaderModalBaselineSync({ syncKey }: { syncKey: string }) {
  const { syncPersistableBaseline } = useCardForm();

  useEffect(() => {
    const timer = window.setTimeout(() => {
      syncPersistableBaseline();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [syncKey, syncPersistableBaseline]);

  return null;
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
  const cardContext = useOptionalCardContext();
  const [isOpen, setIsOpen] = useState(false);
  const [activeCardId, setActiveCardId] = useState(cardId);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDuplicating, setIsDuplicating] = useState(false);
  const [modalFrame, setModalFrame] = useState<ModalFrame | null>(null);
  const modalRef = useRef<HTMLDivElement | null>(null);
  const pointerStateRef = useRef<
    | { mode: 'drag'; startX: number; startY: number; frame: ModalFrame }
    | { mode: 'resize'; startX: number; startY: number; frame: ModalFrame }
    | null
  >(null);

  // Modal reads parent fields incl. `childrenIds?.length` for delete-warning
  // text but never the hydrated children array — pass `?children=skip` to drop
  // the unused child reads + media hydrations on every modal open.
  const { data: card, mutate: mutateCard } = useSWR<Card | null>(
    isOpen ? `/api/cards/${activeCardId}?children=skip` : null,
    fetcher,
    { revalidateOnFocus: false, revalidateOnReconnect: false }
  );
  const { data: tags } = useSWR<Tag[]>(
    isOpen ? '/api/tags' : null,
    fetcher,
    { revalidateOnFocus: false, revalidateOnReconnect: false }
  );

  const modalReady = Boolean(card && tags);

  const buildDefaultFrame = useCallback((): ModalFrame => {
    if (typeof window === 'undefined') {
      return { width: 800, height: 1500, x: 24, y: 96 };
    }

    const margin = 24;
    const maxWidth = Math.max(560, window.innerWidth - margin * 2);
    const headerClearance = 88;
    const maxHeight = Math.max(900, window.innerHeight - margin - headerClearance);
    const width = Math.min(800, maxWidth);
    const height = Math.min(1500, maxHeight);

    return {
      width,
      height,
      x: Math.max(margin, Math.round((window.innerWidth - width) / 2)),
      y: headerClearance,
    };
  }, []);

  const openModal = () => {
    onBeforeOpen?.();
    setActiveCardId(cardId);
    setModalFrame((current) => current ?? buildDefaultFrame());
    setIsOpen(true);
  };

  const closeModal = useCallback(() => {
    setIsOpen(false);
  }, []);

  useEffect(() => {
    if (!isOpen) {
      pointerStateRef.current = null;
      document.body.style.userSelect = '';
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const handlePointerMove = (event: PointerEvent) => {
      const state = pointerStateRef.current;
      if (!state) return;

      const margin = 16;
      const topClearance = 88;
      const maxWidth = Math.max(560, window.innerWidth - margin * 2);
      const maxHeight = Math.max(900, window.innerHeight - margin - topClearance);

      if (state.mode === 'drag') {
        const nextX = Math.min(
          Math.max(margin, window.innerWidth - state.frame.width - margin),
          Math.max(margin, state.frame.x + (event.clientX - state.startX))
        );
        const nextY = Math.min(
          Math.max(topClearance, window.innerHeight - state.frame.height - margin),
          Math.max(topClearance, state.frame.y + (event.clientY - state.startY))
        );
        setModalFrame({ ...state.frame, x: nextX, y: nextY });
        return;
      }

      const nextWidth = Math.min(maxWidth, Math.max(560, state.frame.width + (event.clientX - state.startX)));
      const nextHeight = Math.min(maxHeight, Math.max(720, state.frame.height + (event.clientY - state.startY)));
      setModalFrame({ ...state.frame, width: nextWidth, height: nextHeight });
    };

    const stopPointerAction = () => {
      pointerStateRef.current = null;
      document.body.style.userSelect = '';
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', stopPointerAction);
    window.addEventListener('pointercancel', stopPointerAction);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', stopPointerAction);
      window.removeEventListener('pointercancel', stopPointerAction);
    };
  }, [isOpen]);

  const handleResizeStart = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (!modalFrame) return;
    if (event.button !== 0) return;
    pointerStateRef.current = {
      mode: 'resize',
      startX: event.clientX,
      startY: event.clientY,
      frame: modalFrame,
    };
    document.body.style.userSelect = 'none';
    event.preventDefault();
  }, [modalFrame]);

  const handleDragStart = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).closest('button')) return;
    if (!modalFrame) return;
    if (event.button !== 0) return;
    pointerStateRef.current = {
      mode: 'drag',
      startX: event.clientX,
      startY: event.clientY,
      frame: modalFrame,
    };
    document.body.style.userSelect = 'none';
    event.preventDefault();
  }, [modalFrame]);

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
      cardContext?.patchVisibleCard(savedData);
      void globalMutate(
        (key) => typeof key === 'string' && key.startsWith('/api/cards?'),
        (current) => {
          if (!current) return current;

          const patchItems = (items: unknown) => {
            if (!Array.isArray(items)) return items;
            return items.map((item) => {
              if (!item || typeof item !== 'object') return item;
              return (item as Card).docId === savedData.docId ? savedData : item;
            });
          };

          if (Array.isArray(current)) {
            return current.map((page) => {
              if (!page || typeof page !== 'object' || !('items' in page)) return page;
              return {
                ...page,
                items: patchItems((page as { items?: unknown }).items),
              };
            });
          }

          if (typeof current === 'object' && 'items' in current) {
            return {
              ...current,
              items: patchItems((current as { items?: unknown }).items),
            };
          }

          return current;
        },
        {
          revalidate: false,
        }
      );
      return savedData;
    },
    [activeCardId, mutateCard, cardContext]
  );

  const handleDelete = useCallback(async () => {
    if (!card) return;
    const { parentTitles, verificationFailed } = await fetchCardDeleteParents(activeCardId);
    const prompt = buildSingleCardDeletePrompt({
      title: card.title,
      isCollectionRoot: card.isCollectionRoot,
      childCount: card.childrenIds?.length ?? 0,
      parentTitles,
      verificationFailed,
    });

    if (prompt.blocked) {
      window.alert(prompt.message);
      return;
    }
    if (!window.confirm(prompt.message)) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/cards/${activeCardId}`, {
        method: 'DELETE',
        credentials: 'same-origin',
      });
      const data = response.status === 204 ? {} : await response.json().catch(() => ({}));
      throwIfJsonApiFailed(response, data, 'Failed to delete card.');
      closeModal();
      void globalMutate((key) => typeof key === 'string' && key.startsWith('/api/cards?'), undefined, {
        revalidate: true,
      });
      router.push(returnTo);
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete card.');
    } finally {
      setIsDeleting(false);
    }
  }, [activeCardId, card, closeModal, returnTo, router]);

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
        <ReaderModalBaselineSync syncKey={activeCardId} />
        <div className={styles.modalShell}>
          <div className={styles.modalHeader}>
            <ModalTitleBar title="Compose" onDragStart={handleDragStart} onClose={closeModal} />
            <div className={styles.modalActions}>
              <ModalActions
                onClose={closeModal}
                onDelete={handleDelete}
                onDuplicate={handleDuplicate}
                isDeleting={isDeleting}
                isDuplicating={isDuplicating}
              />
            </div>
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
    handleDragStart,
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
      {isOpen && modalFrame ? (
        <div className={styles.readerOverlay}>
          <div
            ref={modalRef}
            className={styles.readerModal}
            style={{
              width: `${modalFrame.width}px`,
              height: `${modalFrame.height}px`,
              left: `${modalFrame.x}px`,
              top: `${modalFrame.y}px`,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.readerBody}>{modalBody}</div>
            <div
              className={styles.resizeHandle}
              onPointerDown={handleResizeStart}
              role="presentation"
              aria-hidden="true"
            />
          </div>
        </div>
      ) : null}
    </>
  );
}
