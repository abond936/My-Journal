'use client';

import React from 'react';
import clsx from 'clsx';
import styles from './EditModal.module.css';

interface EditModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title: string;
  /** Wider shell when content needs horizontal room (e.g. gallery tag picker). */
  size?: 'default' | 'wide';
}

export default function EditModal({
  isOpen,
  onClose,
  children,
  title,
  size = 'default',
}: EditModalProps) {
  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div
        className={clsx(styles.modal, size === 'wide' && styles.modalWide)}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.header}>
          <h3>{title}</h3>
          <button onClick={onClose} className={styles.closeButton}>
            &times;
          </button>
        </div>
        <div className={styles.body}>
          {children}
        </div>
      </div>
    </div>
  );
} 