'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import EditModal from '@/components/admin/card-admin/EditModal';
import JournalImage from '@/components/common/JournalImage';
import { useAppFeedback } from '@/components/providers/AppFeedbackProvider';
import type { Media } from '@/lib/types/photo';
import { getDisplayUrl } from '@/lib/utils/photoUtils';
import { parseObjectPositionToPercents } from '@/lib/utils/parseObjectPositionPercent';
import styles from './MediaEditModal.module.css';

type RelatedCardSummary = {
  id: string;
  title: string;
};

type CurrentCardContext = {
  cardId: string;
  cardTitle: string;
  roles: string[];
};

export default function MediaEditModal({
  isOpen,
  mediaItems,
  selectedMediaId,
  onSelectMedia,
  onClose,
  onSaveMediaFields,
  onMediaUpdated,
  onDeleteMedia,
  currentCardContext,
  relatedCardIdsOverride,
}: {
  isOpen: boolean;
  mediaItems: Media[];
  selectedMediaId: string | null;
  onSelectMedia: (mediaId: string) => void;
  onClose: () => void;
  onSaveMediaFields: (mediaId: string, updates: Partial<Pick<Media, 'caption' | 'objectPosition'>>) => Promise<void>;
  onMediaUpdated?: (media: Media) => void;
  onDeleteMedia?: (mediaId: string) => Promise<void>;
  currentCardContext?: CurrentCardContext | null;
  relatedCardIdsOverride?: string[] | null;
}) {
  const router = useRouter();
  const feedback = useAppFeedback();
  const replaceInputRef = useRef<HTMLInputElement | null>(null);
  const [localOverrides, setLocalOverrides] = useState<Record<string, Media>>({});
  const resolvedMediaItems = useMemo(
    () => mediaItems.map((item) => localOverrides[item.docId] ?? item),
    [localOverrides, mediaItems]
  );
  const selectedMedia = useMemo(
    () => resolvedMediaItems.find((item) => item.docId === selectedMediaId) ?? resolvedMediaItems[0] ?? null,
    [resolvedMediaItems, selectedMediaId]
  );
  const [captionDraft, setCaptionDraft] = useState('');
  const [focalH, setFocalH] = useState(50);
  const [focalV, setFocalV] = useState(50);
  const [saving, setSaving] = useState(false);
  const [replacing, setReplacing] = useState(false);
  const [relatedCards, setRelatedCards] = useState<RelatedCardSummary[]>([]);
  const [loadingRelatedCards, setLoadingRelatedCards] = useState(false);

  useEffect(() => {
    if (!selectedMedia) return;
    setCaptionDraft(selectedMedia.caption || '');
    const { horizontal, vertical } = parseObjectPositionToPercents(selectedMedia.objectPosition);
    setFocalH(horizontal);
    setFocalV(vertical);
  }, [selectedMedia]);

  useEffect(() => {
    if (!isOpen || !selectedMedia) return;
    let cancelled = false;
    setLoadingRelatedCards(true);
    void (async () => {
      try {
        let cardIds = Array.isArray(relatedCardIdsOverride)
          ? relatedCardIdsOverride
          : null;
        if (!cardIds) {
          const response = await fetch(
            `/api/media/reference-summary?id=${encodeURIComponent(selectedMedia.docId)}`,
            {
              cache: 'no-store',
              credentials: 'same-origin',
            }
          );
          if (response.ok) {
            const payload = (await response.json().catch(() => ({}))) as {
              summaries?: Record<string, string[]>;
            };
            cardIds = payload.summaries?.[selectedMedia.docId] ?? [];
          }
        }
        if (!cardIds || cardIds.length === 0) {
          if (!cancelled) {
            setRelatedCards([]);
          }
          return;
        }
        const loaded = await Promise.all(
          cardIds.map(async (cardId) => {
            try {
              const response = await fetch(`/api/cards/${encodeURIComponent(cardId)}?children=skip`, {
                cache: 'no-store',
                credentials: 'same-origin',
              });
              if (!response.ok) {
                return { id: cardId, title: cardId };
              }
              const data = (await response.json().catch(() => ({}))) as { title?: string; subtitle?: string };
              return {
                id: cardId,
                title: data.title?.trim() || data.subtitle?.trim() || cardId,
              };
            } catch {
              return { id: cardId, title: cardId };
            }
          })
        );
        if (!cancelled) {
          setRelatedCards(loaded);
        }
      } finally {
        if (!cancelled) setLoadingRelatedCards(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isOpen, relatedCardIdsOverride, selectedMedia]);

  const focalPreviewPosition = `${focalH}% ${focalV}%`;

  const handleSave = async () => {
    if (!selectedMedia) return;
    setSaving(true);
    try {
      await onSaveMediaFields(selectedMedia.docId, {
        caption: captionDraft,
        objectPosition: focalPreviewPosition,
      });
      setLocalOverrides((current) => ({
        ...current,
        [selectedMedia.docId]: {
          ...selectedMedia,
          caption: captionDraft,
          objectPosition: focalPreviewPosition,
        },
      }));
    } finally {
      setSaving(false);
    }
  };

  const handleReplaceFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !selectedMedia) return;
    setReplacing(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const response = await fetch(`/api/images/${selectedMedia.docId}/replace`, {
        method: 'POST',
        body: formData,
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(typeof data.message === 'string' ? data.message : 'Failed to replace image');
      }
      const refreshed = await fetch(`/api/images/${selectedMedia.docId}`, {
        cache: 'no-store',
        credentials: 'same-origin',
      });
      const refreshedData = (await refreshed.json().catch(() => ({}))) as { media?: Media };
      if (refreshed.ok && refreshedData.media) {
        setLocalOverrides((current) => ({
          ...current,
          [selectedMedia.docId]: refreshedData.media!,
        }));
        onMediaUpdated?.(refreshedData.media);
      }
    } catch (error) {
      feedback.showError(
        error instanceof Error ? error.message : 'Failed to replace image.',
        'Could not replace image'
      );
    } finally {
      setReplacing(false);
      event.target.value = '';
    }
  };

  const handleDelete = async () => {
    if (!selectedMedia || !onDeleteMedia) return;
    const shouldDelete = await feedback.confirm({
      title: 'Delete image?',
      message: 'Delete this image and remove its relationships where allowed?',
      confirmLabel: 'Delete',
      cancelLabel: 'Cancel',
      tone: 'danger',
    });
    if (!shouldDelete) return;
    try {
      await onDeleteMedia(selectedMedia.docId);
    } catch (error) {
      feedback.showError(
        error instanceof Error ? error.message : 'Failed to delete image.',
        'Could not delete image'
      );
    }
  };

  return (
    <EditModal
      isOpen={isOpen}
      onClose={onClose}
      title={selectedMedia ? `Edit media: ${selectedMedia.filename}` : 'Edit media'}
      size="wideTall"
      bodyClassName={styles.modalBody}
    >
      {selectedMedia ? (
        <div className={styles.shell}>
          <div className={styles.browser}>
            <div className={styles.mediaList}>
              {resolvedMediaItems.map((item) => (
                <button
                  key={item.docId}
                  type="button"
                  className={`${styles.mediaPickerButton} ${
                    item.docId === selectedMedia.docId ? styles.mediaPickerButtonActive : ''
                  }`}
                  onClick={() => onSelectMedia(item.docId)}
                >
                  <div className={styles.mediaPickerThumb}>
                    <JournalImage
                      src={getDisplayUrl(item)}
                      alt={item.caption || item.filename}
                      fill
                      className={styles.mediaPickerImage}
                      sizes="56px"
                      style={{ objectPosition: item.objectPosition || '50% 50%' }}
                    />
                  </div>
                  <div className={styles.mediaPickerMeta}>
                    <div className={styles.mediaPickerTitle}>{item.caption?.trim() || item.filename}</div>
                    <div className={styles.mediaPickerHint}>{item.docId}</div>
                  </div>
                </button>
              ))}
            </div>

            <div className={styles.editor}>
              <div className={styles.previewFrame}>
                <JournalImage
                  src={getDisplayUrl(selectedMedia)}
                  alt={selectedMedia.caption || selectedMedia.filename}
                  fill
                  className={styles.previewImage}
                  sizes="(max-width: 860px) 100vw, 560px"
                  style={{ objectPosition: focalPreviewPosition }}
                />
              </div>

              <div className={styles.fieldGrid}>
                <div className={`${styles.fieldGroup} ${styles.fieldGroupWide}`}>
                  <div className={styles.focalControlsCard}>
                    <div className={styles.focalControl}>
                      <div className={styles.focalControlHeader}>
                        <label className={styles.fieldLabel} htmlFor={`media-editor-focal-h-${selectedMedia.docId}`}>
                          Horizontal
                        </label>
                        <span className={styles.focalValue}>{Math.round(focalH)}%</span>
                      </div>
                      <input
                        id={`media-editor-focal-h-${selectedMedia.docId}`}
                        type="range"
                        min={0}
                        max={100}
                        value={focalH}
                        onChange={(event) => setFocalH(Number(event.target.value))}
                      />
                    </div>
                    <div className={styles.focalControl}>
                      <div className={styles.focalControlHeader}>
                        <label className={styles.fieldLabel} htmlFor={`media-editor-focal-v-${selectedMedia.docId}`}>
                          Vertical
                        </label>
                        <span className={styles.focalValue}>{Math.round(focalV)}%</span>
                      </div>
                      <input
                        id={`media-editor-focal-v-${selectedMedia.docId}`}
                        type="range"
                        min={0}
                        max={100}
                        value={focalV}
                        onChange={(event) => setFocalV(Number(event.target.value))}
                      />
                    </div>
                  </div>
                </div>
                <div className={`${styles.fieldGroup} ${styles.fieldGroupWide}`}>
                  <label className={styles.fieldLabel} htmlFor={`media-editor-caption-${selectedMedia.docId}`}>
                    Media caption
                  </label>
                  <textarea
                    id={`media-editor-caption-${selectedMedia.docId}`}
                    className={styles.textarea}
                    rows={4}
                    value={captionDraft}
                    onChange={(event) => setCaptionDraft(event.target.value)}
                  />
                  <p className={styles.hint}>
                    Media caption is the default source of truth. Card-level caption overrides should stay exceptional.
                  </p>
                </div>
              </div>

              {currentCardContext ? (
                <div className={styles.relationshipCard}>
                  <div className={styles.fieldLabel}>On current card</div>
                  <div className={styles.relationshipCurrent}>
                    {currentCardContext.cardTitle} {currentCardContext.roles.length ? `- ${currentCardContext.roles.join(', ')}` : ''}
                  </div>
                </div>
              ) : null}

              <div className={styles.relationshipCard}>
                <div className={styles.fieldLabel}>Used on cards</div>
                {loadingRelatedCards ? (
                  <div className={styles.emptyState}>Loading card references...</div>
                ) : relatedCards.length > 0 ? (
                  <div className={styles.relationshipList}>
                    {relatedCards.map((card) => (
                      <button
                        key={card.id}
                        type="button"
                        className={styles.relationshipButton}
                        onClick={() => router.push(`/admin/studio?card=${encodeURIComponent(card.id)}`)}
                      >
                        {card.title}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className={styles.emptyState}>This image is not assigned to any cards.</div>
                )}
              </div>

              <div className={styles.actions}>
                <div className={styles.actionsLeft}>
                  <input
                    ref={replaceInputRef}
                    type="file"
                    accept="image/*"
                    hidden
                    onChange={handleReplaceFileChange}
                  />
                  <button
                    type="button"
                    className={styles.secondaryButton}
                    onClick={() => replaceInputRef.current?.click()}
                    disabled={replacing}
                  >
                    {replacing ? 'Replacing...' : 'Replace image'}
                  </button>
                  {onDeleteMedia ? (
                    <button
                      type="button"
                      className={styles.dangerButton}
                      onClick={() => void handleDelete()}
                    >
                      Delete
                    </button>
                  ) : null}
                </div>
                <div className={styles.actionsRight}>
                  <button type="button" className={styles.secondaryButton} onClick={onClose}>
                    Close
                  </button>
                  <button
                    type="button"
                    className={styles.primaryButton}
                    onClick={() => void handleSave()}
                    disabled={saving}
                  >
                    {saving ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className={styles.emptyState}>No media available for editing.</div>
      )}
    </EditModal>
  );
}
