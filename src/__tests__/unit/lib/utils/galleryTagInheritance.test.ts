import {
  inheritedDimensionsChangedByTagEdit,
  protectExistingCardInheritance,
} from '@/lib/utils/galleryTagInheritance';
import type { Tag } from '@/lib/types/tag';

const tags = [
  { docId: 'who-1', name: 'Sandra', dimension: 'who' },
  { docId: 'who-2', name: 'Mildred', dimension: 'who' },
  { docId: 'where-1', name: 'Atlanta', dimension: 'where' },
] as Tag[];

const settings = { who: true, what: true, when: true, where: true };

describe('inheritedDimensionsChangedByTagEdit', () => {
  it('identifies only inherited dimensions changed by a manual tag edit', () => {
    expect(
      inheritedDimensionsChangedByTagEdit(
        ['who-1', 'who-2', 'where-1'],
        ['who-1'],
        tags,
        settings,
        { who: false, what: false, when: false, where: true }
      )
    ).toEqual(['who']);
  });

  it('does not require confirmation for a dimension already overridden', () => {
    expect(
      inheritedDimensionsChangedByTagEdit(
        ['who-1'],
        ['who-1', 'who-2'],
        tags,
        settings,
        { who: true, what: false, when: false, where: false }
      )
    ).toEqual([]);
  });

  it('protects legacy existing cards when no explicit override state exists', () => {
    expect(
      inheritedDimensionsChangedByTagEdit(
        ['who-1'],
        ['who-2'],
        tags,
        settings,
        protectExistingCardInheritance()
      )
    ).toEqual([]);
  });
});
