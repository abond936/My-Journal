'use client';

import React from 'react';
import ViewLayout from '@/components/view/ViewLayout';
import AdminFAB from '@/components/admin/AdminFAB';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ViewLayout>
      {children}
      <AdminFAB />
    </ViewLayout>
  );
} 