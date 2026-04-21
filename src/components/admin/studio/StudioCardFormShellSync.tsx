'use client';

import { useEffect, useRef } from 'react';
import { useCardForm, type ShellRelationshipSnapshot } from '@/components/providers/CardFormProvider';
import { useStudioShell } from '@/components/admin/studio/StudioShellContext';
import type { StudioCardContext } from '@/components/admin/studio/studioCardTypes';

function pickRelationshipSnapshot(card: StudioCardContext): Partial<ShellRelationshipSnapshot> {
  return {
    coverImageId: card.coverImageId ?? null,
    coverImage: card.coverImage ?? null,
    coverImageFocalPoint: card.coverImageFocalPoint,
    galleryMedia: Array.isArray(card.galleryMedia) ? card.galleryMedia : [],
    childrenIds: Array.isArray(card.childrenIds) ? card.childrenIds : [],
    contentMedia: Array.isArray(card.contentMedia) ? card.contentMedia : [],
  };
}

function relationshipSignature(card: StudioCardContext): string {
  const gm = card.galleryMedia || [];
  const galleryPart = gm.map((g) => `${g.mediaId}:${g.order}`).join('|');
  return [
    card.updatedAt ?? '',
    card.coverImageId ?? '',
    (card.childrenIds || []).join(','),
    galleryPart,
    (card.contentMedia || []).join(','),
  ].join('§');
}

/**
 * Keeps CardForm relationship fields aligned with `StudioShellContext.selectedCard` after
 * shell PATCH + refetch (DnD, etc.) without remounting the provider on every `updatedAt`.
 */
export default function StudioCardFormShellSync() {
  const { selectedCard, selectedCardId } = useStudioShell();
  const { formState, applyShellRelationshipSync } = useCardForm();
  const lastApplied = useRef<string>('');

  useEffect(() => {
    lastApplied.current = '';
  }, [selectedCardId]);

  useEffect(() => {
    if (!selectedCardId || !selectedCard?.docId) return;
    if (selectedCard.docId !== formState.cardData.docId) return;
    const sig = relationshipSignature(selectedCard);
    if (sig === lastApplied.current) return;
    lastApplied.current = sig;
    applyShellRelationshipSync(pickRelationshipSnapshot(selectedCard));
  }, [selectedCard, selectedCardId, formState.cardData.docId, applyShellRelationshipSync]);

  return null;
}
