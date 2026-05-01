'use client';

import React, { createContext, useContext, type MutableRefObject } from 'react';
import type { Card } from '@/lib/types/card';
import type { Media } from '@/lib/types/photo';
import type {
  StudioActiveCardViewModel,
  StudioSelectedDetail,
  StudioSelectedLoadState,
  StudioSelectedPreview,
} from '@/components/admin/studio/studioCardTypes';

/**
 * Session-scoped Studio state: one **card** selection + **media bank** selection + loaders/patch.
 * Media list state still lives in {@link MediaProvider}; these fields mirror it for a single shell hook.
 */
export type StudioShellContextValue = {
  selectedCardId: string | null;
  setSelectedCardId: (id: string | null) => void;
  selectCard: (cardId: string, previewCard?: Card | StudioSelectedPreview | StudioSelectedDetail | null) => void;
  getKnownCardPreview: (cardId: string | null) => StudioSelectedPreview | null;
  selectedPreview: StudioSelectedPreview | null;
  setSelectedPreview: (card: StudioSelectedPreview | null) => void;
  selectedDetail: StudioSelectedDetail | null;
  setSelectedDetail: (card: StudioSelectedDetail | null) => void;
  selectedLoadState: StudioSelectedLoadState;
  activeCardViewModel: StudioActiveCardViewModel;
  cardLoading: boolean;
  cardError: string | null;
  loadSelectedCard: (cardId: string, opts?: { quiet?: boolean }) => Promise<StudioSelectedDetail>;
  patchSelectedCard: (payload: Partial<Card>, successMessage?: string) => Promise<void>;
  /** Refresh embedded Collections card list/tree after card body save or equivalent (no-op if not wired). */
  refreshCollectionsCardList: () => void;
  /** Immediately replace/upsert a saved card into the shared Studio card universe before background refresh catches up. */
  upsertCollectionsCardList: (card: Card | StudioSelectedPreview | StudioSelectedDetail | null) => void;
  /** Media bank multi-select (same backing store as `MediaProvider`). */
  selectedMediaIds: string[];
  setSelectedMediaIds: (ids: string[]) => void;
  toggleMediaSelection: (mediaId: string) => void;
  selectAllMediaOnPage: () => void;
  selectNoneMedia: () => void;
  /**
   * Compose-only: `CardForm` registers `insertImage` here so `handleStudioRelationshipDragEnd` can insert
   * bank media into TipTap when the user drops onto `drop:body`.
   */
  bodyMediaInsertRef: MutableRefObject<((media: Media) => void) | null>;
};

const StudioShellContext = createContext<StudioShellContextValue | null>(null);

export function StudioShellProvider({
  value,
  children,
}: {
  value: StudioShellContextValue;
  children: React.ReactNode;
}) {
  return <StudioShellContext.Provider value={value}>{children}</StudioShellContext.Provider>;
}

export function useStudioShell(): StudioShellContextValue {
  const ctx = useContext(StudioShellContext);
  if (!ctx) {
    throw new Error('useStudioShell must be used within StudioShellProvider');
  }
  return ctx;
}

/** Same value as {@link useStudioShell} when inside Studio; `null` elsewhere (e.g. full-page card edit). */
export function useStudioShellOptional(): StudioShellContextValue | null {
  return useContext(StudioShellContext);
}
