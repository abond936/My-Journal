'use client';

import React, { useState } from 'react';
import JournalImage from '@/components/common/JournalImage';
import { Media } from '@/lib/types/photo';
import { useMedia } from '@/components/providers/MediaProvider';
import styles from './MediaAdminRow.module.css';

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
}

export default function MediaAdminRow({ 
  media, 
  columns, 
  isSelected, 
  onToggleSelection 
}: MediaAdminRowProps) {
  const { deleteMedia, updateMedia } = useMedia();
  const [isEditingCaption, setIsEditingCaption] = useState(false);
  const [captionValue, setCaptionValue] = useState(media.caption || '');

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

  const renderCell = (column: ColumnConfig) => {
    switch (column.key) {
      case 'status':
        return (
          <span className={`${styles.statusBadge} ${styles[media.status]}`}>
            {media.status}
          </span>
        );

      case 'thumbnail':
        return (
          <div className={styles.thumbnail}>
            <JournalImage 
              src={media.storageUrl} 
              alt={media.filename}
              width={60}
              height={60}
              className={styles.thumbnailImage}
              sizes="60px"
            />
          </div>
        );

      case 'filename':
        return (
          <div className={styles.filename} title={media.filename}>
            {media.filename}
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

      case 'objectPosition':
        return (
          <div className={styles.objectPosition} title={media.objectPosition}>
            {media.objectPosition}
          </div>
        );

      case 'source':
        return (
          <span className={`${styles.sourceBadge} ${styles[media.source]}`}>
            {media.source}
          </span>
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
            <button 
              onClick={handleDelete}
              className={`${styles.actionButton} ${styles.deleteButton}`}
              title="Delete"
            >
              🗑️
            </button>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <tr className={`${styles.row} ${isSelected ? styles.selected : ''}`}>
      <td className={styles.checkboxCell}>
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
  );
} 