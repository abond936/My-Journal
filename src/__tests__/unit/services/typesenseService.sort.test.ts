import { buildListSort } from '@/lib/services/typesenseService';

describe('Typesense card list sort contract', () => {
  it('mirrors Firestore created and title tie-break direction with doc_id', () => {
    expect(buildListSort('created', 'asc', false)).toBe('created_at:asc,doc_id:asc');
    expect(buildListSort('created', 'desc', false)).toBe('created_at:desc,doc_id:desc');
    expect(buildListSort('title', 'asc', false)).toBe('title_lowercase:asc,doc_id:asc');
    expect(buildListSort('title', 'desc', false)).toBe('title_lowercase:desc,doc_id:desc');
  });

  it('keeps dimensional sort tie-breaks stable by title then doc_id', () => {
    expect(buildListSort('who', 'asc', false)).toBe('who_sort_key:asc,title_lowercase:asc,doc_id:asc');
    expect(buildListSort('who', 'desc', false)).toBe('who_sort_key:desc,title_lowercase:asc,doc_id:asc');
    expect(buildListSort('what', 'asc', false)).toBe('what_sort_key:asc,title_lowercase:asc,doc_id:asc');
    expect(buildListSort('where', 'desc', false)).toBe('where_sort_key:desc,title_lowercase:asc,doc_id:asc');
  });

  it('keeps undated When items last through the denormalized keys', () => {
    expect(buildListSort('when', 'asc', false)).toBe('journal_when_sort_asc:asc,doc_id:asc');
    expect(buildListSort('when', 'desc', false)).toBe('journal_when_sort:desc,doc_id:desc');
  });

  it('treats text search as relevance ordered with deterministic tie-break', () => {
    expect(buildListSort('title', 'asc', true)).toBe('_text_match:desc,updated_at:desc,doc_id:asc');
  });
});
