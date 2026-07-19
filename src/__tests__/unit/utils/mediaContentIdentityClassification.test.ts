import { classifyMediaIdentityEvidence } from '@/lib/utils/mediaContentIdentityClassification';

describe('classifyMediaIdentityEvidence', () => {
  it('keeps verified source-byte evidence authoritative', () => {
    expect(classifyMediaIdentityEvidence({ docId: 'm1', source: 'paste', contentIdentity: { digest: 'a'.repeat(64) } }, false)).toBe('verified');
  });

  it('distinguishes a recoverable local original from a missing one', () => {
    const row = { docId: 'm1', source: 'local', sourcePath: 'folder/image.jpg' };
    expect(classifyMediaIdentityEvidence(row, true)).toBe('recoverable-local-original');
    expect(classifyMediaIdentityEvidence(row, false)).toBe('local-original-not-found');
  });

  it('does not treat non-local stored bytes as original evidence', () => {
    expect(classifyMediaIdentityEvidence({ docId: 'm1', source: 'paste' }, true)).toBe('source-original-not-retained');
  });
});

