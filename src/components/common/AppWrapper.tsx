'use client';

import React from 'react';
import ViewLayout from '@/components/view/ViewLayout';
import { useTag } from '@/lib/contexts/TagContext';

function LayoutWithTagSelection({ children }: { children: React.ReactNode }) {
  const { selectedTag, setSelectedTag } = useTag();

  return (
    <ViewLayout onTagSelect={setSelectedTag}>
      {children}
    </ViewLayout>
  );
}

export default function AppWrapper({ children }: { children: React.ReactNode }) {
  return (
    <LayoutWithTagSelection>
      {children}
    </LayoutWithTagSelection>
  );
} 