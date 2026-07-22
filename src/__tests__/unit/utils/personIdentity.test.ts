import { resolvePersonIdentity } from '@/lib/utils/personIdentity';

describe('resolvePersonIdentity', () => {
  it('uses any selected Who tag as canonical identity without a legacy record', () => {
    expect(resolvePersonIdentity({
      docId: 'dora',
      name: 'Dora',
      dimension: 'who',
    })).toMatchObject({
      personTagId: 'dora',
      canonicalName: 'Dora',
      kind: 'human',
      assignable: true,
      source: 'tag',
    });
  });

  it('uses legacy profile data only as compatibility for a linked Who tag', () => {
    const resolved = resolvePersonIdentity(
      { docId: 'margaret', name: 'Margaret', dimension: 'who' },
      [{
        docId: 'margaret',
        canonicalName: 'Old duplicate name',
        kind: 'human',
        linkedWhoTagId: 'margaret',
        aliases: [],
        legacyWhoTagIds: [],
        status: 'active',
      }]
    );
    expect(resolved).toMatchObject({
      personTagId: 'margaret',
      canonicalName: 'Margaret',
      source: 'tag',
    });
  });

  it('does not require a visible Person classification', () => {
    expect(resolvePersonIdentity({ docId: 'dora', name: 'Dora', dimension: 'who' }))
      .toMatchObject({ personTagId: 'dora', canonicalName: 'Dora', source: 'tag' });
  });

  it('fails closed when compatibility records conflict', () => {
    expect(() => resolvePersonIdentity(
      { docId: 'dora', name: 'Dora', dimension: 'who' },
      [
        { docId: 'one', canonicalName: 'Dora One', linkedWhoTagId: 'dora', aliases: [], legacyWhoTagIds: [], status: 'active' },
        { docId: 'two', canonicalName: 'Dora Two', linkedWhoTagId: 'dora', aliases: [], legacyWhoTagIds: [], status: 'active' },
      ]
    )).toThrow('compatibility records conflict');
  });
});
