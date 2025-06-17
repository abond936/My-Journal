'use client';

import React from 'react';
import Link from 'next/link';
import styles from './AdminFAB.module.css';

export default function CardAdminFAB() {
  return (
    <div className={styles.fabContainer}>
      <Link href="/admin/card-admin/new" className={`${styles.fab} ${styles.fabOption}`} aria-label="Create new card">
        <span className={styles.fabIcon}>+</span>
      </Link>
    </div>
  );
} 