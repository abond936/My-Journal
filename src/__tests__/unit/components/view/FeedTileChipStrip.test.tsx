import React from 'react';
import { render, screen } from '@testing-library/react';
import FeedTileChipStrip from '@/components/view/FeedTileChipStrip';
import type { Card } from '@/lib/types/card';
import type { Tag } from '@/lib/types/tag';

const mockTags: Tag[] = [
  { docId: 'who-1', name: 'Alan', dimension: 'who', path: ['who-1'] },
  { docId: 'who-2', name: 'Sandra', dimension: 'who', path: ['who-2'] },
  { docId: 'what-1', name: 'Travel', dimension: 'what', path: ['what-1'] },
];

jest.mock('@/components/providers/TagProvider', () => ({
  useTag: () => ({ tags: mockTags, loading: false }),
}));

function baseCard(overrides: Partial<Card> = {}): Card {
  return {
    docId: 'card-1',
    type: 'story',
    title: 'Trip',
    status: 'published',
    displayMode: 'navigate',
    tags: ['who-1', 'what-1'],
    who: ['who-1'],
    what: ['what-1'],
    ...overrides,
  } as Card;
}

describe('FeedTileChipStrip', () => {
  it('renders four fixed dimension slots with placeholders for empty dimensions', () => {
    render(<FeedTileChipStrip card={baseCard()} />);
    expect(screen.getByLabelText('Who: Alan')).toHaveTextContent('Alan');
    expect(screen.getByLabelText('What: Travel')).toHaveTextContent('Travel');
    expect(screen.getByLabelText('When: empty')).toHaveTextContent('-');
    expect(screen.getByLabelText('Where: empty')).toHaveTextContent('-');

    const row = screen.getByLabelText('Who: Alan').parentElement;
    expect(row?.children).toHaveLength(4);
  });

  it('renders four empty placeholders when the card has no tags', () => {
    render(
      <FeedTileChipStrip
        card={baseCard({ tags: [], who: [], what: [], when: [], where: [] })}
      />
    );
    expect(screen.getByLabelText('Who: empty')).toHaveTextContent('-');
    expect(screen.getByLabelText('What: empty')).toHaveTextContent('-');
    expect(screen.getByLabelText('When: empty')).toHaveTextContent('-');
    expect(screen.getByLabelText('Where: empty')).toHaveTextContent('-');
  });

  it('renders Multiple or Subjects+ from direct assignments and explicit subjects', () => {
    const { rerender } = render(
      <FeedTileChipStrip card={baseCard({ tags: ['who-1', 'who-2'], who: ['who-1', 'who-2'] })} />
    );
    expect(screen.getByLabelText('Who: Multiple')).toHaveAttribute('title', 'Alan, Sandra');

    rerender(
      <FeedTileChipStrip
        card={baseCard({
          tags: ['who-1', 'who-2'],
          who: ['who-1', 'who-2'],
          subjectTagIds: ['who-2'],
        })}
      />
    );
    expect(screen.getByLabelText('Who: Sandra')).toHaveAttribute(
      'title',
      'Subjects: Sandra\nAll: Alan, Sandra'
    );
  });
});
