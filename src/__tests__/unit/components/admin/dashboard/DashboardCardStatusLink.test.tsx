import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import DashboardCardStatusLink from '@/components/admin/dashboard/DashboardCardStatusLink';
import { readStoredStudioCardBankSharedFilterPreferences } from '@/lib/preferences/adminFilters';

const mockPush = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

describe('DashboardCardStatusLink', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    window.localStorage.clear();
  });

  it('opens the Cards mobile destination while preserving the truthful status handoff', () => {
    render(
      <DashboardCardStatusLink status="draft">
        Draft Cards
      </DashboardCardStatusLink>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Draft Cards' }));

    expect(readStoredStudioCardBankSharedFilterPreferences()).toMatchObject({
      search: '',
      statusFilter: 'draft',
    });
    expect(mockPush).toHaveBeenCalledWith('/admin/studio?destination=cards');
  });
});
