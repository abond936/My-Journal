'use client';

import { useRouter } from 'next/navigation';
import {
  readStoredStudioCardBankSharedFilterPreferences,
  writeStoredStudioCardBankSharedFilterPreferences,
  type StudioCardBankStatusFilter,
} from '@/lib/preferences/adminFilters';

type DashboardCardStatusLinkProps = {
  className?: string;
  status: StudioCardBankStatusFilter;
  children: React.ReactNode;
};

export default function DashboardCardStatusLink({
  className,
  status,
  children,
}: DashboardCardStatusLinkProps) {
  const router = useRouter();

  const openStudio = () => {
    const current = readStoredStudioCardBankSharedFilterPreferences();
    writeStoredStudioCardBankSharedFilterPreferences({
      ...current,
      search: '',
      statusFilter: status,
    });
    router.push('/admin/studio?destination=cards');
  };

  return (
    <button type="button" className={className} onClick={openStudio}>
      {children}
    </button>
  );
}
