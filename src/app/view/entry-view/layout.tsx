'use client';

import React from 'react';
import ViewLayout from '@/components/view/ViewLayout';

export default function EntriesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ViewLayout>
      {children}
    </ViewLayout>
  );
} 