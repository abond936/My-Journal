'use client';

import React, { useCallback, useMemo, useState } from 'react';
import { ImageIcon, ImageUp, Pencil, Trash2 } from 'lucide-react';
import { SortableContext, rectSortingStrategy } from '@dnd-kit/sortable';
import JournalImage from '@/components/common/JournalImage';
import EditModal from '@/components/admin/card-admin/EditModal';
import GalleryItemEditor from '@/components/admin/card-admin/GalleryItemEditor';
import { useCardForm } from '@/components/providers/CardFormProvider';
import type { HydratedGalleryMediaItem } from '@/lib/types/card';
import { getStudioDisplayUrl } from '@/lib/utils/photoUtils';
import {
  StudioDropZone,
  StudioGalleryEndDropZone,
  StudioGallerySortableRow,
} from '@/components/admin/studio/studioRelationshipDndPrimitives';
import { gallerySlotHasCaptionOverride } from '@/lib/utils/galleryObjectPosition';
import styles from './StudioWorkspace.module.css';

function applySlotCaptionEdit(item: HydratedGalleryMediaItem, newText: string): HydratedGalleryMediaItem {
  const mediaDefault = item.media?.caption ?? '';
  if (newText === mediaDefault) {
    if (!gallerySlotHasCaptionOverride(item)) return item;
    const rest = { ...item };
    delete rest.caption;
    return rest;
  }
  return { ...item, caption: newText };
}

function cardCaptionFieldValue(item: HydratedGalleryMediaItem): string {
  return gallerySlotHasCaptionOverride(item) ? (item.caption ?? '') : '';
}

function shouldShowInlineCardCaptionInput(item: HydratedGalleryMediaItem): boolean {
  return gallerySlotHasCaptionOverride(item) || !(item.media?.caption?.trim());
}

