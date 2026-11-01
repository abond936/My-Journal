import {
  createAudienceGroup,
  deleteAudienceGroup,
  updateAudienceGroup,
  validateAudienceSelectionReferences,
} from '@/lib/services/audienceGroupService';

jest.mock('@/lib/config/firebase/admin', () => ({
  getAdminApp: jest.fn(() => ({ firestore: jest.fn() })),
}));

function existingDoc(id: string, data: Record<string, unknown>) {
  return { id, exists: true, data: () => data };
}

describe('audience group service', () => {
  it('creates a uniquely named group with normalized existing Reader members', async () => {
    const create = jest.fn();
    const groupRef = { id: 'group-1', create };
    const groupsCollection = {
      get: jest.fn().mockResolvedValue({ docs: [] }),
      doc: jest.fn(() => groupRef),
    };
    const usersCollection = { doc: jest.fn((id: string) => ({ id })) };
    const firestore = {
      collection: jest.fn((name: string) =>
        name === 'audience_groups' ? groupsCollection : usersCollection
      ),
      getAll: jest.fn().mockResolvedValue([
        existingDoc('reader-1', { role: 'viewer' }),
        existingDoc('reader-2', { role: 'viewer' }),
      ]),
    };

    const group = await createAudienceGroup(
      { name: ' Family ', memberContactIds: ['reader-2', 'reader-1', 'reader-1'] },
      firestore as never,
      10
    );

    expect(group).toMatchObject({
      docId: 'group-1',
      name: 'Family',
      memberContactIds: ['reader-1', 'reader-2'],
      createdAt: 10,
      updatedAt: 10,
    });
    expect(create).toHaveBeenCalledWith(expect.not.objectContaining({ docId: expect.anything() }));
  });

  it('rejects duplicate names without case sensitivity', async () => {
    const groupsCollection = {
      get: jest.fn().mockResolvedValue({ docs: [existingDoc('group-1', { name: 'Family' })] }),
      doc: jest.fn(() => ({ id: 'group-2', create: jest.fn() })),
    };
    const firestore = {
      collection: jest.fn((name: string) =>
        name === 'audience_groups' ? groupsCollection : { doc: jest.fn((id: string) => ({ id })) }
      ),
      getAll: jest.fn().mockResolvedValue([existingDoc('admin-1', { role: 'admin' })]),
    };

    await expect(
      createAudienceGroup(
        { name: 'family', memberContactIds: [] },
        firestore as never
      )
    ).rejects.toThrow('already exists');
  });

  it('rejects group members who are not Reader accounts', async () => {
    const firestore = {
      collection: jest.fn((name: string) =>
        name === 'audience_groups'
          ? { get: jest.fn().mockResolvedValue({ docs: [] }), doc: jest.fn(() => ({ id: 'group-2' })) }
          : { doc: jest.fn((id: string) => ({ id })) }
      ),
      getAll: jest.fn().mockResolvedValue([existingDoc('admin-1', { role: 'admin' })]),
    };

    await expect(
      createAudienceGroup(
        { name: 'Friends', memberContactIds: ['admin-1'] },
        firestore as never
      )
    ).rejects.toThrow('existing Reader account');
  });

  it('updates membership without changing group identity or creation time', async () => {
    const update = jest.fn();
    const ref = {
      get: jest.fn().mockResolvedValue(
        existingDoc('group-1', {
          name: 'Family',
          memberContactIds: [],
          createdAt: 1,
          updatedAt: 1,
        })
      ),
      update,
    };
    const groupsCollection = {
      doc: jest.fn(() => ref),
      get: jest.fn().mockResolvedValue({ docs: [] }),
    };
    const firestore = {
      collection: jest.fn((name: string) =>
        name === 'audience_groups' ? groupsCollection : { doc: jest.fn((id: string) => ({ id })) }
      ),
      getAll: jest.fn().mockResolvedValue([existingDoc('reader-1', { role: 'viewer' })]),
    };

    const updated = await updateAudienceGroup(
      'group-1',
      { name: 'Close family', memberContactIds: ['reader-1'] },
      firestore as never,
      20
    );

    expect(updated).toMatchObject({ docId: 'group-1', createdAt: 1, updatedAt: 20 });
    expect(update).toHaveBeenCalledWith({
      name: 'Close family',
      memberContactIds: ['reader-1'],
      updatedAt: 20,
    });
  });

  it('refuses to delete a group still referenced by a Card or Collection', async () => {
    const ref = { get: jest.fn().mockResolvedValue({ exists: true }), delete: jest.fn() };
    const referenceQuery = {
      where: jest.fn(() => ({
        limit: jest.fn(() => ({ get: jest.fn().mockResolvedValue({ empty: false }) })),
      })),
    };
    const firestore = {
      collection: jest.fn((name: string) =>
        name === 'audience_groups' ? { doc: jest.fn(() => ref) } : referenceQuery
      ),
    };

    await expect(deleteAudienceGroup('group-1', firestore as never)).rejects.toThrow(
      'Remove this group from every Card, Collection, and Shared Media Collection audience'
    );
    expect(ref.delete).not.toHaveBeenCalled();
  });

  it('rejects audience selections with missing group references', async () => {
    const firestore = {
      collection: jest.fn((name: string) => ({ doc: jest.fn((id: string) => ({ id, name })) })),
      getAll: jest.fn().mockResolvedValue([{ id: 'missing', exists: false }]),
    };

    await expect(validateAudienceSelectionReferences(
      { allContacts: false, groupIds: ['missing'], contactIds: [] },
      firestore as never
    )).rejects.toThrow('must still exist');
  });
});
