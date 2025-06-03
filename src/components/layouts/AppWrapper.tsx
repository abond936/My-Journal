'use client';

import AppFrame from '@/components/layouts/AppFrame';
import { useTag } from '@/lib/contexts/TagContext';

function LayoutWithTagSelection({ children }: { children: React.ReactNode }) {
  const { selectedTag, setSelectedTag } = useTag();

  return (
    <AppFrame onTagSelect={setSelectedTag}>
      {children}
    </AppFrame>
  );
}

export default function AppWrapper({ children }: { children: React.ReactNode }) {
  return (
    <LayoutWithTagSelection>
      {children}
    </LayoutWithTagSelection>
  );
} 