'use client';

import { useEffect, useMemo } from 'react';
import { useCardForm } from '@/components/providers/CardFormProvider';

interface KeyboardShortcutsProps {
  onSave: () => void;
  onCancel: () => void;
}

export default function KeyboardShortcuts({ onSave, onCancel }: KeyboardShortcutsProps) {
  const { formState } = useCardForm();
  const isDirty = useMemo(
    () =>
      JSON.stringify(formState.cardData) !==
      JSON.stringify(formState.lastSavedState.cardData),
    [formState.cardData, formState.lastSavedState.cardData]
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Save: Ctrl/Cmd + S
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (isDirty) {
          onSave();
        }
      }
      
      // Cancel: Escape
      if (e.key === 'Escape') {
        e.preventDefault();
        onCancel();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isDirty, onSave, onCancel]);

  return null;
} 