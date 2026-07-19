import { getSafeReaderReturnTo } from '@/lib/utils/readerReturnTo';

describe('getSafeReaderReturnTo', () => {
  it('accepts bounded Reader feed, detail, and search paths', () => {
    expect(getSafeReaderReturnTo('/view?focusCardId=one')).toBe('/view?focusCardId=one');
    expect(getSafeReaderReturnTo('/view/one?mode=freeform')).toBe('/view/one?mode=freeform');
    expect(getSafeReaderReturnTo('/search?q=family')).toBe('/search?q=family');
  });

  it('rejects external, malformed, and lookalike paths', () => {
    expect(getSafeReaderReturnTo('https://evil.test/view')).toBeNull();
    expect(getSafeReaderReturnTo('//evil.test/view')).toBeNull();
    expect(getSafeReaderReturnTo('/viewer')).toBeNull();
    expect(getSafeReaderReturnTo('/searching?q=x')).toBeNull();
    expect(getSafeReaderReturnTo('/view/../admin')).toBeNull();
  });
});
