import {
  buildReaderModePath,
  isReaderHomeRoute,
  parseReaderEntryMode,
} from '@/lib/utils/readerEntry';

describe('readerEntry', () => {
  it('recognizes only delivered Reader modes', () => {
    expect(parseReaderEntryMode('guided')).toBe('guided');
    expect(parseReaderEntryMode('freeform')).toBe('freeform');
    expect(parseReaderEntryMode('collections')).toBeNull();
    expect(parseReaderEntryMode(null)).toBeNull();
  });

  it('treats only bare Reader entry as Reader Home', () => {
    expect(isReaderHomeRoute('/view', null)).toBe(true);
    expect(isReaderHomeRoute('/view', 'other')).toBe(true);
    expect(isReaderHomeRoute('/view', 'guided')).toBe(false);
    expect(isReaderHomeRoute('/view/card-1', null)).toBe(false);
    expect(isReaderHomeRoute('/search', null)).toBe(false);
  });

  it('builds stable explicit reading paths', () => {
    expect(buildReaderModePath('guided')).toBe('/view?mode=guided');
    expect(buildReaderModePath('freeform')).toBe('/view?mode=freeform');
  });
});
