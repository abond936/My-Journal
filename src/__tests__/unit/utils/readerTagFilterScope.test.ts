import {
  appendReaderTagScopeParam,
  readStoredReaderTagFilterScope,
} from '@/lib/utils/readerTagFilterScope';

describe('readerTagFilterScope', () => {
  describe('readStoredReaderTagFilterScope', () => {
    it('returns subject when stored value is subject', () => {
      expect(readStoredReaderTagFilterScope('subject')).toBe('subject');
    });

    it('defaults to all for missing or unknown values', () => {
      expect(readStoredReaderTagFilterScope(null)).toBe('all');
      expect(readStoredReaderTagFilterScope(undefined)).toBe('all');
      expect(readStoredReaderTagFilterScope('all')).toBe('all');
      expect(readStoredReaderTagFilterScope('other')).toBe('all');
    });
  });

  describe('appendReaderTagScopeParam', () => {
    it('adds tagScope=subject only when scope is subject', () => {
      const allParams = new URLSearchParams({ limit: '20' });
      appendReaderTagScopeParam(allParams, 'all');
      expect(allParams.get('tagScope')).toBeNull();

      const subjectParams = new URLSearchParams({ limit: '20' });
      appendReaderTagScopeParam(subjectParams, 'subject');
      expect(subjectParams.get('tagScope')).toBe('subject');
    });
  });
});
