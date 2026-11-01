import {
  createGuestRecipientInvite,
  hashRecipientInviteToken,
  redeemGuestRecipientInvite,
  reissueGuestRecipientInvite,
} from '@/lib/auth/recipientInvites';

type Row = Record<string, unknown>;

function fakeFirestore(seed: Record<string, Record<string, Row>> = {}) {
  const data = new Map<string, Map<string, Row>>();
  Object.entries(seed).forEach(([collection, rows]) => data.set(collection, new Map(Object.entries(rows))));
  let generated = 0;
  const rows = (collection: string) => {
    if (!data.has(collection)) data.set(collection, new Map());
    return data.get(collection)!;
  };
  const docRef = (collection: string, id: string) => ({ kind: 'doc', collection, id });
  const snapshot = (ref: ReturnType<typeof docRef>) => {
    const row = rows(ref.collection).get(ref.id);
    return { id: ref.id, ref, exists: Boolean(row), data: () => row };
  };
  const firestore = {
    collection(collection: string) {
      return {
        doc(id?: string) { return docRef(collection, id ?? `generated-${++generated}`); },
        where(field: string, _operator: string, value: unknown) {
          const query = { kind: 'query', collection, field, value, limit: () => query };
          return query;
        },
      };
    },
    async runTransaction<T>(work: (transaction: unknown) => Promise<T>) {
      const transaction = {
        async get(target: { kind: string; collection: string; id?: string; field?: string; value?: unknown }) {
          if (target.kind === 'doc') return snapshot(docRef(target.collection, target.id!));
          const docs = [...rows(target.collection).entries()]
            .filter(([, row]) => row[target.field!] === target.value)
            .map(([id]) => snapshot(docRef(target.collection, id)));
          return { docs, empty: docs.length === 0 };
        },
        create(ref: ReturnType<typeof docRef>, value: Row) { rows(ref.collection).set(ref.id, value); },
        update(ref: ReturnType<typeof docRef>, value: Row) {
          rows(ref.collection).set(ref.id, { ...rows(ref.collection).get(ref.id), ...value });
        },
      };
      return work(transaction);
    },
  };
  return { firestore: firestore as never, data };
}

describe('recipient invitations', () => {
  it('creates one guest principal and stores only a hash of the expiring token', async () => {
    const store = fakeFirestore();
    const result = await createGuestRecipientInvite(
      { email: ' Guest@Example.com ', displayName: 'Guest Reader' },
      store.firestore,
      1000
    );

    expect(store.data.get('journal_users')?.get(result.recipientId)).toMatchObject({
      username: 'guest@example.com', displayName: 'Guest Reader', role: 'viewer', accessKind: 'guest', disabled: false,
    });
    expect(store.data.get('recipient_invites')?.get(hashRecipientInviteToken(result.inviteToken))).toMatchObject({
      recipientId: result.recipientId, createdAt: 1000, expiresAt: 604801000, redeemedAt: null, revokedAt: null,
    });
    expect(JSON.stringify([...store.data.values()].map((rows) => [...rows.values()]))).not.toContain(result.inviteToken);
  });

  it('redeems a valid token once and rejects reuse', async () => {
    const token = 'one-time-token';
    const store = fakeFirestore({
      journal_users: { guest: { username: 'guest@example.com', displayName: 'Guest', role: 'viewer', accessKind: 'guest', disabled: false } },
      recipient_invites: { [hashRecipientInviteToken(token)]: { recipientId: 'guest', createdAt: 1, expiresAt: 5000, redeemedAt: null, revokedAt: null } },
    });

    await expect(redeemGuestRecipientInvite(token, store.firestore, 2000)).resolves.toEqual({
      id: 'guest', name: 'Guest', email: 'guest@example.com', role: 'viewer',
    });
    await expect(redeemGuestRecipientInvite(token, store.firestore, 2001)).resolves.toBeNull();
  });

  it('rejects expired links and disabled guests', async () => {
    const token = 'expired';
    const hash = hashRecipientInviteToken(token);
    const expired = fakeFirestore({
      journal_users: { guest: { username: 'guest@example.com', displayName: 'Guest', role: 'viewer', accessKind: 'guest', disabled: false } },
      recipient_invites: { [hash]: { recipientId: 'guest', createdAt: 1, expiresAt: 100, redeemedAt: null, revokedAt: null } },
    });
    await expect(redeemGuestRecipientInvite(token, expired.firestore, 100)).resolves.toBeNull();

    const disabled = fakeFirestore({
      journal_users: { guest: { username: 'guest@example.com', displayName: 'Guest', role: 'viewer', accessKind: 'guest', disabled: true } },
      recipient_invites: { [hash]: { recipientId: 'guest', createdAt: 1, expiresAt: 5000, redeemedAt: null, revokedAt: null } },
    });
    await expect(redeemGuestRecipientInvite(token, disabled.firestore, 100)).resolves.toBeNull();
  });

  it('revokes an older open link when a replacement is issued', async () => {
    const oldToken = 'old';
    const oldHash = hashRecipientInviteToken(oldToken);
    const store = fakeFirestore({
      journal_users: { guest: { username: 'guest@example.com', displayName: 'Guest', role: 'viewer', accessKind: 'guest', disabled: false } },
      recipient_invites: { [oldHash]: { recipientId: 'guest', createdAt: 1, expiresAt: 5000, redeemedAt: null, revokedAt: null } },
    });
    await reissueGuestRecipientInvite('guest', store.firestore, 100);
    expect(store.data.get('recipient_invites')?.get(oldHash)?.revokedAt).toBe(100);
  });
});
