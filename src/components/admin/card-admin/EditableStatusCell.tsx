'use client';

import React from 'react';
import { Card } from '@/lib/types/card';
import styles from '@/app/admin/card-admin/card-admin.module.css';

interface EditableStatusCellProps {
  card: Card;
  onUpdate: (cardId: string, updateData: Partial<Card>) => Promise<void>;
}

export default function EditableStatusCell({ card, onUpdate }: EditableStatusCellProps) {
  
  const handleStatusChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newStatus = e.target.value as Card['status'];
    try {
      await onUpdate(card.docId, { status: newStatus });
    } catch (error) {
      console.error('Failed to update status:', error);
      // Optional: Add user feedback, e.g., a toast notification
    }
  };

  return (
    <select
      value={card.status}
      onChange={handleStatusChange}
      className={styles.inlineEditSelect}
    >
      <option value="draft">Draft</option>
      <option value="published">Published</option>
    </select>
  );
} 