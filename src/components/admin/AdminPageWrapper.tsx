'use client';

import React, { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import styles from './AdminLayout.module.css';
import AdminFAB from './card-admin/AdminFAB';

interface AdminPageWrapperProps {
  children: React.ReactNode;
}

export default function AdminPageWrapper({ children }: AdminPageWrapperProps) {
  const pathname = usePathname();
  const { data: session } = useSession();

  const showTabs = !pathname.includes('/new') && !pathname.includes('/edit');

  if (!session || session.user.role !== 'admin') {
    return <div>Access Denied</div>;
  }

  return (
    <div className={styles.layout}>
      <div className={styles.mainContent}>
        <div className={styles.pageContent}>
          {children}
        </div>
      </div>
      <AdminFAB />
    </div>
  );
} 