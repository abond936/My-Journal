'use client';

import React, { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import AdminFAB from '@/components/admin/AdminFAB';

interface AdminPageWrapperProps {
  children: React.ReactNode;
}

// List of paths where the FAB should be hidden
const HIDDEN_PATHS = [
  '/admin/tag-admin',
];

// List of prefixes for paths where the FAB should be hidden
const HIDDEN_PATH_PREFIXES = [
  '/admin/entry-admin/new',
  '/admin/entry-admin/edit',
  '/admin/album-admin/new',
  '/admin/album-admin/edit',
];

export default function AdminPageWrapper({ children }: AdminPageWrapperProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const pathname = usePathname();

  // Close the FAB when the path changes
  useEffect(() => {
    setIsExpanded(false);
  }, [pathname]);

  const handleToggle = () => {
    setIsExpanded(prev => !prev);
  };

  // Determine if the FAB should be visible
  const isFabVisible = !HIDDEN_PATHS.includes(pathname) && 
                       !HIDDEN_PATH_PREFIXES.some(prefix => pathname.startsWith(prefix));

  return (
    <>
      {children}
      {isFabVisible && <AdminFAB isExpanded={isExpanded} onToggle={handleToggle} />}
    </>
  );
} 