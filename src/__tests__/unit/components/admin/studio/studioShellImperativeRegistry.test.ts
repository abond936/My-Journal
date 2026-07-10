import { createStudioShellImperativeRegistry } from '@/components/admin/studio/studioShellImperativeRegistry';
import type { Media } from '@/lib/types/photo';

describe('studioShellImperativeRegistry', () => {
  it('registers and retrieves body media insert handlers', () => {
    const registry = createStudioShellImperativeRegistry();
    const handler = jest.fn();
    registry.register('bodyMediaInsert', handler);

    expect(registry.get('bodyMediaInsert')).toBe(handler);
    expect(registry.bodyMediaInsertRef.current).toBe(handler);

    registry.register('bodyMediaInsert', null);
    expect(registry.get('bodyMediaInsert')).toBeNull();
    expect(registry.bodyMediaInsertRef.current).toBeNull();
  });

  it('exposes bodyMediaInsertRef bridge compatible with legacy DnD reads', () => {
    const registry = createStudioShellImperativeRegistry();
    const media = { docId: 'media-1' } as Media;
    const handler = jest.fn();

    registry.bodyMediaInsertRef.current = handler;
    registry.bodyMediaInsertRef.current?.(media);

    expect(handler).toHaveBeenCalledWith(media);
  });
});
