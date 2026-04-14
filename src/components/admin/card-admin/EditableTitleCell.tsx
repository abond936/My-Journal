'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/lib/types/card';
import styles from '@/app/admin/card-admin/card-admin.module.css';

interface EditableTitleCellProps {
  card: Card;
  onUpdate: (cardId: string, updateData: Partial<Card>) => Promise<void>;
}

export default function EditableTitleCell({ card, onUpdate }: EditableTitleCellProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(card.title);
  const [error, setError] = useState<string | null>(null);

  // If the card prop changes from the outside, update the local state
  useEffect(() => {
    setTitle(card.title);
    setError(null);
  }, [card.title]);

  const handleSave = async () => {
    const nextTitle = title.trim();
    if (!nextTitle) {
      setError('Title is required');
      return;
    }
    setIsEditing(false);
    setError(null);
    // Only call update if the title has actually changed
    if (nextTitle !== card.title) {
      try {
        await onUpdate(card.docId, { title: nextTitle });
      } catch (error) {
        console.error('Failed to update title:', error);
        // Revert to original title on error
        setTitle(card.title);
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      setTitle(card.title);
      setIsEditing(false);
      setError(null);
    }
  };

  if (isEditing) {
    return (
      <div>
        <input
          type="text"
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            if (error) setError(null);
          }}
          onBlur={handleSave}
          onKeyDown={handleKeyDown}
          className={styles.inlineEditInput}
          autoFocus
        />
        {error ? <div className={styles.inlineValidationError}>{error}</div> : null}
      </div>
    );
  }

  return (
    <span onClick={() => setIsEditing(true)} className={styles.editableField}>
      {card.title || <span className={styles.emptyField}>(No title)</span>}
    </span>
  );
} 