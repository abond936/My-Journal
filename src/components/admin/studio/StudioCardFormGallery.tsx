'use client';

import React, { useCallback, useMemo } from 'react';
import { SortableContext, arrayMove, verticalListSortingStrategy } from '@dnd-kit/sortable';
import JournalImage from '@/components/common/JournalImage';
import { useCardForm } from '@/components/providers/CardFormProvider';
import type { HydratedGalleryMediaItem } from '@/lib/types/card';
import { getDisplayUrl } from '@/lib/utils/photoUtils';
import {
  StudioDropZone,
  StudioGallerySortableRow,
} from '@/components/admin/studio/studioRelationshipDndPrimitives';
import styles from './StudioWorkspace.module.css';

export default function StudioCardFormGallery({
  disabled,
  onSetAsCover,
  currentCoverMediaId,
}: {
  disabled: boolean;
  onSetAsCover: (item: HydratedGalleryMediaItem) => void;
  currentCoverMediaId: string | null;
}) {
  const { formState, setField } = useCardForm();
  const gallery = (formState.cardData.galleryMedia || []) as HydratedGalleryMediaItem[];

  const sortableIds = useMemo(
    () => gallery.map((item) => `gallery:${item.mediaId}:${item.order}`),
    [gallery]
  );

  const moveGalleryItem = useCallback(
    (index: number, direction: 'up' | 'down') => {
      if (!gallery.length) return;
      const items = [...gallery];
      const j = direction === 'up' ? index - 1 : index + 1;
      if (j < 0 || j >= items.length) return;
      const reordered = arrayMove(items, index, j).map((item, idx) => ({ ...item, order: idx }));
      setField('galleryMedia', reordered);
    },
    [gallery, setField]
  );

  const removeFromGallery = useCallback(
    (item: HydratedGalleryMediaItem) => {
      setField(
        'galleryMedia',
        gallery.filter((g) => !(g.mediaId === item.mediaId && g.order === item.order))
      );
    },
    [gallery, setField]
  );

  const galleryBody = gallery.length ? (
    <StudioDropZone
      id="drop:gallery"
      accepts={['source']}
      ariaLabel="Gallery drop target: drop source media here to append"
    >
      <p className={styles.dropHint}>Drop from the Media bank here to append to gallery.</p>
      <SortableContext items={sortableIds} strategy={verticalListSortingStrategy}>
        <div className={styles.mediaList}>
          {gallery.map((item, index) => (
            <StudioGallerySortableRow
              key={`${item.mediaId}-${item.order}`}
              id={`gallery:${item.mediaId}:${item.order}`}
              galleryFocusMediaId={item.mediaId}
            >
              <div className={styles.mediaRow}>
                {item.media ? (
                  <JournalImage
                    src={getDisplayUrl(item.media)}
                    alt={item.caption || item.media.filename || 'Gallery image'}
                    width={68}
                    height={68}
                    className={styles.mediaThumb}
                  />
                ) : (
                  <div className={styles.mediaThumbFallback}>No thumb</div>
                )}
                <div>
                  <div className={styles.mediaLabel}>{item.caption || item.media?.filename || 'Gallery item'}</div>
                  <div className={styles.metaMuted}>{item.mediaId}</div>
                  <div className={styles.inlineActions}>
                    <button
                      type="button"
                      className={styles.inlineActionButton}
                      disabled={disabled || index === 0}
                      onClick={() => moveGalleryItem(index, 'up')}
                      aria-label="Move gallery item up"
                    >
                      Move up
                    </button>
                    <button
                      type="button"
                      className={styles.inlineActionButton}
                      disabled={disabled || index >= gallery.length - 1}
                      onClick={() => moveGalleryItem(index, 'down')}
                      aria-label="Move gallery item down"
                    >
                      Move down
                    </button>
                    <button
                      type="button"
                      className={styles.inlineActionButton}
                      disabled={disabled || item.mediaId === currentCoverMediaId}
                      onClick={() => onSetAsCover(item)}
                    >
                      {item.mediaId === currentCoverMediaId ? 'Cover' : 'Set as cover'}
                    </button>
                    <button
                      type="button"
                      className={styles.inlineActionButton}
                      disabled={disabled}
                      onClick={() => removeFromGallery(item)}
                    >
                      Remove from gallery
                    </button>
                  </div>
                </div>
              </div>
            </StudioGallerySortableRow>
          ))}
          <p className={styles.metaMuted}>
            Reorder with drag handles (keyboard: Space, arrows, Space) or Move up / Move down. Drag onto Cover to assign
            cover.
          </p>
        </div>
      </SortableContext>
    </StudioDropZone>
  ) : (
    <StudioDropZone
      id="drop:gallery"
      accepts={['source']}
      ariaLabel="Gallery drop target: drop source media here to add first gallery item"
    >
      <p className={styles.dropHint}>Drop from the Media bank here to append to gallery.</p>
      <p className={styles.metaMuted}>No gallery media assigned.</p>
    </StudioDropZone>
  );

  return (
    <div>
      <h4 className={styles.studioFormSectionTitle}>Gallery</h4>
      {galleryBody}
    </div>
  );
}
