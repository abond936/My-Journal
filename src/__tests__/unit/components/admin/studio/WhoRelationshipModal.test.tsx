import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { WhoRelationshipModal } from '@/components/admin/studio/tags/WhoRelationshipModal';

jest.mock('@/components/admin/studio/cards/EditModal', () => ({
  __esModule: true,
  default: ({ children, title }: { children: React.ReactNode; title: string }) => <div><h2>{title}</h2>{children}</div>,
}));

describe('WhoRelationshipModal', () => {
  beforeEach(() => {
    global.fetch = jest.fn(async (_input: RequestInfo | URL, init?: RequestInit) => ({
      ok: true,
      json: async () => init?.method === 'POST'
        ? { docId: 'relationship-1' }
        : { relationships: [], archivePerspectivePersonId: 'alan' },
    })) as jest.Mock;
  });

  it('uses ordinary Who tags for optional relationship links', async () => {
    render(<WhoRelationshipModal
      tag={{ docId: 'dora', name: 'Dora', dimension: 'who' }}
      whoTags={[{ docId: 'dora', name: 'Dora', dimension: 'who' }, { docId: 'sandra', name: 'Sandra', dimension: 'who' }]}
      onClose={jest.fn()}
      onUpdateTag={jest.fn(async () => ({ docId: 'dora', name: 'Dora', dimension: 'who' }))}
    />);

    await screen.findByRole('button', { name: 'Set perspective' });
    await userEvent.selectOptions(screen.getByLabelText('Other Who tag'), 'sandra');
    await userEvent.click(screen.getByRole('button', { name: 'Add relationship' }));

    await waitFor(() => expect(global.fetch).toHaveBeenCalledWith('/api/admin/archive-identity', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ entity: 'relationship', data: { fromPersonId: 'dora', type: 'parent', toPersonId: 'sandra' } }),
    })));
  });
});
