'use client';

import React from 'react';
import clsx from 'clsx';
import { X } from 'lucide-react';
import styles from './EditModal.module.css';

interface EditModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title: string;
  /** Wider shell when content needs horizontal room (e.g. gallery tag picker). */
  size?: 'default' | 'wide' | 'wideTall';
  modalClassName?: string;
  bodyClassName?: string;
}

export default function EditModal({
  isOpen,
  onClose,
  children,
  title,
  size = 'default',
  modalClassName,
  bodyClassName,
}: EditModalProps) {
  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div
        className={clsx(
          styles.modal,
          size === 'wide' && styles.modalWide,
          size === 'wideTall' && styles.modalWideTall,
          modalClassName
        )}
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className={styles.header}>
          <h3>{title}</h3>
          <button onClick={onClose} className={styles.closeButton} aria-label="Close dialog">
            <X size={16} aria-hidden="true" />
          </button>
        </div>
        <div className={clsx(styles.body, bodyClassName)}>
          {children}
        </div>
      </div>
    </div>
  );
} 
