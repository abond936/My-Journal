'use client';

import { AuthProvider } from '@/lib/services/auth';
import LayoutWrapper from '@/components/common/LayoutWrapper';
import { TagProvider, useTag } from '@/lib/contexts/TagContext';

function LayoutWithTagSelection({ children }: { children: React.ReactNode }) {
  const { selectedTag, setSelectedTag } = useTag();

  return (
    <LayoutWrapper onTagSelect={setSelectedTag}>
      {children}
    </LayoutWrapper>
  );
}

export default function RootLayoutWrapper({ children }: { children: React.ReactNode }) {
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