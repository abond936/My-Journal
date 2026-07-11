/* eslint-disable @next/next/no-img-element */
import React from 'react';
import { render, screen } from '@testing-library/react';
import V2ContentCard from '@/components/view/V2ContentCard';
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
  { docId: 'what-1', name: 'Travel', dimension: 'what', path: ['what-1'] },
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

function baseStory(overrides: Partial<Card> = {}): Card {
  return {
    docId: 'story-1',
    type: 'story',
    title: 'Summer trip',
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

describe('V2ContentCard square feed tile', () => {
  it('renders square shell with title band and bottom chip strip for story cards', () => {
    const { container } = render(<V2ContentCard card={baseStory()} />);
    const link = container.querySelector('a[data-card-id="story-1"]');
    expect(link?.className).toContain('squareFeedTile');
    expect(screen.getByText('Alan')).toBeInTheDocument();
    expect(screen.getByText('Travel')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Summer trip' })).toBeInTheDocument();

    const title = screen.getByRole('heading', { name: 'Summer trip' });
    const chipStrip = screen.getByText('Alan').closest('[class*="feedTileChipStrip"]');
    expect(chipStrip).toBeTruthy();
    expect(title.compareDocumentPosition(chipStrip!)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
  });

  it('renders centered utility hero with bottom chips for quote and question tiles', () => {
    const { container } = render(
      <>
        <V2ContentCard
          card={{
            ...baseStory(),
            docId: 'quote-1',
            type: 'quote',
            displayMode: 'static',
            title: 'A wise line',
            coverImage: undefined,
          }}
        />
        <V2ContentCard
          card={{
            ...baseStory(),
            docId: 'qa-1',
            type: 'qa',
            displayMode: 'navigate',
            title: 'What happened next?',
            coverImage: undefined,
          }}
        />
      </>
    );

    expect(screen.getByRole('heading', { name: 'A wise line' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'What happened next?' })).toBeInTheDocument();
    expect(screen.getAllByText('Alan')).toHaveLength(2);
    expect(container.querySelector('[data-card-id="quote-1"] .utilityTileHeroFullCenter')).toBeTruthy();
    expect(container.querySelector('[data-card-id="qa-1"] .utilityTileHeroFullCenter')).toBeTruthy();
  });

  it('renders four chip placeholders when a square tile has no resolved tags', () => {
    render(
      <V2ContentCard
        card={{
          ...baseStory(),
          tags: [],
          who: [],
          what: [],
          when: [],
          where: [],
        }}
      />
    );
    expect(screen.getByLabelText('Who: empty')).toHaveTextContent('-');
    expect(screen.getByLabelText('What: empty')).toHaveTextContent('-');
    expect(screen.getByLabelText('When: empty')).toHaveTextContent('-');
    expect(screen.getByLabelText('Where: empty')).toHaveTextContent('-');
  });

  it('omits the bottom chip strip on compact small square tiles', () => {
    render(<V2ContentCard card={baseStory()} size="small" />);
    expect(screen.queryByText('Alan')).not.toBeInTheDocument();
    expect(screen.queryByText('Travel')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Summer trip' })).toBeInTheDocument();
    expect(screen.getByRole('link')).toHaveAttribute('data-feed-tile-variant', 'rail');
  });

  it('marks main-grid square tiles as feed grid variant', () => {
    render(<V2ContentCard card={baseStory()} size="medium" />);
    expect(screen.getByRole('link')).toHaveAttribute('data-feed-tile-variant', 'grid');
  });

  it('does not apply square feed layout for inline gallery cards', () => {
    const card = {
      docId: 'gallery-1',
      type: 'gallery',
      title: 'Album',
      status: 'published',
      displayMode: 'inline',
      tags: ['who-1'],
      galleryMedia: [],
    } as Card;
    const { container } = render(<V2ContentCard card={card} />);
    const root = container.querySelector('[data-card-id="gallery-1"]');
    expect(root?.className ?? '').not.toContain('squareFeedTile');
    expect(screen.queryByText('Alan')).not.toBeInTheDocument();
  });
});
