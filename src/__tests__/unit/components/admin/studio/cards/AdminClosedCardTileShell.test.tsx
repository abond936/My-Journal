import React from 'react';
import { render, screen } from '@testing-library/react';
import AdminClosedCardTileShell from '@/components/admin/studio/cards/AdminClosedCardTileShell';
import type { Card } from '@/lib/types/card';
import type { Tag } from '@/lib/types/tag';

jest.mock('@/components/common/JournalImage', () => ({
  __esModule: true,
  default: (props: { alt?: string; style?: React.CSSProperties }) => (
    <img alt={props.alt ?? ''} data-object-position={props.style?.objectPosition} />
  ),
}));

jest.mock('@/components/view/FeedTileChipStrip', () => ({
  __esModule: true,
  default: () => <div data-testid="feed-tile-chip-strip" />,
}));

jest.mock('@/components/admin/studio/cards/UtilityCardPreview', () => ({
  __esModule: true,
  default: ({ card }: { card: { title?: string } }) => <div data-testid="utility-preview">{card.title}</div>,
}));

jest.mock('@/lib/utils/photoUtils', () => ({
  getStudioDisplayUrl: () => '/studio.jpg',
}));

describe('AdminClosedCardTileShell', () => {
  const tags: Tag[] = [{ docId: 'who-1', name: 'Alan', dimension: 'who', path: ['who-1'] }];

  it('renders square shell with title band and chip strip', () => {
    render(
      <AdminClosedCardTileShell
        card={
          {
            docId: 'c1',
            title: 'Summer trip',
            type: 'story',
            tags: ['who-1'],
          } as Card
        }
        allTags={tags}
        preview={{
          docId: 'm1',
          storageUrl: 'https://example.com/c.jpg',
          width: 1200,
          height: 800,
        }}
        previewObjectFit="cover"
        previewObjectPosition="40% 20%"
        renderUtilityPreview={false}
        pendingFocus={false}
        onCoverClick={jest.fn()}
        thumbnailTooltip="Summer trip"
        imageSizes="200px"
      />
    );

    expect(screen.getByText('Summer trip')).toBeInTheDocument();
    expect(screen.getByTestId('feed-tile-chip-strip')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Summer trip' })).toHaveAttribute(
      'data-object-position',
      '40% 20%'
    );
  });

  it('uses utility preview for quote cards', () => {
    render(
      <AdminClosedCardTileShell
        card={{ docId: 'q1', title: 'A quote', type: 'quote', tags: [] } as Card}
        allTags={tags}
        preview={null}
        previewObjectFit="cover"
        previewObjectPosition="center"
        renderUtilityPreview
        pendingFocus={false}
        onCoverClick={jest.fn()}
        thumbnailTooltip="A quote"
        imageSizes="200px"
      />
    );

    expect(screen.getByTestId('utility-preview')).toHaveTextContent('A quote');
  });
});
