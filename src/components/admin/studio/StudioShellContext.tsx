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
  requestSelectCard: (
    cardId: string,
    previewCard?: Card | StudioSelectedPreview | StudioSelectedDetail | null
  ) => Promise<boolean>;
  registerComposeLeaveGuard: (fn: (() => Promise<boolean>) | null) => void;
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
  deleteSelectedCard: (cardId: string) => Promise<boolean>;
  /** Refresh embedded Collections structural truth after membership/root changes or delete (no-op if not wired). */
  refreshCollectionsStructure: () => void;
  /** Immediately replace/upsert a saved card into the shared Studio card universe before background refresh catches up. */
  upsertCollectionsCardList: (card: Card | StudioSelectedPreview | StudioSelectedDetail | null) => void;
  /** Immediately remove a deleted card from the local structural Collections model before any fallback repair. */
  removeCollectionsCardStructure: (cardId: string) => void;
  /** Notify the Questions pane that a card linked to a question was deleted so local question state can reconcile. */
  notifyQuestionCardDeleted: (cardId: string, questionId?: string | null) => void;
  /** Questions pane registers a local reconciliation handler for linked-card deletes. */
  registerQuestionCardDeleteSync: (
    fn: ((cardId: string, questionId?: string | null) => void) | null
  ) => void;
  /** Media bank multi-select (same backing store as `MediaProvider`). */
  selectedMediaIds: string[];
  setSelectedMediaIds: (ids: string[]) => void;
  toggleMediaSelection: (mediaId: string) => void;
  selectAllMediaOnPage: () => void;
  selectNoneMedia: () => void;
  hasSelectedCardMedia: boolean;
  openSelectedCardMediaEditor: (mediaId?: string | null) => void;
  /**
   * Compose-only: register TipTap body insert handler for Studio relationship DnD (`drop:body`).
   */
  registerBodyMediaInsert: (handler: ((media: Media) => void) | null) => void;
  /**
   * @deprecated Prefer {@link registerBodyMediaInsert}; retained for DnD bridge reads.
   */
  bodyMediaInsertRef: MutableRefObject<((media: Media) => void) | null>;
  /** Organize: selected import tag drives Media bank filter. */
  organizeReconcileSourceTagId: string | null;
  organizeReconcileTargetTagId: string | null;
  setOrganizeReconcileSourceTagId: (tagId: string | null) => void;
  setOrganizeReconcileTargetTagId: (tagId: string | null) => void;
  clearOrganizeReconcile: () => void;
  /** Expand Media pane when Organize reconciliation selects an import tag. */
  openMediaPane: () => void;
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
