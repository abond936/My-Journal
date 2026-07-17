import {
  buildMediaSourceIdentity,
  groupExactMediaDuplicates,
  mediaDuplicatePairKey,
  sha256SourceBytes,
} from '@/lib/utils/mediaDuplicateEvidence';

describe('media duplicate evidence', () => {
  it('hashes source bytes deterministically', () => {
    expect(sha256SourceBytes(Buffer.from('same bytes'))).toBe(
      '58100dc8fc06562ce3e578231dc948e083520ee49c4b4ee5a5a28bb4b4003feb'
    );
    expect(sha256SourceBytes(Buffer.from('same bytes'))).not.toBe(
      sha256SourceBytes(Buffer.from('different bytes'))
    );
  });

  it('keeps source identity separate from content identity', () => {
    expect(buildMediaSourceIdentity('local', 'folder/a.jpg', 'folder/a.jpg', 10)).toEqual({
      provider: 'local',
      assetId: 'folder/a.jpg',
      sourcePath: 'folder/a.jpg',
      importedAt: 10,
    });
  });

  it('groups only exact digest matches and creates stable pair keys', () => {
    const digest = 'a'.repeat(64);
    expect(
      groupExactMediaDuplicates([
        { docId: 'second', contentIdentity: { algorithm: 'sha256', digest, basis: 'source-bytes' } },
        { docId: 'unhashed' },
        { docId: 'first', contentIdentity: { algorithm: 'sha256', digest, basis: 'source-bytes' } },
        {
          docId: 'different',
          contentIdentity: { algorithm: 'sha256', digest: 'b'.repeat(64), basis: 'source-bytes' },
        },
      ])
    ).toEqual([{ digest, mediaIds: ['first', 'second'] }]);
    expect(mediaDuplicatePairKey('second', 'first')).toBe('first__second');
  });
});
