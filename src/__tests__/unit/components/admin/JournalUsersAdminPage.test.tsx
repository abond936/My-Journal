import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import JournalUsersAdminPage from '@/app/admin/journal-users/page';

const showSuccess = jest.fn();
const showError = jest.fn();

jest.mock('@/components/providers/AppFeedbackProvider', () => ({
  useAppFeedback: () => ({ showSuccess, showError, confirm: jest.fn() }),
}));

function response(data: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => data,
  };
}

describe('JournalUsersAdminPage audience-group consequences', () => {
  it('requires a matching access review before saving changed membership', async () => {
    const users = [
      { docId: 'alex', username: 'alex', displayName: 'Alex', role: 'viewer', disabled: false },
      { docId: 'blair', username: 'blair', displayName: 'Blair', role: 'viewer', disabled: false },
    ];
    const originalGroup = {
      docId: 'family', name: 'Family', memberContactIds: ['alex'], createdAt: 1, updatedAt: 1,
    };
    const fetchMock = jest.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url === '/api/admin/journal-users') return response({ users });
      if (url === '/api/admin/audience-groups' && !init?.method) return response({ groups: [originalGroup] });
      if (url.endsWith('/impact')) return response({
        impact: {
          groupId: 'family', groupName: 'Family',
          addedMembers: [{ contactId: 'blair', displayName: 'Blair', enabled: true }],
          removedMembers: [{ contactId: 'alex', displayName: 'Alex', enabled: true }],
          referencedCardAudiences: 1, referencedCollectionAudiences: 1,
          collections: [{
            id: 'book', title: 'Family Book',
            gainingReaders: [{ contactId: 'blair', displayName: 'Blair' }],
            losingReaders: [{ contactId: 'alex', displayName: 'Alex' }],
          }],
          cards: [{
            id: 'story', title: 'Birthday Story',
            gainingReaders: [{ contactId: 'blair', displayName: 'Blair' }],
            losingReaders: [{ contactId: 'alex', displayName: 'Alex' }],
          }],
        },
      });
      if (url.endsWith('/family') && init?.method === 'PATCH') return response({
        group: { ...originalGroup, memberContactIds: ['blair'], updatedAt: 2 },
      });
      throw new Error(`Unexpected fetch: ${url} ${init?.method ?? 'GET'}`);
    });
    global.fetch = fetchMock as typeof fetch;
    render(<JournalUsersAdminPage />);

    const members = await screen.findByLabelText('Family members');
    const checkboxes = members.querySelectorAll('input[type="checkbox"]');
    fireEvent.click(checkboxes[0]);
    fireEvent.click(checkboxes[1]);
    fireEvent.click(screen.getByRole('button', { name: 'Review access change' }));

    expect(await screen.findByText('Review this access change before saving')).toBeInTheDocument();
    expect(screen.getByText(/Family Book: gains Blair; loses Alex/)).toBeInTheDocument();
    expect(fetchMock.mock.calls.filter(([, init]) => init?.method === 'PATCH')).toHaveLength(0);

    fireEvent.click(screen.getByRole('button', { name: 'Apply reviewed access change' }));
    await waitFor(() => expect(fetchMock.mock.calls.some(([input, init]) =>
      String(input).endsWith('/family') && init?.method === 'PATCH')).toBe(true));
  });

  it('reviews exact Reader access before disabling an account', async () => {
    const reader = {
      docId: 'alex', username: 'alex', displayName: 'Alex', role: 'viewer', disabled: false,
    };
    const fetchMock = jest.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url === '/api/admin/journal-users' && !init?.method) return response({ users: [reader] });
      if (url === '/api/admin/audience-groups') return response({ groups: [] });
      if (url.endsWith('/access-impact')) return response({ impact: {
        contactId: 'alex', displayName: 'Alex', currentDisabled: false, proposedDisabled: true,
        effect: 'lose',
        collections: [{ id: 'book', title: 'Family Book' }],
        cards: [{ id: 'story', title: 'Birthday Story' }],
      } });
      if (url.endsWith('/alex') && init?.method === 'PATCH') return response({ ok: true });
      throw new Error(`Unexpected fetch: ${url} ${init?.method ?? 'GET'}`);
    });
    global.fetch = fetchMock as typeof fetch;
    render(<JournalUsersAdminPage />);

    fireEvent.click(await screen.findByRole('button', { name: 'Review disable access' }));
    expect(await screen.findByText('Review Reader access before disable')).toBeInTheDocument();
    expect(screen.getByText(/lose access to 1 Collection and 1 published Card/)).toBeInTheDocument();
    expect(fetchMock.mock.calls.filter(([, init]) => init?.method === 'PATCH')).toHaveLength(0);

    fireEvent.click(screen.getByRole('button', { name: 'Apply reviewed disable' }));
    await waitFor(() => expect(fetchMock.mock.calls.some(([input, init]) =>
      String(input).endsWith('/alex') && init?.method === 'PATCH')).toBe(true));
  });
});
