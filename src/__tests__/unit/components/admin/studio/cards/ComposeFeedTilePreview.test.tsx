import React from 'react';
import { render, screen } from '@testing-library/react';
import ComposeFeedTilePreview from '@/components/admin/studio/cards/ComposeFeedTilePreview';
import type { Card } from '@/lib/types/card';
import type { Tag } from '@/lib/types/tag';

jest.mock('@/components/view/V2ContentCard', () => ({
  __esModule: true,
  default: function MockV2ContentCard({
    card,
    previewOnly,
    previewCoverObjectPosition,
  }: {
    card: { title?: string; type?: string; displayMode?: string };
    previewOnly?: boolean;
    previewCoverObjectPosition?: string;
  }) {
    return (
      <div
        data-testid="reader-content-card"
        data-preview-only={String(previewOnly)}
        data-object-position={previewCoverObjectPosition}
      >
        {card.type}:{card.displayMode}:{card.title}
      </div>
    );
  },
}));

const tags: Tag[] = [{ docId: 'who-1', name: 'Alan', dimension: 'who', path: ['who-1'] }];

const baseCard: Card = {
  docId: 'card-1',
  type: 'story',
  title: 'Summer trip',
  status: 'published',
  displayMode: 'navigate',
  tags: ['who-1'],
  who: ['who-1'],
  coverImage: {
    docId: 'media-1',
    filename: 'cover.jpg',
    width: 1600,
    height: 900,
    url: '/test/cover.jpg',
  },
  coverImageFocalPoint: { x: 800, y: 450 },
};

describe('ComposeFeedTilePreview', () => {
  it('renders the actual Reader card in noninteractive preview mode', () => {
    render(<ComposeFeedTilePreview card={baseCard} allTags={tags} />);
    expect(screen.getByTestId('compose-feed-tile-preview')).toBeInTheDocument();
    expect(screen.getByTestId('reader-content-card')).toHaveAttribute('data-preview-only', 'true');
    expect(screen.getByText('story:navigate:Summer trip')).toBeInTheDocument();
  });

  it('passes live compose cover object position to the shell', () => {
    render(
      <ComposeFeedTilePreview card={baseCard} allTags={tags} coverObjectPosition="35% 62%" />
    );
    expect(screen.getByTestId('reader-content-card')).toHaveAttribute(
      'data-object-position',
      '35% 62%'
    );
  });

  it.each([
    ['story', 'navigate'],
    ['gallery', 'navigate'],
    ['gallery', 'inline'],
    ['qa', 'navigate'],
    ['qa', 'inline'],
    ['quote', 'static'],
    ['callout', 'static'],
  ] as const)('previews %s %s Reader presentation', (type, displayMode) => {
    render(
      <ComposeFeedTilePreview
        card={{ ...baseCard, type, displayMode }}
        allTags={tags}
      />
    );
    expect(screen.getByText(`${type}:${displayMode}:Summer trip`)).toBeInTheDocument();
  });
});
