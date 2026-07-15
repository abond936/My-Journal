import type { PersonRelationship } from '@/lib/types/archiveIdentity';
import {
  assertRelationshipCanBeAdded,
  normalizeRelationshipEndpoints,
  resolvePerspectiveRoles,
} from '@/lib/utils/personRelationships';

const relationship = (value: Partial<PersonRelationship> & Pick<PersonRelationship, 'fromPersonId' | 'toPersonId' | 'type'>): PersonRelationship => ({
  ...value,
});

describe('person relationships', () => {
  it('normalizes symmetric relationship endpoints', () => {
    expect(
      normalizeRelationshipEndpoints(relationship({ fromPersonId: 'z', toPersonId: 'a', type: 'spouse' }))
    ).toMatchObject({ fromPersonId: 'a', toPersonId: 'z' });
  });

  it('rejects duplicate relationships and ancestry cycles', () => {
    const existing = [relationship({ docId: 'r1', fromPersonId: 'bob', toPersonId: 'alan', type: 'parent' })];
    expect(() =>
      assertRelationshipCanBeAdded(existing, relationship({ fromPersonId: 'bob', toPersonId: 'alan', type: 'parent' }))
    ).toThrow('already exists');
    expect(() =>
      assertRelationshipCanBeAdded(existing, relationship({ fromPersonId: 'alan', toPersonId: 'bob', type: 'parent' }))
    ).toThrow('ancestry cycle');
  });

  it('resolves roles from the selected person perspective', () => {
    const roles = resolvePerspectiveRoles(
      [
        relationship({ fromPersonId: 'nell', toPersonId: 'bob', type: 'parent' }),
        relationship({ fromPersonId: 'bob', toPersonId: 'alan', type: 'parent' }),
        relationship({ fromPersonId: 'bob', toPersonId: 'jane', type: 'parent' }),
        relationship({ fromPersonId: 'alan', toPersonId: 'sam', type: 'parent' }),
        relationship({ fromPersonId: 'alan', toPersonId: 'pat', type: 'spouse' }),
      ],
      'alan'
    );
    expect([...roles.get('bob')!]).toContain('parent');
    expect([...roles.get('nell')!]).toContain('grandparent');
    expect([...roles.get('jane')!]).toContain('sibling');
    expect([...roles.get('sam')!]).toContain('child');
    expect([...roles.get('pat')!]).toContain('spouse');
  });
});

