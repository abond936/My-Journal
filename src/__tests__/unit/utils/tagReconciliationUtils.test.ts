import type { Tag } from '@/lib/types/tag';
import {
  isDimensionLabelTagName,
  isValidMapTargetTag,
  suggestMapTargetTags,
  whenTagNameLooksAssignable,
} from '@/lib/utils/tagReconciliationUtils';

function tag(overrides: Partial<Tag> & { docId: string; name: string }): Tag {
  return {
    parentId: null,
    order: 0,
    dimension: 'when',
    ...overrides,
  } as Tag;
}

describe('tagReconciliationUtils', () => {
  it('rejects dimension label names as assignable When tags', () => {
    expect(whenTagNameLooksAssignable('When')).toBe(false);
    expect(whenTagNameLooksAssignable('2024')).toBe(true);
  });

  it('does not suggest dimension labels or non-leaf author tags', () => {
    const tagById = new Map<string, Tag>([
      ['when-root', tag({ docId: 'when-root', name: 'When', dimension: 'when' })],
      ['when-2024', tag({ docId: 'when-2024', name: '2024', dimension: 'when', parentId: 'when-root' })],
      [
        'when-root-child',
        tag({ docId: 'when-root-child', name: 'Months', dimension: 'when', parentId: 'when-root' }),
      ],
      ['import-when', tag({ docId: 'import-when', name: 'When', dimension: 'when', parentId: 'zna' })],
    ]);

    expect(isDimensionLabelTagName('When')).toBe(true);
    expect(isValidMapTargetTag(tagById.get('when-2024')!, tagById)).toBe(true);
    expect(isValidMapTargetTag(tagById.get('when-root')!, tagById)).toBe(false);
    expect(isValidMapTargetTag(tagById.get('when-root-child')!, tagById)).toBe(false);

    const source = tag({ docId: 'import-2024', name: '2024', dimension: 'when' });
    const authorTags = [tagById.get('when-root')!, tagById.get('when-2024')!, tagById.get('when-root-child')!];
    const suggestions = suggestMapTargetTags(source, authorTags, tagById);
    expect(suggestions.map((entry) => entry.tag.docId)).toEqual(['when-2024']);
  });
});
