'use client';

import React from 'react';
import styles from './LoadingOverlay.module.css';
import clsx from 'clsx';

interface LoadingOverlayProps {
  isVisible: boolean;
  message?: string;
  className?: string;
}

export default function LoadingOverlay({ isVisible, message = 'Saving changes...', className }: LoadingOverlayProps) {
  if (!isVisible) return null;

  return (
    <div className={clsx(styles.overlay, className)}>
      <div className={styles.content}>
        <div className={styles.spinner} />
        <p className={styles.message}>{message}</p>
      </div>
    </div>
  );
} 