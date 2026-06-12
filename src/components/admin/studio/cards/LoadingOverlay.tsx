'use client';

import React from 'react';
import styles from './LoadingOverlay.module.css';
import clsx from 'clsx';

interface LoadingOverlayProps {
  isVisible: boolean;
  title?: string;
  message?: string;
  className?: string;
}

export default function LoadingOverlay({
  isVisible,
  title = 'Saving card...',
  message = 'Applying your updates and refreshing related views.',
  className,
}: LoadingOverlayProps) {
  if (!isVisible) return null;

  return (
    <div className={clsx(styles.overlay, className)} role="presentation">
      <div className={styles.content} role="status" aria-live="polite" aria-busy="true">
        <div className={styles.spinner} aria-hidden="true" />
        <p className={styles.title}>{title}</p>
        <p className={styles.message}>{message}</p>
      </div>
    </div>
  );
} 