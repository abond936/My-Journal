'use client';

import React from 'react';
import { Card } from '@/lib/types/card';
import styles from '@/app/admin/card-admin/card-admin.module.css';

interface EditableDisplayModeCellProps {
  card: Card;
  onUpdate: (cardId: string, updateData: Partial<Card>) => Promise<void>;
}

export default function EditableDisplayModeCell({ card, onUpdate }: EditableDisplayModeCellProps) {
  
  const handleDisplayModeChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newDisplayMode = e.target.value as Card['displayMode'];
    try {
      await onUpdate(card.docId, { displayMode: newDisplayMode });
    } catch (error) {
      console.error('Failed to update display mode:', error);
      // Optional: Add user feedback, e.g., a toast notification
    }
  };

  return (
    <select
      value={card.displayMode}
      onChange={handleDisplayModeChange}
      className={styles.inlineEditSelect}
    >
      <option value="navigate">Navigate</option>
      <option value="inline">Inline</option>
      <option value="static">Static</option>
    </select>
  );
} 