import {
  normalizeMediaPresentationRotation,
  turnMediaPresentation,
} from '@/lib/types/mediaPresentation';

describe('Media presentation rotation', () => {
  it('normalizes legacy or invalid values without changing source Media', () => {
    expect(normalizeMediaPresentationRotation(undefined)).toBe(0);
    expect(normalizeMediaPresentationRotation(45)).toBe(0);
    expect(normalizeMediaPresentationRotation(270)).toBe(270);
  });

  it('turns through the four nondestructive presentation orientations', () => {
    expect(turnMediaPresentation(0, 'right')).toBe(90);
    expect(turnMediaPresentation(270, 'right')).toBe(0);
    expect(turnMediaPresentation(0, 'left')).toBe(270);
    expect(turnMediaPresentation(90, 'left')).toBe(0);
  });
});
