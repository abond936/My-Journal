import { temporalFromWhenTagIds } from '@/lib/utils/temporalFromWhenTags';
import type { Tag } from '@/lib/types/tag';

function map(tags: Tag[]): Map<string, Tag> {
  return new Map(tags.map((tag) => [tag.docId!, tag]));
}

describe('temporalFromWhenTagIds', () => {
  it('converts decade, year, packed day, and hierarchical month/day tags', () => {
    expect(temporalFromWhenTagIds(['d'], map([{ docId: 'd', name: '1950s', dimension: 'when' }]))).toMatchObject({
      status: 'convertible',
      value: { status: 'known', year: 1950, precision: 'decade', source: 'migrated' },
    });
    expect(temporalFromWhenTagIds(['y'], map([{ docId: 'y', name: '1957', dimension: 'when' }]))).toMatchObject({
      status: 'convertible',
      value: { status: 'known', year: 1957, precision: 'year', source: 'migrated' },
    });
    expect(temporalFromWhenTagIds(['p'], map([{ docId: 'p', name: '19610704', dimension: 'when' }]))).toMatchObject({
      status: 'convertible',
      value: { status: 'known', year: 1961, month: 7, day: 4, precision: 'day' },
    });
    const tags: Tag[] = [
      { docId: 'year', name: '2021', dimension: 'when' },
      { docId: 'month', name: 'October', dimension: 'when', parentId: 'year' },
      { docId: 'day', name: '15', dimension: 'when', parentId: 'month' },
    ];
    expect(temporalFromWhenTagIds(['day'], map(tags))).toMatchObject({
      status: 'convertible',
      value: { status: 'known', year: 2021, month: 10, day: 15, precision: 'day' },
    });
  });

  it('uses the most precise compatible value and flags incompatible dates', () => {
    const tags: Tag[] = [
      { docId: 'decade', name: '1950s', dimension: 'when' },
      { docId: 'year', name: '1957', dimension: 'when', parentId: 'decade' },
      { docId: 'other', name: '1961', dimension: 'when' },
    ];
    expect(temporalFromWhenTagIds(['decade', 'year'], map(tags))).toMatchObject({
      status: 'convertible',
      value: { year: 1957, precision: 'year' },
    });
    expect(temporalFromWhenTagIds(['year', 'other'], map(tags))).toMatchObject({
      status: 'ambiguous',
    });
  });

  it('maps explicit unresolved tags without treating an ordinary unparseable tag as a date', () => {
    expect(temporalFromWhenTagIds(['na'], map([{ docId: 'na', name: 'zNA', dimension: 'when' }]))).toMatchObject({
      status: 'convertible',
      value: { status: 'not_applicable', source: 'migrated' },
    });
    expect(temporalFromWhenTagIds(['event'], map([{ docId: 'event', name: 'Childhood', dimension: 'when' }]))).toMatchObject({
      status: 'empty',
    });
  });
});
