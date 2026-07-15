import {
  buildApprovedIdentityMigrationPlan,
  sameMigrationIdentity,
} from '@/lib/utils/archiveIdentityMigration';
import type { Person } from '@/lib/types/archiveIdentity';
import type { Tag } from '@/lib/types/tag';

const tags: Tag[] = [
  { docId: 'sandra', name: 'Sandra', dimension: 'who' },
  { docId: 'sandra-bond', name: 'Sandra Bond', dimension: 'who', parentId: 'sandra' },
  { docId: 'sandra-davis', name: 'Sandra Davis', dimension: 'who', parentId: 'sandra' },
  { docId: 'nell', name: 'Nell', dimension: 'who' },
  { docId: 'nell-bond', name: 'Nell Bond', dimension: 'who', parentId: 'nell' },
  { docId: 'nell-hammond', name: 'Nell Hammond', dimension: 'who', parentId: 'nell' },
];
const approved = {
  Sandra: ['Sandra Bond', 'Sandra Davis'],
  Nell: ['Nell Bond', 'Nell Hammond'],
};

describe('approved identity migration planning', () => {
  it('proposes only exact approved clusters', () => {
    const plan = buildApprovedIdentityMigrationPlan({ tags, people: [], approvedClusters: approved });
    expect(plan.conflicts).toEqual([]);
    expect(plan.proposed).toHaveLength(2);
    expect(plan.proposed[0]).toMatchObject({
      docId: 'sandra',
      canonicalName: 'Sandra',
      linkedWhoTagId: 'sandra',
      legacyWhoTagIds: ['sandra-bond', 'sandra-davis'],
    });
  });

  it('treats an exact prior record as already applied', () => {
    const first = buildApprovedIdentityMigrationPlan({ tags, people: [], approvedClusters: approved });
    const plan = buildApprovedIdentityMigrationPlan({
      tags,
      people: [first.proposed[0]],
      approvedClusters: approved,
    });
    expect(plan.existing).toHaveLength(1);
    expect(plan.proposed).toHaveLength(1);
    expect(plan.conflicts).toEqual([]);
  });

  it('blocks conflicting or incomplete tag state', () => {
    const conflicting: Person = {
      docId: 'other', kind: 'human', canonicalName: 'Sandra', aliases: [],
      linkedWhoTagId: 'sandra', legacyWhoTagIds: [], status: 'active',
    };
    const plan = buildApprovedIdentityMigrationPlan({
      tags: tags.filter((tag) => tag.docId !== 'nell-hammond'),
      people: [conflicting],
      approvedClusters: approved,
    });
    expect(plan.conflicts).toEqual(expect.arrayContaining([
      expect.stringContaining('Sandra: existing identity data conflicts'),
      expect.stringContaining('Nell: expected one child Who tag'),
    ]));
  });

  it('requires an exact unchanged record for rollback', () => {
    const expected = buildApprovedIdentityMigrationPlan({ tags, people: [], approvedClusters: approved }).proposed[0];
    expect(sameMigrationIdentity(expected, expected)).toBe(true);
    expect(sameMigrationIdentity({ ...expected, aliases: [...expected.aliases, { name: 'Sandy' }] }, expected)).toBe(false);
  });
});

