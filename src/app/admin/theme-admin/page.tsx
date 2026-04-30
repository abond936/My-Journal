'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTheme } from '@/components/providers/ThemeProvider';

export default function AdminThemePage() {
  const router = useRouter();
  const { openThemeAdmin, lastNonThemeAdminPath } = useTheme();

  useEffect(() => {
    openThemeAdmin();
    router.replace(lastNonThemeAdminPath || '/view');
  }, [lastNonThemeAdminPath, openThemeAdmin, router]);

  return null;
}
