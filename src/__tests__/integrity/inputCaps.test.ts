import {
  API_INPUT_CAPS,
  parseListPageLimit,
  validateRepeatedIdQueryParams,
  validateStringIdArray,
} from '@/lib/api/inputCaps';

describe('inputCaps', () => {
  describe('parseListPageLimit', () => {
    it('uses default when limit is omitted', () => {
      expect(parseListPageLimit(null)).toEqual({ ok: true, value: API_INPUT_CAPS.listPageDefault });
    });

    it('accepts in-range limits', () => {
      expect(parseListPageLimit('25')).toEqual({ ok: true, value: 25 });
      expect(parseListPageLimit(String(API_INPUT_CAPS.listPageMax))).toEqual({
        ok: true,
        value: API_INPUT_CAPS.listPageMax,
      });
    });

    it('rejects invalid limits', () => {
      expect(parseListPageLimit('0').ok).toBe(false);
      expect(parseListPageLimit('-1').ok).toBe(false);
      expect(parseListPageLimit('abc').ok).toBe(false);
    });

    it('rejects limits above max', () => {
      const result = parseListPageLimit(String(API_INPUT_CAPS.listPageMax + 1));
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('INPUT_LIMIT_EXCEEDED');
      }
    });
  });

  describe('validateStringIdArray', () => {
    it('accepts bounded id arrays', () => {
      expect(
        validateStringIdArray(['a', 'b'], { field: 'cardIds', max: 5, requireNonEmpty: true })
      ).toEqual({ ok: true, ids: ['a', 'b'] });
    });

    it('rejects over-max arrays', () => {
      const ids = Array.from({ length: 3 }, (_, i) => `id-${i}`);
      const result = validateStringIdArray(ids, { field: 'cardIds', max: 2, requireNonEmpty: true });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('INPUT_ARRAY_EXCEEDED');
      }
    });
  });

  describe('validateRepeatedIdQueryParams', () => {
    it('rejects empty id lists', () => {
      const result = validateRepeatedIdQueryParams([], { max: 10 });
      expect(result.ok).toBe(false);
    });

    it('rejects too many repeated ids', () => {
      const ids = Array.from({ length: API_INPUT_CAPS.cardByIdsMax + 1 }, (_, i) => `id-${i}`);
      const result = validateRepeatedIdQueryParams(ids, { max: API_INPUT_CAPS.cardByIdsMax });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('INPUT_ARRAY_EXCEEDED');
      }
    });
  });
});
