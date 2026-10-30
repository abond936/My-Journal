import { resolveReaderRouteMode } from '@/lib/utils/readerMode';

describe('resolveReaderRouteMode', () => {
  it('uses an explicit valid mode on card detail routes', () => {
    expect(resolveReaderRouteMode('/view/card-1', 'guided', 'freeform')).toBe('guided');
    expect(resolveReaderRouteMode('/view/card-1', 'freeform', 'guided')).toBe('freeform');
  });

  it('uses an explicit valid mode on the Reader list route', () => {
    expect(resolveReaderRouteMode('/view', 'guided', 'freeform')).toBe('guided');
    expect(resolveReaderRouteMode('/view', 'freeform', 'guided')).toBe('freeform');
  });

  it('falls back to the persisted preference for missing or invalid modes', () => {
    expect(resolveReaderRouteMode('/view/card-1', null, 'freeform')).toBe('freeform');
    expect(resolveReaderRouteMode('/view/card-1', 'other', 'guided')).toBe('guided');
    expect(resolveReaderRouteMode('/view', null, 'freeform')).toBe('freeform');
  });
});
