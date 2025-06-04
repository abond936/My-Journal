'use client';

import ViewLayout from '@/components/layouts/ViewLayout';
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