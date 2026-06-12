'use client';

import dynamic from 'next/dynamic';
import { useSession } from 'next-auth/react';
import { useTheme } from '@/components/providers/ThemeProvider';

const ThemeAdminOverlay = dynamic(() => import('@/components/common/ThemeAdminOverlay'), {
  ssr: false,
  loading: () => null,
});

export default function LazyThemeAdminOverlay() {
  const { data: session } = useSession();
  const { isThemeAdminOpen } = useTheme();
  const isAdmin = session?.user?.role === 'admin';

  if (!isAdmin || !isThemeAdminOpen) {
    return null;
  }

  return <ThemeAdminOverlay />;
}
