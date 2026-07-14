import { TAG_SET_0_GENERIC_SEED } from '@/data/tagSets/tagSet0GenericSeed';
import type { Tag } from '@/lib/types/tag';
import { isTagTreeSlotTaken, previewTagSet0Install } from '@/lib/utils/tagSet0Install';

describe('tagSet0Install', () => {
  it('detects occupied root slots by dimension and name', () => {
    const allTags: Tag[] = [{ docId: 'who-parents', name: 'Parents', dimension: 'who' }];
    expect(
      isTagTreeSlotTaken(allTags, { name: 'Parents', dimension: 'who' })
    ).toBe(true);
    expect(
      isTagTreeSlotTaken(allTags, { name: 'Parents', dimension: 'what' })
    ).toBe(false);
    expect(
      isTagTreeSlotTaken(allTags, { name: 'Siblings', dimension: 'who' })
    ).toBe(false);
  });

  it('skips conflicting branches without planning replacements', () => {
    const allTags: Tag[] = [{ docId: 'what-general', name: 'General', dimension: 'what' }];
    const preview = previewTagSet0Install(TAG_SET_0_GENERIC_SEED, allTags);
    expect(preview.skippedCount).toBeGreaterThan(0);
    expect(preview.createCount).toBeGreaterThan(0);
    expect(preview.createCount + preview.skippedCount).toBeGreaterThan(
      TAG_SET_0_GENERIC_SEED.length
    );
  });

  it('plans a full install on an empty library', () => {
    const preview = previewTagSet0Install(TAG_SET_0_GENERIC_SEED, []);
    expect(preview.skippedCount).toBe(0);
    expect(preview.createCount).toBeGreaterThan(60);
  });
});
