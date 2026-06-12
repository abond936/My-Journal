import { buildReaderMetadataQuickEditPatch } from '@/lib/utils/readerCardPatchReconcile';

describe('buildReaderMetadataQuickEditPatch', () => {
  it('builds a metadata-only patch for changed title, subtitle, and excerpt', () => {
    const patch = buildReaderMetadataQuickEditPatch(
      { title: 'New title', subtitle: 'New subtitle', excerpt: 'New excerpt' },
      { title: 'Old title', subtitle: 'Old subtitle', excerpt: 'Old excerpt', excerptAuto: true }
    );

    expect(patch).toEqual({
      title: 'New title',
      subtitle: 'New subtitle',
      excerpt: 'New excerpt',
      excerptAuto: false,
    });
  });

  it('omits unchanged fields', () => {
    const patch = buildReaderMetadataQuickEditPatch(
      { title: 'Same', subtitle: 'Changed', excerpt: 'Same' },
      { title: 'Same', subtitle: 'Original', excerpt: 'Same' }
    );

    expect(patch).toEqual({ subtitle: 'Changed' });
  });

  it('clears subtitle with null when emptied', () => {
    const patch = buildReaderMetadataQuickEditPatch(
      { title: 'Same', subtitle: '', excerpt: 'Same' },
      { title: 'Same', subtitle: 'Was set', excerpt: 'Same' }
    );

    expect(patch).toEqual({ subtitle: null });
  });
});
