'use client';

import React, { useMemo } from 'react';
import { Card } from '@/lib/types/card';
import styles from '@/app/admin/card-admin/card-admin.module.css';
import { getAllowedDisplayModes, normalizeDisplayModeForType } from '@/lib/utils/cardDisplayMode';

interface EditableDisplayModeCellProps {
  card: Card;
  onUpdate: (cardId: string, updateData: Partial<Card>) => Promise<void>;
}

const MODE_LABEL: Record<Card['displayMode'], string> = {
  inline: 'Inline',
  navigate: 'Navigate',
  static: 'Static',
};

export default function EditableDisplayModeCell({ card, onUpdate }: EditableDisplayModeCellProps) {
  const allowed = useMemo(() => getAllowedDisplayModes(card.type), [card.type]);
  const value = normalizeDisplayModeForType(card.type, card.displayMode);

  const handleDisplayModeChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newDisplayMode = e.target.value as Card['displayMode'];
    try {
      await onUpdate(card.docId, { displayMode: newDisplayMode });
    } catch (error) {
      console.error('Failed to update display mode:', error);
    }
  };

  return (
    <select
      value={value}
      onChange={handleDisplayModeChange}
      className={styles.inlineEditSelect}
    >
      {allowed.map((mode) => (
        <option key={mode} value={mode}>
          {MODE_LABEL[mode]}
        </option>
      ))}
    </select>
  );
} 