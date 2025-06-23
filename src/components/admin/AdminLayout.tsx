'use client';

import React from 'react';
import styles from './AdminLayout.module.css';
import AdminNavTabs from '@/components/admin/AdminNavTabs';

interface AdminLayoutProps {
  children: React.ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  return (
    <div className={styles.simplifiedLayout}>
      <div className={styles.topNavContainer}>
        <AdminNavTabs />
      </div>
      <div className={styles.pageContent}>
        {children}
      </div>
    </div>
  );
} 