/* eslint-disable @next/next/no-img-element */
import React from 'react';
import { render, screen } from '@testing-library/react';
import ComposeFeedTilePreview from '@/components/admin/studio/cards/ComposeFeedTilePreview';
import type { Card } from '@/lib/types/card';
import type { Tag } from '@/lib/types/tag';

jest.mock('@/components/admin/studio/cards/AdminClosedCardTileShell', () => ({
  __esModule: true,
  default: function MockAdminClosedCardTileShell({
    card,
    previewObjectPosition,
  }: {
    card: { title?: string };
    previewObjectPosition?: string;
  }) {
    return (
      <div data-testid="admin-closed-card-tile-shell" data-object-position={previewObjectPosition}>
        {card.title}
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
  it('renders shared closed tile shell for square-eligible cards', () => {
    render(<ComposeFeedTilePreview card={baseCard} allTags={tags} />);
    expect(screen.getByTestId('compose-feed-tile-preview')).toBeInTheDocument();
    expect(screen.getByTestId('admin-closed-card-tile-shell')).toBeInTheDocument();
    expect(screen.getByText('Summer trip')).toBeInTheDocument();
  });

  it('passes live compose cover object position to the shell', () => {
    render(
      <ComposeFeedTilePreview card={baseCard} allTags={tags} coverObjectPosition="35% 62%" />
    );
    expect(screen.getByTestId('admin-closed-card-tile-shell')).toHaveAttribute(
      'data-object-position',
      '35% 62%'
    );
  });

  it('returns null for non-square feed types such as callout', () => {
    const { container } = render(
      <ComposeFeedTilePreview
        card={{ ...baseCard, type: 'callout', displayMode: 'navigate' }}
        allTags={tags}
      />
    );
    expect(container.firstChild).toBeNull();
  });
});
