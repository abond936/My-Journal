'use client';

import React from 'react';
import clsx from 'clsx';
import styles from './PanelActivityOverlay.module.css';

type PanelActivityOverlayProps = {
  active: boolean;
  title: string;
  message?: string;
  blocking?: boolean;
  className?: string;
};

export default function PanelActivityOverlay({
  active,
  title,
  message,
  blocking = false,
  className,
}: PanelActivityOverlayProps) {
  if (!active) return null;

  return (
    <div
      className={clsx(
        styles.overlay,
        blocking ? styles.overlayBlocking : styles.overlayPassive,
        className
      )}
      role="presentation"
    >
      <div className={styles.content} role="status" aria-live="polite" aria-busy="true">
        <div className={styles.spinner} aria-hidden="true" />
        <p className={styles.title}>{title}</p>
        {message ? <p className={styles.message}>{message}</p> : null}
      </div>
    </div>
  );
}
