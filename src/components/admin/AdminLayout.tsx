'use client';

import React from 'react';
import styles from './AdminLayout.module.css';
import AdminNavTabs from '@/components/admin/AdminNavTabs';
import AdminDesktopOnlyGate from './AdminDesktopOnlyGate';

interface AdminLayoutProps {
  children: React.ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  return (
    <AdminDesktopOnlyGate>
      <div className={styles.simplifiedLayout}>
        <div className={styles.topNavContainer} id="admin-tabs-bar">
          <AdminNavTabs />
        </div>
        <div className={styles.pageContent}>{children}</div>
      </div>
    </AdminDesktopOnlyGate>
  );
} 