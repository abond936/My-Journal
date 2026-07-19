/* eslint-disable @next/next/no-img-element */
import React from 'react';
import { render, screen } from '@testing-library/react';
import ChildCardsRail from '@/components/view/ChildCardsRail';
import type { Card } from '@/lib/types/card';
import type { Tag } from '@/lib/types/tag';

jest.mock('next-auth/react', () => ({
  useSession: () => ({ data: { user: { role: 'viewer' } } }),
}));

jest.mock('swiper/react', () => ({
  Swiper: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SwiperSlide: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
jest.mock('swiper/css', () => ({}), { virtual: true });

jest.mock('next/link', () => {
  function MockNextLink({
    children,
    href,
    className,
    ...rest
  }: React.ComponentProps<'a'>) {
    return (
      <a href={href} className={className} {...rest}>
        {children}
      </a>
    );
  }
  MockNextLink.displayName = 'MockNextLink';
  return MockNextLink;
});

jest.mock('@/components/providers/CardProvider', () => ({
  useCardContext: () => ({ readerMode: 'freeform', patchVisibleCard: jest.fn() }),
}));

const mockTags: Tag[] = [
  { docId: 'who-1', name: 'Alan', dimension: 'who', path: ['who-1'] },
  { docId: 'what-1', name: 'Politics', dimension: 'what', path: ['what-1'] },
];

jest.mock('@/components/providers/TagProvider', () => ({
  useTag: () => ({ tags: mockTags, loading: false }),
}));

jest.mock('@/components/common/JournalImage', () => ({
  __esModule: true,
  default: function MockJournalImage({ alt }: { alt: string }) {
    return <img alt={alt} />;
  },
}));

jest.mock('@/components/view/ReaderCardEditEntry', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

function childStory(overrides: Partial<Card> = {}): Card {
  return {
    docId: 'child-1',
    type: 'story',
    title: '1972 Politics',
    status: 'published',
    displayMode: 'navigate',
    tags: ['who-1', 'what-1'],
    who: ['who-1'],
    what: ['what-1'],
    coverImage: {
      docId: 'img-1',
      filename: 'cover.jpg',
      storageUrl: 'https://example.com/cover.jpg',
      width: 1600,
      height: 900,
    },
    ...overrides,
  } as Card;
}

describe('ChildCardsRail', () => {
  it('renders main-feed medium tiles with chip strip for structural children', () => {
    render(<ChildCardsRail cards={[childStory()]} title="In this year" readerMode="guided" />);

    expect(screen.getByRole('heading', { name: 'In this year' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '1972 Politics' })).toBeInTheDocument();
    expect(screen.getByText('Politics')).toBeInTheDocument();
    expect(screen.getByRole('link')).toHaveAttribute('data-feed-tile-variant', 'grid');
    expect(screen.getByRole('link')).toHaveAttribute('href', expect.stringContaining('mode=guided'));
  });

  it('forces square feed tiles for inline children with portrait covers', () => {
    const { container } = render(
      <ChildCardsRail
        cards={[
          childStory({
            displayMode: 'inline',
            content: '<p>Inline body should not expand the rail tile.</p>',
            coverImage: {
              docId: 'img-portrait',
              filename: 'portrait.jpg',
              storageUrl: 'https://example.com/portrait.jpg',
              width: 900,
              height: 1600,
            },
          }),
        ]}
      />
    );

    const link = container.querySelector('a[data-card-id="child-1"]');
    expect(link?.className).toContain('squareFeedTile');
    expect(link).toHaveAttribute('data-feed-tile-variant', 'grid');
    expect(screen.queryByText('Inline body should not expand the rail tile.')).not.toBeInTheDocument();
  });

  it.each([
    ['quote', 'static'],
    ['callout', 'static'],
  ] as const)('renders %s %s children as linked square destinations', (type, displayMode) => {
    const { container } = render(
      <ChildCardsRail
        cards={[
          childStory({
            type,
            displayMode,
            title: `${type} child`,
            content: '<p>Complete static content</p>',
            coverImage: undefined,
          }),
        ]}
        adminEditReturnTo="/view/parent-1"
      />
    );

    const link = screen.getByRole('link');
    expect(link.className).toContain('squareFeedTile');
    expect(link).toHaveAttribute('data-feed-tile-variant', 'grid');
    expect(link).toHaveAttribute('href', expect.stringContaining('/view/child-1'));
    expect(screen.queryByText('Complete static content')).not.toBeInTheDocument();
    expect(container.querySelector('[class*="feedTileChipStrip"]')).toBeTruthy();
  });

  it('renders nothing when no child cards have docIds', () => {
    const { container } = render(
      <ChildCardsRail cards={[{ type: 'story', title: 'Orphan' } as Card]} />
    );
    expect(container).toBeEmptyDOMElement();
  });
});
