'use client';

import React from 'react';
import Link from 'next/link';
import styles from './AdminFAB.module.css';

interface AdminFABProps {
  isExpanded: boolean;
  onToggle: () => void;
}

export default function AdminFAB({ isExpanded, onToggle }: AdminFABProps) {
  return (
    <div className={styles.fabContainer}>
      {isExpanded && (
        <div className={styles.fabOptions}>
          <Link href="/admin/entry-admin/new" className={styles.fabOption} onClick={onToggle}>
            <span className={styles.optionIcon}>📝</span>
            <span className={styles.optionLabel}>New Entry</span>
          </Link>
          <Link href="/admin/album-admin/new" className={styles.fabOption} onClick={onToggle}>
            <span className={styles.optionIcon}>🖼️</span>
            <span className={styles.optionLabel}>New Album</span>
          </Link>
        </div>
      )}
      <button 
        className={`${styles.fab} ${isExpanded ? styles.expanded : ''}`}
        onClick={onToggle}
        aria-label="Create new content"
      >
        <span className={styles.fabIcon}>+</span>
      </button>
    </div>
  );
} 