import bcrypt from 'bcryptjs';
import { convertGuestRecipientToAccount } from '@/lib/auth/journalUsersFirestore';

jest.mock('bcryptjs', () => ({
  __esModule: true,
  default: { hash: jest.fn().mockResolvedValue('hashed-password') },
}));

type Row = Record<string, unknown>;

function fakeFirestore(seed: Record<string, Record<string, Row>>) {
  const data = new Map(Object.entries(seed).map(([name, rows]) => [name, new Map(Object.entries(rows))]));
  const rows = (name: string) => {
    if (!data.has(name)) data.set(name, new Map());
    return data.get(name)!;
  };
  const snapshot = (ref: { collection: string; id: string }) => {
    const row = rows(ref.collection).get(ref.id);
    return { id: ref.id, ref, exists: Boolean(row), data: () => row };
  };
  const firestore = {
    collection(name: string) {
      return {
        doc(id: string) {
          const ref = { collection: name, id };
          return { ...ref, get: async () => snapshot(ref) };
        },
        where(field: string, _operator: string, value: unknown) {
          return { kind: 'query', collection: name, field, value };
        },
      };
    },
    async runTransaction<T>(work: (transaction: unknown) => Promise<T>) {
      const transaction = {
        async get(target: { kind?: string; collection: string; id?: string; field?: string; value?: unknown }) {
          if (target.kind === 'query') {
            const docs = [...rows(target.collection).entries()]
              .filter(([, row]) => row[target.field!] === target.value)
              .map(([id]) => snapshot({ collection: target.collection, id }));
            return { docs };
          }
          return snapshot({ collection: target.collection, id: target.id! });
        },
        update(ref: { collection: string; id: string }, value: Row) {
          rows(ref.collection).set(ref.id, { ...rows(ref.collection).get(ref.id), ...value });
        },
      };
      return work(transaction);
    },
  };
  return { firestore: firestore as never, data };
}

describe('convertGuestRecipientToAccount', () => {
  it('preserves the stable recipient and revokes an unused invitation', async () => {
    const store = fakeFirestore({
      journal_users: {
        guest: {
          username: 'guest@example.com', displayName: 'Guest', role: 'viewer', accessKind: 'guest',
          disabled: false, createdAt: 1, updatedAt: 1,
        },
      },
      recipient_invites: {
        used: { recipientId: 'guest', redeemedAt: 10, revokedAt: null },
        open: { recipientId: 'guest', redeemedAt: null, revokedAt: null },
      },
    });

    const account = await convertGuestRecipientToAccount('guest', 'new-password', store.firestore, 20);

    expect(bcrypt.hash).toHaveBeenCalledWith('new-password', 12);
    expect(account).toMatchObject({ docId: 'guest', username: 'guest@example.com', accessKind: 'account' });
    expect(store.data.get('journal_users')?.get('guest')).toMatchObject({
      accessKind: 'account', passwordHash: 'hashed-password', updatedAt: 20,
    });
    expect(store.data.get('recipient_invites')?.get('open')?.revokedAt).toBe(20);
    expect(store.data.get('recipient_invites')?.get('used')?.revokedAt).toBeNull();
  });

  it('does not convert an existing password account', async () => {
    const store = fakeFirestore({
      journal_users: {
        reader: {
          username: 'reader', displayName: 'Reader', role: 'viewer', accessKind: 'account',
          disabled: false, createdAt: 1, updatedAt: 1,
        },
      },
    });
    await expect(
      convertGuestRecipientToAccount('reader', 'new-password', store.firestore, 20)
    ).rejects.toThrow('not eligible');
    expect(store.data.get('journal_users')?.get('reader')?.accessKind).toBe('account');
  });
});
