jest.mock('@/lib/firebase/tagService', () => ({
  getTagAncestors: jest.fn(async (tagIds: string[]) => {
    if (tagIds[0] === 'siblings') return ['family'];
    if (tagIds[0] === 'alan') return ['siblings', 'family'];
    return [];
  }),
}));

import { resolveSubjectTagState } from '@/lib/utils/subjectTag';

describe('subjectTag contract', () => {
  it('accepts an explicit assigned subject and derives ancestor filter tags', async () => {
    const result = await resolveSubjectTagState({
      assignedTagIds: ['alan', 'siblings'],
      requestedSubjectTagId: 'siblings',
      existingSubjectTagId: null,
      subjectTagIdProvided: true,
    });

    expect(result.subjectTagId).toBe('siblings');
    expect(result.subjectFilterTags).toEqual({ siblings: true, family: true });
  });

  it('clears the subject automatically when the existing subject is no longer assigned', async () => {
    const result = await resolveSubjectTagState({
      assignedTagIds: ['alan'],
      existingSubjectTagId: 'siblings',
      subjectTagIdProvided: false,
    });

    expect(result.subjectTagId).toBeNull();
    expect(result.subjectFilterTags).toEqual({});
  });

  it('rejects an explicit subject tag that is not assigned', async () => {
    await expect(
      resolveSubjectTagState({
        assignedTagIds: ['alan'],
        requestedSubjectTagId: 'siblings',
        existingSubjectTagId: null,
        subjectTagIdProvided: true,
      })
    ).rejects.toThrow("Subject tag must be one of the item's assigned tags.");
  });
});
