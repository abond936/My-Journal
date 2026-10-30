import type { Card } from '@/lib/types/card';
import { transitionCollectionAuthority } from '@/lib/services/collections/collectionAuthorityService';
import {
  fingerprintCollectionMigrationPreview,
  fingerprintLegacyCollectionSource,
} from '@/lib/utils/collectionMigrationFingerprint';
import { buildCollectionMigrationPreview } from '@/lib/utils/collectionPlacementMigration';

function fixture() {
  const cards = [
    { docId: 'welcome', title: 'WELCOME', status: 'draft', isCollectionRoot: true, childrenIds: ['chapter'] },
    { docId: 'chapter', title: 'Childhood', status: 'published' },
  ] as Card[];
  const preview = buildCollectionMigrationPreview({
    cards,
    sourceRootId: 'welcome',
    collectionId: 'my-life',
    collectionTitle: 'My Life',
    now: 0,
  });
  const records = {
    collections: new Map([['my-life', {
      ...preview.collection,
      recordState: 'shadow',
      structureRevision: 0,
      authorityRevision: 0,
      legacySourceRootId: 'welcome',
      migrationSourceFingerprint: fingerprintLegacyCollectionSource(cards),
      migrationTargetFingerprint: fingerprintCollectionMigrationPreview(preview),
    }]]),
    collection_placements: new Map(preview.placements.map(({ docId, sourcePathIds, ...placement }) => [docId, {
      ...placement,
      migrationSourcePathIds: sourcePathIds,
    }])),
    cards: new Map(cards.map(({ docId, ...card }) => [docId!, card])),
    collection_authority_operations: new Map<string, Record<string, unknown>>(),
  };
  const writes: string[] = [];
  const firestore = {
    collection(name: keyof typeof records) {
      return {
        doc(id: string) { return { kind: 'doc', collection: name, id }; },
        where(field: string, _operator: string, value: unknown) {
          return { kind: 'query', collection: name, field, value };
        },
        select() { return { kind: 'query', collection: name }; },
      };
    },
    runTransaction: async (run: (transaction: Record<string, (...args: never[]) => unknown>) => unknown) => run({
      get: async (target: { kind: string; collection: keyof typeof records; id?: string; field?: string; value?: unknown }) => {
        if (target.kind === 'doc') {
          const data = records[target.collection].get(target.id!);
          return { id: target.id, exists: Boolean(data), data: () => data };
        }
        const docs = Array.from(records[target.collection].entries())
          .filter(([, data]) => !target.field || (data as Record<string, unknown>)[target.field] === target.value)
          .map(([id, data]) => ({ id, data: () => data }));
        return { docs };
      },
      update: (target: { collection: keyof typeof records; id: string }, patch: Record<string, unknown>) => {
        const current = records[target.collection].get(target.id) as Record<string, unknown>;
        records[target.collection].set(target.id, { ...current, ...patch } as never);
        writes.push(`update:${target.collection}:${target.id}`);
      },
      create: (target: { collection: keyof typeof records; id: string }, value: Record<string, unknown>) => {
        records[target.collection].set(target.id, value as never);
        writes.push(`create:${target.collection}:${target.id}`);
      },
    }),
  };
  return { firestore: firestore as never, records, writes };
}

describe('transitionCollectionAuthority', () => {
  it('commits the selector and its operation through one transaction owner', async () => {
    const { firestore, records, writes } = fixture();
    const result = await transitionCollectionAuthority({
      collectionId: 'my-life',
      desiredState: 'active',
      expectedStructureRevision: 0,
      expectedAuthorityRevision: 0,
      now: 100,
      firestore,
    });
    expect(result.nextAuthorityRevision).toBe(1);
    expect(records.collections.get('my-life')).toMatchObject({
      recordState: 'active',
      authorityRevision: 1,
      authorityEstablishedAt: 100,
    });
    expect(writes).toEqual([
      'update:collections:my-life',
      'create:collection_authority_operations:authority-my-life-1-active',
    ]);
  });
});
