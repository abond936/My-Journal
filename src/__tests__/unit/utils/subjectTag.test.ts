jest.mock('@/lib/firebase/tagService', () => ({
  getTagAncestors: jest.fn(async (tagIds: string[]) => {
    if (tagIds[0] === 'siblings') return ['family'];
    if (tagIds[0] === 'alan') return ['siblings', 'family'];
    return [];
  }),
}));

import { getDimensionSubjectPresentation } from '@/lib/utils/subjectPresentation';
import { resolveSubjectTagState } from '@/lib/utils/subjectTag';

describe('subjectTag contract', () => {
  it('distinguishes implicit, Multiple, and Subjects+ presentation', () => {
    expect(getDimensionSubjectPresentation(['chicago'], [])).toBe('implicit');
    expect(getDimensionSubjectPresentation(['chicago', 'evanston'], [])).toBe('multiple');
    expect(getDimensionSubjectPresentation(['chicago', 'evanston'], ['chicago'])).toBe('subjects');
  });
  it('accepts an explicit assigned subject and derives ancestor filter tags', async () => {
    const result = await resolveSubjectTagState({
      assignedTagIds: ['alan', 'siblings'],
      requestedSubjectTagId: 'siblings',
      existingSubjectTagId: null,
      subjectTagIdProvided: true,
    });

    expect(result.subjectTagId).toBe('siblings');
    expect(result.subjectTagIds).toEqual(['siblings']);
    expect(result.subjectFilterTags).toEqual({ siblings: true, family: true });
  });

  it('accepts multiple assigned subjects and derives the union of ancestor filters', async () => {
    const result = await resolveSubjectTagState({
      assignedTagIds: ['alan', 'siblings'],
      requestedSubjectTagIds: ['alan', 'siblings', 'alan'],
      subjectTagIdsProvided: true,
      subjectTagIdProvided: false,
    });

    expect(result.subjectTagId).toBe('alan');
    expect(result.subjectTagIds).toEqual(['alan', 'siblings']);
    expect(result.subjectFilterTags).toEqual({ alan: true, siblings: true, family: true });
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
