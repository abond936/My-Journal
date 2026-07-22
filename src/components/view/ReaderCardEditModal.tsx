'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import useSWR, { mutate as globalMutate } from 'swr';
import CardForm from '@/components/admin/studio/cards/CardForm';
import { CardFormProvider } from '@/components/providers/CardFormProvider';
import { useOptionalCardContext } from '@/components/providers/CardProvider';
import { MediaProvider } from '@/components/providers/MediaProvider';
import { CardFormSurfaceProvider } from '@/components/authoring/CardFormSurfaceContext';
import { useAppFeedback } from '@/components/providers/AppFeedbackProvider';
import type { Card, CardUpdate } from '@/lib/types/card';
import type { Tag } from '@/lib/types/tag';
import {
  buildReaderReturnAfterDelete,
  patchReaderCard,
} from '@/lib/utils/readerCardPatchReconcile';
import { throwIfJsonApiFailed } from '@/lib/utils/httpJsonApiErrors';
import {
  buildSingleCardDeletePrompt,
  fetchCardDeleteParents,
} from '@/lib/utils/cardDeleteWarnings';
import styles from './ReaderCardEditModal.module.css';
import {
  ReaderCardEditActions,
  ReaderCardEditBaselineSync,
  ReaderCardEditTitleBar,
} from './ReaderCardEditChrome';

const fetcher = (url: string) =>
  fetch(url, { cache: 'no-store', credentials: 'same-origin' }).then((res) => res.json());

type ModalFrame = {
  width: number;
  height: number;
  x: number;
  y: number;
};

