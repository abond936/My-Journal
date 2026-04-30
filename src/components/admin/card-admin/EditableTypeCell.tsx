'use client';

import React from 'react';
import { Card } from '@/lib/types/card';
import styles from '@/app/admin/card-admin/card-admin.module.css';

interface EditableTypeCellProps {
  card: Card;
  onUpdate: (cardId: string, updateData: Partial<Card>) => Promise<void>;
}

export default function EditableTypeCell({ card, onUpdate }: EditableTypeCellProps) {
  
  const handleTypeChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newType = e.target.value as Card['type'];
    try {
      await onUpdate(card.docId, { type: newType });
    } catch (error) {
      console.error('Failed to update type:', error);
      // Optional: Add user feedback, e.g., a toast notification
    }
  };

  return (
    <select
      value={card.type}
      onChange={handleTypeChange}
      className={styles.inlineEditSelect}
    >
      <option value="story">Story</option>
      {card.type === 'qa' && <option value="qa">Q&A</option>}
      <option value="quote">Quote</option>
      <option value="callout">Callout</option>
      <option value="gallery">Gallery</option>
    </select>
  );
} 
