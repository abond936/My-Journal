'use client';

import React from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import styles from './AdminFAB.module.css';

export default function AdminFAB() {
  const { data: session, status } = useSession();

  if (status !== 'authenticated' || session?.user?.role !== 'admin') {
    return null;
  }

  return (
    <div className={styles.fabContainer}>
      <Link href="/admin/studio?new=1" className={`${styles.fab} ${styles.fabOption}`} aria-label="Create new card">
        <span className={styles.fabIcon}>+</span>
      </Link>
    </div>
  );
} 
