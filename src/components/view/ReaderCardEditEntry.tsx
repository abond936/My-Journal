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
  metadata,
  onBeforeOpen,
  onCardSaved,
  children,
}: {
  cardId: string;
  returnTo: string;
  className?: string;
  metadata: ReaderQuickEditInitial;
  onBeforeOpen?: () => void;
  onCardSaved?: (savedCard: Card) => void;
  children: React.ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [desktopOpen, setDesktopOpen] = useState(false);

  const openEditor = useCallback(() => {
    onBeforeOpen?.();
    if (typeof window !== 'undefined' && window.matchMedia(MOBILE_EDIT_MEDIA).matches) {
      setMobileOpen(true);
      return;
    }
    setDesktopOpen(true);
  }, [onBeforeOpen]);

  return (
    <>
      <button type="button" className={className} onClick={openEditor}>
        {children}
      </button>
      {mobileOpen ? (
        <ReaderMobileQuickEdit
          open
          onClose={() => setMobileOpen(false)}
          cardId={cardId}
          initial={metadata}
          onSaved={(saved) => onCardSaved?.(saved)}
        />
      ) : null}
      {desktopOpen ? (
        <ReaderCardEditModal
          cardId={cardId}
          returnTo={returnTo}
          open
          onOpenChange={setDesktopOpen}
          renderTrigger={false}
          onCardSaved={onCardSaved}
        />
      ) : null}
    </>
  );
}
