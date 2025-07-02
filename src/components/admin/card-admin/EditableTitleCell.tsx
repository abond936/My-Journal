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

  // If the card prop changes from the outside, update the local state
  useEffect(() => {
    setTitle(card.title);
  }, [card.title]);

  const handleSave = async () => {
    setIsEditing(false);
    // Only call update if the title has actually changed
    if (title.trim() !== card.title) {
      try {
        await onUpdate(card.docId, { title: title.trim() });
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
    }
  };

  if (isEditing) {
    return (
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onBlur={handleSave}
        onKeyDown={handleKeyDown}
        className={styles.inlineEditInput}
        autoFocus
      />
    );
  }

  return (
    <span onClick={() => setIsEditing(true)} className={styles.editableField}>
      {card.title || <span className={styles.emptyField}>(No title)</span>}
    </span>
  );
} 