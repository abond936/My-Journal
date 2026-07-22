'use client';

import React, { useCallback, useState } from 'react';
import dynamic from 'next/dynamic';
import type { Card } from '@/lib/types/card';
import type { ReaderQuickEditInitial } from '@/lib/utils/readerCardPatchReconcile';

const ReaderMobileQuickEdit = dynamic(() => import('./ReaderMobileQuickEdit'), { ssr: false });
const ReaderCardEditModal = dynamic(() => import('./ReaderCardEditModal'), { ssr: false });

const MOBILE_EDIT_MEDIA = '(max-width: 768px)';

export default function ReaderCardEditEntry({
  cardId,
  returnTo,
  className,
  ariaLabel = 'Edit',
  metadata,
  onBeforeOpen,
  onCardSaved,
  children,
}: {
  cardId: string;
  returnTo: string;
  className?: string;
  ariaLabel?: string;
  metadata: ReaderQuickEditInitial;
  onBeforeOpen?: () => void;
  onCardSaved?: (savedCard: Card) => void;
  children: React.ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [desktopOpen, setDesktopOpen] = useState(false);

  const openFullEditor = useCallback(() => {
    setMobileOpen(false);
    setDesktopOpen(true);
  }, []);

  const openEditor = useCallback(() => {
    onBeforeOpen?.();
    if (typeof window !== 'undefined' && window.matchMedia(MOBILE_EDIT_MEDIA).matches) {
      setMobileOpen(true);
      return;
    }
    setDesktopOpen(true);
  }, [onBeforeOpen]);

  const handleOpenClick = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      event.preventDefault();
      event.stopPropagation();
      openEditor();
    },
    [openEditor]
  );

  return (
    <>
      <button type="button" className={className} onClick={handleOpenClick} aria-label={ariaLabel}>
        {children}
      </button>
      <ReaderMobileQuickEdit
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        onOpenFullEditor={openFullEditor}
        cardId={cardId}
        initial={metadata}
        onSaved={(saved) => onCardSaved?.(saved)}
      />
      <ReaderCardEditModal
        cardId={cardId}
        returnTo={returnTo}
        open={desktopOpen}
        onOpenChange={setDesktopOpen}
        renderTrigger={false}
        onCardSaved={onCardSaved}
      />
    </>
  );
}
