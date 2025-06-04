'use client';

import ViewLayout from '@/components/layouts/ViewLayout';

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