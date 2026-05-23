import {
  JOURNAL_WHEN_UNDATED_ASC,
  JOURNAL_WHEN_UNDATED_DESC,
  computeJournalWhenSortKeys,
  parseWhenTagNameToPackedDate,
} from '@/lib/utils/journalWhenSort';
import type { Tag } from '@/lib/types/tag';

describe('journal When sort keys', () => {
  it('parses supported When tag names into packed date keys', () => {
    expect(parseWhenTagNameToPackedDate('20240523')).toBe(20240523);
    expect(parseWhenTagNameToPackedDate('1990s')).toBe(19900000);
    expect(parseWhenTagNameToPackedDate('1984')).toBe(19840000);
    expect(parseWhenTagNameToPackedDate('zNA')).toBeNull();
  });

  it('uses undated sentinels when a card has no parseable When tags', () => {
    expect(computeJournalWhenSortKeys([], new Map())).toEqual({
      journalWhenSortAsc: JOURNAL_WHEN_UNDATED_ASC,
      journalWhenSortDesc: JOURNAL_WHEN_UNDATED_DESC,
    });
  });

  it('uses the earliest parseable date from assigned When tag ancestry', () => {
    const tags = new Map<string, Tag>([
      ['year', { docId: 'year', name: '1984', dimension: 'when' } as Tag],
      ['month', { docId: 'month', name: 'May', parentId: 'year', dimension: 'when' } as Tag],
      ['day', { docId: 'day', name: '19840523', parentId: 'month', dimension: 'when' } as Tag],
      ['other', { docId: 'other', name: '1990', dimension: 'when' } as Tag],
    ]);

    expect(computeJournalWhenSortKeys(['day', 'other'], tags)).toEqual({
      journalWhenSortAsc: 19840000,
      journalWhenSortDesc: 19840000,
    });
  });
});
