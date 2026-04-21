'use client';

import React, { useRef, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import JournalImage from '@/components/common/JournalImage';
import EditModal from '@/components/admin/card-admin/EditModal';
import { DirectDimensionChipCell } from '@/components/admin/common/DirectDimensionChips';
import { Media } from '@/lib/types/photo';
import { useMedia } from '@/components/providers/MediaProvider';
import { useTag } from '@/components/providers/TagProvider';
import { parseObjectPositionToPercents } from '@/lib/utils/parseObjectPositionPercent';
import { getCoreTagsByDimension } from '@/lib/utils/tagDisplay';
import { isMediaAssigned } from '@/lib/utils/mediaAssignmentSeek';
import type { DraggableAttributes, DraggableSyntheticListeners } from '@dnd-kit/core';
import styles from './MediaAdminRow.module.css';

export type MediaAdminRowStudioDragBind = {
  attributes: DraggableAttributes;
  listeners: DraggableSyntheticListeners;
  setNodeRef: (el: HTMLElement | null) => void;
  setActivatorNodeRef: (el: HTMLElement | null) => void;
  style: React.CSSProperties;
};

interface ColumnConfig {
  key: string;
  label: string;
  width: number;
  minWidth: number;
  maxWidth: number;
  sortable?: boolean;
}

interface MediaAdminRowProps {
  media: Media;
  columns: ColumnConfig[];
  isSelected: boolean;
  onToggleSelection: () => void;
  /** When set (Studio + `DndContext`), row is draggable as `source:{mediaId}` for cover/gallery drops. */
  studioDragBind?: MediaAdminRowStudioDragBind;
}

/** Row props without internal Studio drag binding (used by `MediaAdminRowStudioSource`). */
export type MediaAdminRowBaseProps = Omit<MediaAdminRowProps, 'studioDragBind'>;

export default function MediaAdminRow({
  media,
  columns,
  isSelected,
  onToggleSelection,
  studioDragBind,
}: MediaAdminRowProps) {
  const focalInActions = !columns.some((c) => c.key === 'objectPosition');
  const { deleteMedia, updateMedia, fetchMedia, currentPage } = useMedia();
  const { tags } = useTag();
  const tagNameMap = React.useMemo(
    () => new Map(tags.filter((t) => t.docId).map((t) => [t.docId as string, t.name])),
    [tags]
  );
  const core = React.useMemo(() => getCoreTagsByDimension(media), [media]);
  const [isEditingCaption, setIsEditingCaption] = useState(false);
  const [captionValue, setCaptionValue] = useState(media.caption || '');
  const [focalModalOpen, setFocalModalOpen] = useState(false);
  const [focalH, setFocalH] = useState(50);
  const [focalV, setFocalV] = useState(50);
  const [replacing, setReplacing] = useState(false);
  const replaceInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setCaptionValue(media.caption || '');
  }, [media.docId, media.caption]);

  useEffect(() => {
    if (!focalModalOpen) return;
    const { horizontal, vertical } = parseObjectPositionToPercents(media.objectPosition);
    setFocalH(horizontal);
    setFocalV(vertical);
  }, [focalModalOpen, media.docId, media.objectPosition]);

  const handleDelete = async () => {
    if (confirm(`Are you sure you want to delete "${media.filename}"?`)) {
      await deleteMedia(media.docId);
    }
  };

  const handleCaptionSave = async () => {
    if (captionValue !== media.caption) {
      await updateMedia(media.docId, { caption: captionValue });
    }
    setIsEditingCaption(false);
  };

  const handleCaptionCancel = () => {
    setCaptionValue(media.caption || '');
    setIsEditingCaption(false);
  };

  const handleReplaceClick = () => {
    replaceInputRef.current?.click();
  };

  const handleReplaceFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setReplacing(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const response = await fetch(`/api/images/${media.docId}/replace`, {
        method: 'POST',
        body: formData,
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(typeof data.message === 'string' ? data.message : 'Failed to replace image');
      }
      await fetchMedia(currentPage);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to replace image';
      alert(message);
    } finally {
      setReplacing(false);
      event.target.value = '';
    }
  };

  const renderCell = (column: ColumnConfig) => {
    switch (column.key) {
      case 'assignment': {
        const assigned = isMediaAssigned(media);
        return (
          <span className={`${styles.assignmentBadge} ${assigned ? styles.assigned : styles.unassigned}`}>
            {assigned ? 'Assigned' : 'Unassigned'}
          </span>
        );
      }

      case 'thumbnail':
        return (
          <div className={styles.thumbnail}>
            <JournalImage 
              src={media.storageUrl} 
              alt={media.filename}
              width={96}
              height={96}
              className={styles.thumbnailImage}
              sizes="96px"
              style={{
                objectFit: 'cover',
                objectPosition: media.objectPosition || '50% 50%',
              }}
            />
          </div>
        );

      case 'filename':
        return (
          <div className={styles.filename} title={media.filename}>
            {media.filename}
          </div>
        );

      case 'docId':
        return (
          <div className={styles.mediaId} title={media.docId}>
            {media.docId}
          </div>
        );

      case 'caption':
        if (isEditingCaption) {
          return (
            <div className={styles.captionEdit}>
              <input
                type="text"
                value={captionValue}
                onChange={(e) => setCaptionValue(e.target.value)}
                onBlur={handleCaptionSave}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCaptionSave();
                  if (e.key === 'Escape') handleCaptionCancel();
                }}
                autoFocus
                className={styles.captionInput}
              />
            </div>
          );
        }
        return (
          <div 
            className={styles.caption} 
            title={media.caption || 'No caption'}
            onClick={() => setIsEditingCaption(true)}
          >
            {media.caption || 'No caption'}
          </div>
        );

      case 'width':
        return <div className={styles.number}>{media.width}</div>;

      case 'height':
        return <div className={styles.number}>{media.height}</div>;

      case 'size':
        const formatFileSize = (bytes: number) => {
          if (bytes === 0) return '0 B';
          const k = 1024;
          const sizes = ['B', 'KB', 'MB', 'GB'];
          const i = Math.floor(Math.log(bytes) / Math.log(k));
          return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
        };
        return <div className={styles.number}>{formatFileSize(media.size || 0)}</div>;

      case 'contentType':
        return <div className={styles.contentType}>{media.contentType || 'Unknown'}</div>;

      case 'objectPosition': {
        const display = (media.objectPosition || '50% 50%').trim();
        return (
          <div className={styles.objectPositionCell}>
            <span className={styles.objectPosition} title={display}>
              {display}
            </span>
            <button
              type="button"
              className={styles.focalEditButton}
              onClick={() => setFocalModalOpen(true)}
            >
              Edit focal
            </button>
          </div>
        );
      }

      case 'source':
        return (
          <span className={`${styles.sourceBadge} ${styles[media.source]}`}>
            {media.source}
          </span>
        );

      case 'who':
        return (
          <DirectDimensionChipCell
            ids={core.who}
            tagNameMap={tagNameMap}
            dimension="who"
            variant="table"
          />
        );

      case 'what':
        return (
          <DirectDimensionChipCell
            ids={core.what}
            tagNameMap={tagNameMap}
            dimension="what"
            variant="table"
          />
        );

      case 'when':
        return (
          <DirectDimensionChipCell
            ids={core.when}
            tagNameMap={tagNameMap}
            dimension="when"
            variant="table"
          />
        );

      case 'where':
        return (
          <DirectDimensionChipCell
            ids={core.where}
            tagNameMap={tagNameMap}
            dimension="where"
            variant="table"
          />
        );

      case 'sourcePath':
        return (
          <div className={styles.sourcePath} title={media.sourcePath}>
            {media.sourcePath}
          </div>
        );

      case 'actions':
        return (
          <div className={styles.actions}>
            {focalInActions ? (
              <button
                type="button"
                onClick={() => setFocalModalOpen(true)}
                className={styles.actionButton}
                title="Default focal (crop)"
                disabled={replacing}
              >
                Focal
              </button>
            ) : null}
            <input
              ref={replaceInputRef}
              type="file"
              accept="image/*"
              className={styles.hiddenFileInput}
              onChange={handleReplaceFileChange}
            />
            <button
              onClick={handleReplaceClick}
              className={styles.actionButton}
              title="Replace image file"
              disabled={replacing}
            >
              {replacing ? '...' : '↺'}
            </button>
            <button 
              onClick={handleDelete}
              className={`${styles.actionButton} ${styles.deleteButton}`}
              title="Delete"
              disabled={replacing}
            >
              🗑️
            </button>
          </div>
        );

      default:
        return null;
    }
  };

  const focalPreviewPosition = `${focalH}% ${focalV}%`;

  const handleFocalSave = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateMedia(media.docId, { objectPosition: focalPreviewPosition });
    setFocalModalOpen(false);
  };

  return (
    <>
      <tr
        ref={studioDragBind?.setNodeRef}
        style={studioDragBind?.style}
        className={`${styles.row} ${isSelected ? styles.selected : ''}`}
      >
        <td className={`${styles.checkboxCell} ${studioDragBind ? styles.checkboxCellWithStudioHandle : ''}`}>
          {studioDragBind ? (
            <button
              type="button"
              ref={studioDragBind.setActivatorNodeRef}
              className={styles.studioSourceDragHandle}
              aria-label="Drag to selected card cover or gallery. Space to pick up, arrows to move, Space to drop."
              title="Drag to Cover or Gallery (Studio Card edit)"
              data-studio-dnd-return-focus={media.docId ? `source:${media.docId}` : undefined}
              {...studioDragBind.attributes}
              {...studioDragBind.listeners}
            >
              ⋮⋮
            </button>
          ) : null}
          <input
            type="checkbox"
            checked={isSelected}
            onChange={onToggleSelection}
          />
        </td>
        {columns.map((column) => (
          <td 
            key={column.key}
            className={styles.cell}
            style={{ width: column.width }}
          >
            {renderCell(column)}
          </td>
        ))}
      </tr>

      {typeof document !== 'undefined' &&
        createPortal(
          <EditModal
            isOpen={focalModalOpen}
            onClose={() => setFocalModalOpen(false)}
            title={`Default focal: ${media.filename}`}
          >
            <form onSubmit={handleFocalSave} className={styles.focalForm}>
              <p className={styles.focalFormIntro}>
                This is the default crop focal for this asset. Gallery slots inherit it unless you override them on the card.
              </p>
              <div className={styles.focalPreview}>
                <JournalImage
                  src={media.storageUrl}
                  alt=""
                  width={480}
                  height={360}
                  className={styles.focalPreviewImage}
                  sizes="(max-width: 520px) 100vw, 480px"
                  style={{
                    objectFit: 'cover',
                    objectPosition: focalPreviewPosition,
                  }}
                />
              </div>
              <div className={styles.focalSliderRow}>
                <label htmlFor={`focal-h-${media.docId}`}>Horizontal</label>
                <input
                  id={`focal-h-${media.docId}`}
                  type="range"
                  min={0}
                  max={100}
                  value={focalH}
                  onChange={e => setFocalH(Number(e.target.value))}
                  className={styles.focalSlider}
                />
              </div>
              <div className={styles.focalSliderRow}>
                <label htmlFor={`focal-v-${media.docId}`}>Vertical</label>
                <input
                  id={`focal-v-${media.docId}`}
                  type="range"
                  min={0}
                  max={100}
                  value={focalV}
                  onChange={e => setFocalV(Number(e.target.value))}
                  className={styles.focalSlider}
                />
              </div>
              <p className={styles.focalFormHint}>
                Saved as <code>{focalPreviewPosition}</code>
              </p>
              <div className={styles.focalFormActions}>
                <button type="button" className={styles.focalCancelButton} onClick={() => setFocalModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className={styles.focalSaveButton}>
                  Save
                </button>
              </div>
            </form>
          </EditModal>,
          document.body
        )}
    </>
  );
} 