export default function StudioCardFormGallery({
  disabled,
  onSetAsCover,
  currentCoverMediaId,
  onOpenMediaEditor,
  onPersistGalleryAfterSlotSave,
}: {
  disabled: boolean;
  onSetAsCover: (item: HydratedGalleryMediaItem) => void;
  currentCoverMediaId: string | null;
  onOpenMediaEditor?: (mediaId: string) => void;
  onPersistGalleryAfterSlotSave?: (
    nextGallery: HydratedGalleryMediaItem[]
  ) => boolean | Promise<boolean>;
}) {
  const { formState, setField } = useCardForm();
  const gallery = useMemo(
    () => ((formState.cardData.galleryMedia || []) as HydratedGalleryMediaItem[]),
    [formState.cardData.galleryMedia]
  );
  const gallerySortableIds = useMemo(
    () => gallery.map((item) => `gallery:${item.mediaId}:${item.order}`),
    [gallery]
  );
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [persistingGallery, setPersistingGallery] = useState(false);
  const editingItem = useMemo(
    () => gallery.find((item) => item.mediaId === editingItemId) ?? null,
    [editingItemId, gallery]
  );

  const updateGalleryItem = useCallback(
    (mediaId: string, updater: (item: HydratedGalleryMediaItem) => HydratedGalleryMediaItem) => {
      setField(
        'galleryMedia',
        gallery.map((item) => (item.mediaId === mediaId ? updater(item) : item))
      );
    },
    [gallery, setField]
  );

  const removeFromGallery = useCallback(
    async (item: HydratedGalleryMediaItem) => {
      const previousGallery = gallery;
      const nextGallery = previousGallery.filter(
        (g) => !(g.mediaId === item.mediaId && g.order === item.order)
      );
      setField('galleryMedia', nextGallery);
      if (editingItemId === item.mediaId) setEditingItemId(null);
      if (!onPersistGalleryAfterSlotSave) return;
      let ok = false;
      setPersistingGallery(true);
      try {
        ok = await onPersistGalleryAfterSlotSave(nextGallery);
      } finally {
        setPersistingGallery(false);
      }
      if (!ok) {
        setField('galleryMedia', previousGallery);
      }
    },
    [editingItemId, gallery, onPersistGalleryAfterSlotSave, setField]
  );

  const saveGalleryItemOverrides = useCallback(
    async (updatedItem: HydratedGalleryMediaItem) => {
      const nextGallery = gallery.map((item) =>
        item.mediaId === updatedItem.mediaId ? updatedItem : item
      );
      setField('galleryMedia', nextGallery);
      if (onPersistGalleryAfterSlotSave) {
        let ok = false;
        setPersistingGallery(true);
        try {
          ok = await onPersistGalleryAfterSlotSave(nextGallery);
        } finally {
          setPersistingGallery(false);
        }
        if (!ok) return;
      }
      setEditingItemId(null);
    },
    [gallery, onPersistGalleryAfterSlotSave, setField]
  );

  return (
    <div>
      <h4 className={styles.studioFormSectionTitle}>Gallery</h4>
      {gallery.length ? (
        <StudioDropZone
          id="drop:gallery"
          accepts={['source']}
          ariaLabel="Gallery drop target: drop source media here to append"
          className={styles.studioGalleryDropZone}
          eligibleHint="Release here to add to the gallery"
        >
          <SortableContext items={gallerySortableIds} strategy={rectSortingStrategy}>
            <div className={styles.studioGalleryStrip}>
              {gallery.map((item) => (
                <StudioGallerySortableRow
                  key={`${item.mediaId}-${item.order}`}
                  id={`gallery:${item.mediaId}:${item.order}`}
                  galleryFocusMediaId={item.mediaId}
                >
                  <div className={styles.studioGalleryCard}>
                    <div className={styles.studioGalleryThumbWrap}>
                      {item.media ? (
                        <JournalImage
                          src={getStudioDisplayUrl(item.media)}
                          alt={item.caption || item.media.filename || 'Gallery image'}
                          width={180}
                          height={132}
                          className={styles.studioGalleryThumb}
                          sizes="(max-width: 900px) 50vw, (max-width: 1400px) 25vw, 180px"
                          style={{ objectPosition: item.objectPosition || item.media.objectPosition || '50% 50%' }}
                        />
                      ) : (
                        <div className={styles.mediaThumbFallback}>No thumb</div>
                      )}
                    </div>
                    <div className={styles.studioGalleryCaptionBlock}>
                      {item.media?.caption?.trim() ? (
                        <p className={styles.studioGalleryMediaCaption}>{item.media.caption}</p>
                      ) : null}
                      {shouldShowInlineCardCaptionInput(item) ? (
                        <textarea
                          className={styles.studioGalleryCaptionInput}
                          rows={2}
                          value={cardCaptionFieldValue(item)}
                          onChange={(e) =>
                            updateGalleryItem(item.mediaId, (current) =>
                              applySlotCaptionEdit(current, e.target.value)
                            )
                          }
                          placeholder="Card caption..."
                          disabled={disabled || persistingGallery}
                        />
                      ) : null}
                    </div>
                    <div className={styles.studioGalleryActions}>
                      {onOpenMediaEditor ? (
                        <button
                          type="button"
                          className={`${styles.inlineActionButton} ${styles.inlineActionIconButton}`}
                          disabled={disabled || persistingGallery}
                          onClick={() => onOpenMediaEditor(item.mediaId)}
                          aria-label="Open gallery image in media editor"
                          title="Open gallery image in media editor"
                        >
                          <ImageIcon size={16} aria-hidden="true" />
                        </button>
                      ) : null}
                      <button
                        type="button"
                        className={`${styles.inlineActionButton} ${styles.inlineActionIconButton}`}
                        disabled={disabled || persistingGallery || item.mediaId === currentCoverMediaId}
                        onClick={() => onSetAsCover(item)}
                        aria-label={item.mediaId === currentCoverMediaId ? 'Current cover image' : 'Set as cover image'}
                        title={item.mediaId === currentCoverMediaId ? 'Current cover image' : 'Set as cover image'}
                      >
                        <ImageUp size={16} aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        className={`${styles.inlineActionButton} ${styles.inlineActionIconButton}`}
                        disabled={disabled || persistingGallery}
                        onClick={() => setEditingItemId(item.mediaId)}
                        aria-label="Edit gallery item"
                        title="Edit gallery item"
                      >
                        <Pencil size={16} aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        className={`${styles.inlineActionButton} ${styles.inlineActionIconButton}`}
                        disabled={disabled || persistingGallery}
                        onClick={() => void removeFromGallery(item)}
                        aria-label="Remove from gallery"
                        title="Remove from gallery"
                      >
                        <Trash2 size={16} aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                </StudioGallerySortableRow>
              ))}
              <StudioGalleryEndDropZone />
            </div>
          </SortableContext>
        </StudioDropZone>
      ) : (
        <StudioDropZone
          id="drop:gallery"
          accepts={['source']}
          ariaLabel="Gallery drop target: drop source media here to add first gallery item"
          className={styles.studioGalleryDropZone}
          eligibleHint="Release here to start the gallery"
        >
          <div className={styles.studioAppendDropEmptyState}>
            <p className={styles.metaMuted}>No gallery media assigned.</p>
          </div>
        </StudioDropZone>
      )}

      <EditModal
        isOpen={Boolean(editingItem)}
        onClose={() => setEditingItemId(null)}
        title={editingItem?.media?.filename ? `Edit: ${editingItem.media.filename}` : 'Edit gallery image'}
        size="wide"
      >
        {editingItem ? (
          <StudioGalleryItemEditor item={editingItem} onSave={saveGalleryItemOverrides} />
        ) : null}
      </EditModal>
    </div>
  );
}

function StudioGalleryItemEditor({
  item,
  onSave,
}: {
  item: HydratedGalleryMediaItem;
  onSave: (item: HydratedGalleryMediaItem) => void;
}) {
  return <GalleryItemEditor item={item} onSave={onSave} saveLabel="Save changes" />;
}