export default function ReaderCardEditModal({
  cardId,
  returnTo,
  className,
  onBeforeOpen,
  children,
  open: openControlled,
  onOpenChange,
  renderTrigger = true,
  onCardSaved,
}: {
  cardId: string;
  returnTo: string;
  className?: string;
  onBeforeOpen?: () => void;
  children?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  renderTrigger?: boolean;
  onCardSaved?: (savedCard: Card) => void;
}) {
  const router = useRouter();
  const feedback = useAppFeedback();
  const cardContext = useOptionalCardContext();
  const isControlled = openControlled !== undefined;
  const [isOpenInternal, setIsOpenInternal] = useState(false);
  const isOpen = isControlled ? Boolean(openControlled) : isOpenInternal;
  const setIsOpen = useCallback(
    (next: boolean) => {
      if (!isControlled) {
        setIsOpenInternal(next);
      }
      onOpenChange?.(next);
    },
    [isControlled, onOpenChange]
  );
  const [activeCardId, setActiveCardId] = useState(cardId);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDuplicating, setIsDuplicating] = useState(false);
  const [editingDuplicate, setEditingDuplicate] = useState(false);
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

  const resolvedModalFrame =
    isOpen && typeof window !== 'undefined'
      ? modalFrame ?? buildDefaultFrame()
      : null;

  const openModal = () => {
    onBeforeOpen?.();
    setActiveCardId(cardId);
    setEditingDuplicate(false);
    setModalFrame((current) => current ?? buildDefaultFrame());
    setIsOpen(true);
  };

  useEffect(() => {
    if (!isControlled || !openControlled) return;
    setActiveCardId(cardId);
    setEditingDuplicate(false);
    setModalFrame((current) => current ?? buildDefaultFrame());
  }, [buildDefaultFrame, cardId, isControlled, openControlled]);

  const closeModal = useCallback(() => {
    setIsOpen(false);
  }, [setIsOpen]);

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
      const savedData = await patchReaderCard(activeCardId, cardData, {
        onFeedPatch: (saved) => cardContext?.patchVisibleCard(saved),
      });
      await mutateCard(savedData, false);
      onCardSaved?.(savedData);
      return savedData;
    },
    [activeCardId, mutateCard, cardContext, onCardSaved]
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
      await feedback.alert({
        title: 'Cannot delete card',
        message: prompt.message,
      });
      return;
    }
    const shouldDelete = await feedback.confirm({
      title: 'Delete card?',
      message: prompt.message,
      confirmLabel: 'Delete',
      cancelLabel: 'Cancel',
      tone: 'danger',
    });
    if (!shouldDelete) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/cards/${activeCardId}`, {
        method: 'DELETE',
        credentials: 'same-origin',
      });
      const data = response.status === 204 ? {} : await response.json().catch(() => ({}));
      throwIfJsonApiFailed(response, data, 'This card could not be deleted. Try again.');
      closeModal();
      void globalMutate((key) => typeof key === 'string' && key.startsWith('/api/cards?'), undefined, {
        revalidate: true,
      });
      router.push(buildReaderReturnAfterDelete(returnTo, activeCardId));
      router.refresh();
    } catch (err) {
      feedback.showError(err instanceof Error ? err.message : 'Failed to delete card.', 'Could not delete card');
    } finally {
      setIsDeleting(false);
    }
  }, [activeCardId, card, closeModal, feedback, returnTo, router]);

  const handleDuplicate = useCallback(async () => {
    setIsDuplicating(true);
    try {
      const response = await fetch(`/api/cards/${activeCardId}/duplicate`, {
        method: 'POST',
        credentials: 'same-origin',
      });
      const payload = (await response.json().catch(() => ({}))) as Card & {
        message?: string;
        error?: string;
      };
      throwIfJsonApiFailed(response, payload, 'This card could not be duplicated. Try again.');
      if (!payload.docId) throw new Error('This card could not be duplicated. Try again.');
      setActiveCardId(payload.docId);
      setEditingDuplicate(true);
      feedback.showSuccess('Duplicate created. You are now editing the new draft.');
      void globalMutate((key) => typeof key === 'string' && key.startsWith('/api/cards?'), undefined, {
        revalidate: true,
      });
      router.refresh();
    } catch (err) {
      feedback.showError(
        err instanceof Error ? err.message : 'This card could not be duplicated. Try again.',
        'Card not duplicated'
      );
    } finally {
      setIsDuplicating(false);
    }
  }, [activeCardId, feedback, router]);

  const modalBody = useMemo(() => {
    if (!modalReady || !card || !tags) {
      return <div className={styles.loadingState}>Loading compose…</div>;
    }
    return (
      <CardFormProvider key={activeCardId} initialCard={card} allTags={tags} onSave={handleSave}>
        <MediaProvider>
          <ReaderCardEditBaselineSync syncKey={activeCardId} />
          <div className={styles.modalShell}>
            <div className={styles.modalHeader}>
              <ReaderCardEditTitleBar
                title={editingDuplicate ? 'Compose — New draft' : 'Compose'}
                onDragStart={handleDragStart}
                onClose={closeModal}
              />
              <div className={styles.modalActions}>
                <ReaderCardEditActions
                  onClose={closeModal}
                  onDelete={handleDelete}
                  onDuplicate={handleDuplicate}
                  isDeleting={isDeleting}
                  isDuplicating={isDuplicating}
                />
              </div>
            </div>
            <div className={styles.modalScroll}>
              <CardFormSurfaceProvider value={{ compact: true }}>
                <CardForm />
              </CardFormSurfaceProvider>
            </div>
          </div>
        </MediaProvider>
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
    editingDuplicate,
    modalReady,
    tags,
  ]);

  return (
    <>
      {renderTrigger && children ? (
        <button type="button" className={[styles.triggerButton, className ?? ''].join(' ').trim()} onClick={openModal}>
          {children}
        </button>
      ) : null}
      {isOpen && resolvedModalFrame && typeof document !== 'undefined'
        ? createPortal(
            <div className={styles.readerOverlay}>
              <div
                ref={modalRef}
                className={styles.readerModal}
                style={{
                  width: `${resolvedModalFrame.width}px`,
                  height: `${resolvedModalFrame.height}px`,
                  left: `${resolvedModalFrame.x}px`,
                  top: `${resolvedModalFrame.y}px`,
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
            </div>,
            document.body
          )
        : null}
    </>
  );
}
