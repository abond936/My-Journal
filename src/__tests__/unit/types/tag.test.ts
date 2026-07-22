import { tagSchema } from '@/lib/types/tag';

describe('tagSchema relationship fields', () => {
  it('accepts optional gender and assignability on a Who tag', () => {
    expect(tagSchema.parse({
      docId: 'margaret',
      name: 'Margaret',
      dimension: 'who',
      gender: 'female',
      assignable: true,
    })).toMatchObject({ gender: 'female', assignable: true });
  });

  it('preserves existing untyped tags', () => {
    expect(tagSchema.parse({ name: 'Charleston', dimension: 'where' })).toMatchObject({
      name: 'Charleston',
      dimension: 'where',
    });
  });

  it('rejects relationship gender outside Who', () => {
    expect(() => tagSchema.parse({ name: 'Childhood', dimension: 'what', gender: 'female' }))
      .toThrow('Relationship gender applies only to Who tags.');
  });
});
