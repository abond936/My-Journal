'use client';

import { AuthProvider } from '@/lib/services/auth';
import AppFrame from '@/components/layouts/AppFrame';
import { TagProvider, useTag } from '@/lib/contexts/TagContext';

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
    <AuthProvider>
      <TagProvider>
        <LayoutWithTagSelection>
          {children}
        </LayoutWithTagSelection>
      </TagProvider>
    </AuthProvider>
  );
} 