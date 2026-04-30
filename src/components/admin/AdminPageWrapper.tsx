'use client';

import React from 'react';
import { useSession } from 'next-auth/react';
import styles from './AdminLayout.module.css';
import AdminFAB from './card-admin/AdminFAB';
import LoadingSpinner from '@/components/common/LoadingSpinner';

interface AdminPageWrapperProps {
  children: React.ReactNode;
}

export default function AdminPageWrapper({ children }: AdminPageWrapperProps) {
  const { data: session, status } = useSession();

  // Client session hydrates after first paint; `session` is undefined while `loading` — do not treat as denied.
  if (status === 'loading') {
    return <LoadingSpinner />;
  }

  if (status === 'unauthenticated' || !session) {
    return (
      <div className={styles.accessMessage} role="status">
        Sign in required. If you were redirected here from a bookmark, open the home page and sign in as an
        administrator.
      </div>
    );
  }

  if (session.user.role !== 'admin') {
    return (
      <div className={styles.accessMessage} role="alert">
        Access denied — this area is for administrators only.
        {session.user.role === 'viewer'
          ? ' You are signed in with a viewer account; use an admin account to use the admin console.'
          : null}
      </div>
    );
  }

  return (
    <div className={styles.pageShell}>
      <div className={styles.pageContent}>{children}</div>
      <AdminFAB />
    </div>
  );
}
