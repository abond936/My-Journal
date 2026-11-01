import { suggestExistingCardTags } from '@/lib/utils/cardTagSuggestions';
import type { Tag } from '@/lib/types/tag';

const tags: Tag[] = [
  { docId: 'who-root', name: 'Family', dimension: 'who', path: [], cardCount: 0, mediaCount: 0 },
  { docId: 'alan', name: 'Alan Bond', dimension: 'who', parentId: 'who-root', path: ['who-root'], cardCount: 0, mediaCount: 0 },
  { docId: 'charlie', name: 'Charlie', dimension: 'who', parentId: 'who-root', path: ['who-root'], cardCount: 0, mediaCount: 0 },
  { docId: 'what-root', name: 'Events', dimension: 'what', path: [], cardCount: 0, mediaCount: 0 },
  { docId: 'birthday', name: 'Birthday', dimension: 'what', parentId: 'what-root', path: ['what-root'], cardCount: 0, mediaCount: 0 },
  { docId: 'beach', name: 'Beach', dimension: 'where', path: [], cardCount: 0, mediaCount: 0 },
];

describe('suggestExistingCardTags', () => {
  it('proposes exact existing phrases from title and body without assigning them', () => {
    expect(suggestExistingCardTags({
      title: "Charlie's Birthday",
      content: '<p>Alan Bond joined us at the beach.</p>',
      allTags: tags,
    })).toEqual([
      expect.objectContaining({ tagId: 'charlie', dimension: 'who', evidence: 'title' }),
      expect.objectContaining({ tagId: 'alan', dimension: 'who', evidence: 'story text' }),
      expect.objectContaining({ tagId: 'birthday', dimension: 'what', evidence: 'title' }),
      expect.objectContaining({ tagId: 'beach', dimension: 'where', evidence: 'story text' }),
    ]);
  });

  it('omits selected tags and does not use substring matches', () => {
    const results = suggestExistingCardTags({
      title: 'A family birthday',
      content: '<p>Charlieson visited the beachfront.</p>',
      allTags: tags,
      selectedTagIds: ['birthday'],
    });
    expect(results.map((item) => item.tagId)).toEqual(['who-root']);
  });
});
