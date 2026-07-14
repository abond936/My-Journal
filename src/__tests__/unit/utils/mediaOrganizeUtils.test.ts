import {
  buildStoryPileOverlayGroups,
  collectImportBatchIdsFromMedia,
  filterMediaForOrganizeBatch,
  filterMediaForOrganizeImportScope,
  formatImportBatchLabel,
  LEGACY_IMPORT_BATCH_ID,
  organizeSourceToReviewLens,
} from '@/lib/utils/mediaOrganizeUtils';
import type { Media } from '@/lib/types/photo';

function media(partial: Partial<Media> & { docId: string }): Media {
  return partial as Media;
}

describe('mediaOrganizeUtils', () => {
  const items = [
    media({ docId: 'a', importBatchId: 'batch-100' }),
    media({ docId: 'b', importBatchId: 'batch-200' }),
    media({ docId: 'c' }),
  ];

  it('collects unique sorted import batch ids', () => {
    expect(collectImportBatchIdsFromMedia(items)).toEqual(['batch-200', 'batch-100']);
  });

  it('filters browse batch to a single import batch id', () => {
    const scoped = filterMediaForOrganizeBatch(items, 'batch-100');
    expect(scoped.map((item) => item.docId)).toEqual(['a']);
  });

  it('returns all media when batch filter is empty', () => {
    expect(filterMediaForOrganizeBatch(items, '')).toEqual(items);
    expect(filterMediaForOrganizeBatch(items, null)).toEqual(items);
  });

  it('formats legacy batch label', () => {
    expect(formatImportBatchLabel(LEGACY_IMPORT_BATCH_ID)).toBe('Legacy imports');
  });

  it('filters recent import scope to the latest batch id', () => {
    const scoped = filterMediaForOrganizeImportScope(
      items,
      { mode: 'recent', singleBatchId: '', manyBatchIds: [] },
      'batch-100'
    );
    expect(scoped.map((item) => item.docId)).toEqual(['a']);
  });

  it('filters many import scope to selected batches', () => {
    const scoped = filterMediaForOrganizeImportScope(
      items,
      { mode: 'many', singleBatchId: '', manyBatchIds: ['batch-200'] },
      ''
    );
    expect(scoped.map((item) => item.docId)).toEqual(['b']);
  });

  it('filters all import scope to rows with batch ids', () => {
    const scoped = filterMediaForOrganizeImportScope(
      items,
      { mode: 'all', singleBatchId: '', manyBatchIds: [] },
      ''
    );
    expect(scoped.map((item) => item.docId)).toEqual(['a', 'b']);
  });

  it('maps organize source modes to review lenses', () => {
    expect(organizeSourceToReviewLens('foldered')).toBe('suggested');
    expect(organizeSourceToReviewLens('raw')).toBe('when');
    expect(organizeSourceToReviewLens('phone')).toBe('suggested');
  });

  it('formats batch labels for timestamped ids', () => {
    expect(formatImportBatchLabel('batch-1000')).toContain('Import');
  });
});

describe('buildStoryPileOverlayGroups', () => {
  it('builds pile sections with unsorted tail and exclusive membership', () => {
    const mediaItems = [
      media({ docId: 'a', importBatchId: 'batch-1' }),
      media({ docId: 'b', importBatchId: 'batch-1' }),
      media({ docId: 'c', importBatchId: 'batch-1' }),
    ];
    const clusters = [
      {
        docId: 'pile-1',
        lens: 'suggested' as const,
        status: 'pending' as const,
        title: 'Picnic',
        reason: 'test',
        memberMediaIds: ['a', 'b'],
        suggestedTagIds: {},
        createdAt: 1,
        updatedAt: 1,
      },
    ];

    const sections = buildStoryPileOverlayGroups(mediaItems, clusters);
    expect(sections).toHaveLength(2);
    expect(sections[0]?.title).toBe('Picnic');
    expect(sections[0]?.memberMediaIds).toEqual(['a', 'b']);
    expect(sections[1]?.isUnsorted).toBe(true);
    expect(sections[1]?.memberMediaIds).toEqual(['c']);
  });
});
