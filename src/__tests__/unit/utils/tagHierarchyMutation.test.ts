import type { Tag } from '@/lib/types/tag';
import { buildMutatedTagCatalog } from '@/lib/utils/tagHierarchyMutation';

const tags: Tag[] = [
  { docId: 'who', name: 'Who', dimension: 'who', path: [] },
  { docId: 'family', name: 'Family', dimension: 'who', parentId: 'who', path: ['who'] },
  { docId: 'friends', name: 'Friends', dimension: 'who', parentId: 'who', path: ['who'] },
  { docId: 'alan', name: 'Alan', dimension: 'who', parentId: 'family', path: ['who', 'family'] },
  { docId: 'alan-old', name: 'A. Bond', dimension: 'who', parentId: 'alan', path: ['who', 'family', 'alan'] },
  { docId: 'what', name: 'What', dimension: 'what', path: [] },
] as Tag[];

describe('buildMutatedTagCatalog', () => {
  it('renames a tag without changing identity, parent, or paths', () => {
    const result = buildMutatedTagCatalog(tags, { kind: 'rename', tagId: 'alan', name: 'Alan Bond' });
    expect(result.find((tag) => tag.docId === 'alan')).toMatchObject({
      name: 'Alan Bond',
      parentId: 'family',
      path: ['who', 'family'],
    });
    expect(result.find((tag) => tag.docId === 'alan-old')?.path).toEqual(['who', 'family', 'alan']);
  });

  it('reparents a subtree and rebuilds descendant paths', () => {
    const result = buildMutatedTagCatalog(tags, { kind: 'reparent', tagId: 'alan', newParentId: 'friends' });
    expect(result.find((tag) => tag.docId === 'alan')).toMatchObject({
      parentId: 'friends',
      path: ['who', 'friends'],
    });
    expect(result.find((tag) => tag.docId === 'alan-old')?.path).toEqual(['who', 'friends', 'alan']);
  });

  it('blocks cycles and cross-dimension moves', () => {
    expect(() => buildMutatedTagCatalog(tags, {
      kind: 'reparent', tagId: 'family', newParentId: 'alan-old',
    })).toThrow(/cycle/i);
    expect(() => buildMutatedTagCatalog(tags, {
      kind: 'reparent', tagId: 'alan', newParentId: 'what',
    })).toThrow(/different dimension/i);
  });

  it('blocks duplicate sibling names', () => {
    expect(() => buildMutatedTagCatalog(tags, {
      kind: 'rename', tagId: 'friends', name: 'Family',
    })).toThrow(/already exists/i);
  });

  it('removes only the selected tag and promotes its children', () => {
    const result = buildMutatedTagCatalog(tags, {
      kind: 'remove', tagId: 'alan', promoteChildren: true,
    });
    expect(result.some((tag) => tag.docId === 'alan')).toBe(false);
    expect(result.find((tag) => tag.docId === 'alan-old')).toMatchObject({
      parentId: 'family',
      path: ['who', 'family'],
    });
  });

  it('merges into a same-dimension target and moves children beneath it', () => {
    const result = buildMutatedTagCatalog(tags, {
      kind: 'merge', tagId: 'alan', targetTagId: 'friends',
    });
    expect(result.some((tag) => tag.docId === 'alan')).toBe(false);
    expect(result.find((tag) => tag.docId === 'alan-old')).toMatchObject({
      parentId: 'friends', path: ['who', 'friends'],
    });
  });

  it('blocks invalid merge targets', () => {
    expect(() => buildMutatedTagCatalog(tags, {
      kind: 'merge', tagId: 'alan', targetTagId: 'alan-old',
    })).toThrow(/descendant/i);
    expect(() => buildMutatedTagCatalog(tags, {
      kind: 'merge', tagId: 'alan', targetTagId: 'what',
    })).toThrow(/across dimensions/i);
  });

  it('plans an approved cleanup as one hierarchy mutation', () => {
    const result = buildMutatedTagCatalog(tags, {
      kind: 'cleanup',
      tagId: 'cleanup-test',
      reparentByTagId: { alan: 'friends' },
      removeTagIds: ['family'],
    });
    expect(result.some((tag) => tag.docId === 'family')).toBe(false);
    expect(result.find((tag) => tag.docId === 'alan')).toMatchObject({
      parentId: 'friends', path: ['who', 'friends'],
    });
  });
});
