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
  const cover = card.coverImage;
  const coverSignature = cover
      ? [
          cover.docId ?? '',
          cover.storageUrl ?? '',
          cover.filename ?? '',
          cover.objectPosition ?? '',
        ].join('~')
      : 'no-cover';
  const galleryPart = gm
    .map((g) => {
      const media = g.media;
      const mediaSignature = media
        ? [
            media.docId ?? '',
            media.storageUrl ?? '',
            media.filename ?? '',
            media.objectPosition ?? '',
          ].join('~')
        : 'no-media';
      return `${g.mediaId}:${g.order}:${mediaSignature}`;
    })
    .join('|');
  return [
    card.updatedAt ?? '',
    card.coverImageId ?? '',
    coverSignature,
    card.coverImageFocalPoint?.x ?? '',
    card.coverImageFocalPoint?.y ?? '',
    (card.childrenIds || []).join(','),
    galleryPart,
    (card.contentMedia || []).join(','),
  ].join('§');
}

/**
 * Keeps CardForm relationship fields aligned with `StudioShellContext.selectedCard` after
 * shell PATCH + refetch (DnD, etc.) without remounting the provider on every `updatedAt`.
 * Only updates `cardData` so Compose Save / dirty state reflect pending full-form baseline.
 */
export default function StudioCardFormShellSync() {
  const { selectedDetail, selectedCardId } = useStudioShell();
  const { formState, applyShellRelationshipSync } = useCardForm();
  const lastApplied = useRef<string>('');

  useEffect(() => {
    lastApplied.current = '';
  }, [selectedCardId]);

  useEffect(() => {
    if (!selectedCardId || !selectedDetail?.docId) return;
    if (selectedDetail.docId !== formState.cardData.docId) return;
    const sig = relationshipSignature(selectedDetail);
    if (sig === lastApplied.current) return;
    lastApplied.current = sig;
    applyShellRelationshipSync(pickRelationshipSnapshot(selectedDetail));
  }, [selectedDetail, selectedCardId, formState.cardData.docId, applyShellRelationshipSync]);

  return null;
}
