'use client';

import { useEffect } from 'react';
import { useCardForm } from '@/components/providers/CardFormProvider';

interface KeyboardShortcutsProps {
  onSave: () => void;
  onCancel: () => void;
}

export default function KeyboardShortcuts({ onSave, onCancel }: KeyboardShortcutsProps) {
  const { formState: { isDirty } } = useCardForm();

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