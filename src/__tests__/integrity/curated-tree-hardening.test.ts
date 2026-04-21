import { ErrorCode, getStatusCodeForError } from '@/lib/types/error';
import { isCuratedTreeDndEnabled } from '@/lib/config/curatedTreeDnd';
import { wouldAttachChildCreateCuratedCycle } from '@/lib/utils/curatedCollectionTree';
import type { Card } from '@/lib/types/card';

describe('Curated tree DnD hardening (integrity gate)', () => {
  describe('API error codes for childrenIds violations', () => {
    it('maps cycle to HTTP 409', () => {
      expect(getStatusCodeForError(ErrorCode.CURATED_COLLECTION_CYCLE)).toBe(409);
    });

    it('maps missing child id to HTTP 404', () => {
      expect(getStatusCodeForError(ErrorCode.CURATED_COLLECTION_CHILD_NOT_FOUND)).toBe(404);
    });
  });

  describe('isCuratedTreeDndEnabled', () => {
    const key = 'NEXT_PUBLIC_CURATED_TREE_DND';
    let previous: string | undefined;

    beforeEach(() => {
      previous = process.env[key];
    });

    afterEach(() => {
      if (previous === undefined) delete process.env[key];
      else process.env[key] = previous;
    });

    it('defaults to enabled when unset or empty', () => {
      delete process.env[key];
      expect(isCuratedTreeDndEnabled()).toBe(true);
      process.env[key] = '';
      expect(isCuratedTreeDndEnabled()).toBe(true);
      process.env[key] = '   ';
      expect(isCuratedTreeDndEnabled()).toBe(true);
    });

    it('disables only on explicit falsey env tokens', () => {
      for (const v of ['false', '0', 'no', 'off', 'FALSE', 'Off']) {
        process.env[key] = v;
        expect(isCuratedTreeDndEnabled()).toBe(false);
      }
    });

    it('enables on explicit truthy tokens', () => {
      for (const v of ['true', '1', 'yes', 'on', 'TRUE', 'On']) {
        process.env[key] = v;
        expect(isCuratedTreeDndEnabled()).toBe(true);
      }
    });
  });

  describe('Client cycle guard (mirrors server wouldCreateCycle intent)', () => {
    const cards: Card[] = [
      { docId: 'A', childrenIds: ['B'] } as Card,
      { docId: 'B', childrenIds: ['C'] } as Card,
      { docId: 'C', childrenIds: [] } as Card,
    ];

    it('detects attaching ancestor under descendant', () => {
      expect(wouldAttachChildCreateCuratedCycle(cards, 'A', 'C')).toBe(true);
    });
  });
});
