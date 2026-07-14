import {
  isStoryPileDropId,
  parseStoryPileDropId,
  storyPileDropId,
  STORY_PILE_UNSORTED_DROP_ID,
} from '@/lib/dnd/studioPileDragContract';

describe('studioPileDragContract', () => {
  it('builds pile drop ids', () => {
    expect(storyPileDropId('cluster-1')).toBe('pile:cluster-1');
    expect(STORY_PILE_UNSORTED_DROP_ID).toBe('pile:unsorted');
  });

  it('detects pile drop ids', () => {
    expect(isStoryPileDropId('pile:cluster-1')).toBe(true);
    expect(isStoryPileDropId('pile:unsorted')).toBe(true);
    expect(isStoryPileDropId('drop:cover')).toBe(false);
  });

  it('parses pile drop ids', () => {
    expect(parseStoryPileDropId('pile:unsorted')).toBe(null);
    expect(parseStoryPileDropId('pile:cluster-1')).toBe('cluster-1');
    expect(parseStoryPileDropId('drop:cover')).toBeUndefined();
  });
});
