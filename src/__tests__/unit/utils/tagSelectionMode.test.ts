import {
  appendTagSelectionModeParam,
  matchesSelectedTags,
  readTagSelectionMode,
} from '@/lib/utils/tagSelectionMode';

describe('tagSelectionMode', () => {
  it('defaults invalid or absent values to Any', () => {
    expect(readTagSelectionMode(null)).toBe('any');
    expect(readTagSelectionMode('invalid')).toBe('any');
    expect(readTagSelectionMode('all')).toBe('all');
  });

  it('distinguishes Any from All for multiple selected tags', () => {
    expect(matchesSelectedTags(['robert'], ['robert', 'sandra'], 'any')).toBe(true);
    expect(matchesSelectedTags(['robert'], ['robert', 'sandra'], 'all')).toBe(false);
    expect(matchesSelectedTags(['robert', 'sandra'], ['robert', 'sandra'], 'all')).toBe(true);
  });

  it('only emits the non-default operator', () => {
    const params = new URLSearchParams();
    appendTagSelectionModeParam(params, 'any');
    expect(params.has('tagOperator')).toBe(false);
    appendTagSelectionModeParam(params, 'all');
    expect(params.get('tagOperator')).toBe('all');
  });
});
