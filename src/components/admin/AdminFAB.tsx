'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import styles from './AdminFAB.module.css';

export default function AdminFAB() {
  const [isExpanded, setIsExpanded] = useState(false);

  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <div className={styles.fabContainer}>
      {isExpanded && (
        <div className={styles.fabOptions}>
          <Link href="/admin/entry-admin/new" className={styles.fabOption}>
            <span className={styles.optionIcon}>📝</span>
            <span className={styles.optionLabel}>New Entry</span>
          </Link>
          <Link href="/admin/album-admin/new" className={styles.fabOption}>
            <span className={styles.optionIcon}>🖼️</span>
            <span className={styles.optionLabel}>New Album</span>
          </Link>
        </div>
      )}
      <button 
        className={`${styles.fab} ${isExpanded ? styles.expanded : ''}`}
        onClick={toggleExpand}
        aria-label="Create new content"
      >
        <span className={styles.fabIcon}>+</span>
      </button>
    </div>
  );
} 