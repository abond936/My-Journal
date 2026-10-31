import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import AudienceSelector from '@/components/admin/audience/AudienceSelector';

const users = [
  { docId: 'reader-1', username: 'one', role: 'viewer', displayName: 'Alex', disabled: false, createdAt: 1, updatedAt: 1 },
  { docId: 'reader-2', username: 'two', role: 'viewer', displayName: 'Blair', disabled: false, createdAt: 1, updatedAt: 1 },
  { docId: 'reader-3', username: 'three', role: 'viewer', displayName: 'Casey', disabled: true, createdAt: 1, updatedAt: 1 },
  { docId: 'admin', username: 'admin', role: 'admin', displayName: 'Author', disabled: false, createdAt: 1, updatedAt: 1 },
];
const groups = [
  { docId: 'family', name: 'Family', memberContactIds: ['reader-1', 'reader-3'], createdAt: 1, updatedAt: 1 },
];

function response(data: unknown) {
  return { ok: true, json: async () => data } as Response;
}

describe('AudienceSelector', () => {
  beforeEach(() => {
    global.fetch = jest.fn(async (input: RequestInfo | URL) =>
      String(input).endsWith('/journal-users') ? response({ users }) : response({ groups })
    ) as typeof fetch;
  });

  it('makes the legacy all-readers default and its exact effect visible', async () => {
    render(
      <AudienceSelector
        scopeLabel="Standalone Story"
        consequence="Standalone consequence."
        onSave={jest.fn()}
      />
    );

    expect(await screen.findByText('Legacy default: all enabled readers')).toBeInTheDocument();
    expect(await screen.findByRole('status')).toHaveTextContent('Alex, Blair');
    expect(screen.queryByText(/Casey/)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save audience' })).toBeDisabled();
  });

  it('previews the enabled union of groups and individuals and saves the explicit selection', async () => {
    const onSave = jest.fn().mockResolvedValue(true);
    render(
      <AudienceSelector
        value={{ allContacts: true, groupIds: [], contactIds: [] }}
        scopeLabel="Collection"
        consequence="Collection consequence."
        onSave={onSave}
      />
    );

    fireEvent.click(await screen.findByLabelText('Selected groups and people'));
    fireEvent.click(await screen.findByLabelText('Family'));
    fireEvent.click(screen.getByLabelText('Blair'));

    expect(screen.getByRole('status')).toHaveTextContent('Alex, Blair');
    expect(screen.getByRole('status')).not.toHaveTextContent('Casey');
    fireEvent.click(screen.getByRole('button', { name: 'Save audience' }));

    await waitFor(() => expect(onSave).toHaveBeenCalledWith({
      allContacts: false,
      groupIds: ['family'],
      contactIds: ['reader-2'],
    }));
    expect(await screen.findByText(/Audience saved/)).toBeInTheDocument();
  });

  it('states plainly when an explicit audience grants no enabled reader access', async () => {
    render(
      <AudienceSelector
        value={{ allContacts: false, groupIds: [], contactIds: [] }}
        scopeLabel="Collection"
        consequence="Collection consequence."
        onSave={jest.fn()}
      />
    );
    expect(await screen.findByText('No enabled readers.')).toBeInTheDocument();
  });

  it('shows the combined Reader consequence supplied by other published routes', async () => {
    const getCombinedImpact = jest.fn().mockResolvedValue({
      basis: 'current_after_save',
      standaloneIncluded: true,
      effectiveReaders: [
        { contactId: 'reader-1', displayName: 'Alex' },
        { contactId: 'reader-2', displayName: 'Blair' },
      ],
      otherRoutes: [{
        collectionId: 'family-book',
        title: 'Family Book',
        readers: [{ contactId: 'reader-2', displayName: 'Blair' }],
      }],
    });
    render(
      <AudienceSelector
        value={{ allContacts: false, groupIds: [], contactIds: ['reader-1'] }}
        scopeLabel="Standalone Story"
        consequence="Standalone consequence."
        onSave={jest.fn()}
        getCombinedImpact={getCombinedImpact}
      />
    );

    const combinedLabel = await screen.findByText(/Combined access after Save:/);
    await waitFor(() => expect(combinedLabel.parentElement).toHaveTextContent(
      'Alex, Blair Routes included: standalone Feed, Family Book.'
    ));
    expect(getCombinedImpact).toHaveBeenCalledWith({
      allContacts: false,
      groupIds: [],
      contactIds: ['reader-1'],
    });
  });

  it('shows the placement-wide consequence of a proposed Collection audience', async () => {
    const getCollectionImpact = jest.fn().mockResolvedValue({
      basis: 'if_published_and_reader_valid',
      proposedRouteReaders: [{ contactId: 'reader-2', displayName: 'Blair' }],
      missingCardIds: [],
      cards: [{
        cardId: 'card-1',
        title: 'Beach Story',
        status: 'draft',
        effectiveReaders: [
          { contactId: 'reader-1', displayName: 'Alex' },
          { contactId: 'reader-2', displayName: 'Blair' },
        ],
        routes: [
          { kind: 'this_collection', collectionId: 'family-book', title: 'Family Book', readers: [] },
          { kind: 'standalone_feed', title: 'standalone Feed', readers: [] },
        ],
      }],
    });
    render(
      <AudienceSelector
        value={{ allContacts: false, groupIds: ['family'], contactIds: [] }}
        scopeLabel="Collection"
        consequence="Collection consequence."
        onSave={jest.fn()}
        getCollectionImpact={getCollectionImpact}
      />
    );

    expect(await screen.findByText(/If this Collection is published and reader-ready:/)).toBeInTheDocument();
    expect(screen.getByText(/Beach Story/).parentElement).toHaveTextContent(
      'Beach Story (Draft): Alex, Blair Routes: Family Book, standalone Feed.'
    );
  });
});
