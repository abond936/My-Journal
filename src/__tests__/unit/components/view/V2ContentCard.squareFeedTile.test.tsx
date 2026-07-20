/* eslint-disable @next/next/no-img-element */
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
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

  it('renders utility headings and preserves the square Question chip strip', () => {
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
    expect(screen.getAllByText('Alan')).toHaveLength(1);
    expect(container.querySelector('[data-card-id="qa-1"] [class*="feedTileChipStrip"]')).toBeTruthy();
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

  it('uses the standard title band for a covered Question card', () => {
    const { container } = render(
      <V2ContentCard card={baseStory({ docId: 'question-cover', type: 'qa', title: 'Who was your grandfather?' })} />
    );

    expect(screen.getByRole('heading', { name: 'Who was your grandfather?' })).toBeInTheDocument();
    expect(container.querySelector('[class*="qaCoverBadge"]')).toBeNull();
    expect(container.querySelector('[class*="feedTileMetaBand"]')).toBeTruthy();
  });

  it('uses the same long-prompt fitting marker in grid and rail Question tiles', () => {
    const card = baseStory({
      docId: 'qa-long',
      type: 'qa',
      displayMode: 'navigate',
      title: 'What was your relationship with your parents like when you were a child, teenager, or adult?',
      coverImage: undefined,
    });

    const { container, rerender } = render(<V2ContentCard card={card} />);
    expect(container.querySelector('[data-question-prompt-length="dense"]')).toBeTruthy();

    rerender(<V2ContentCard card={card} size="small" fullWidth destinationTile />);
    expect(container.querySelector('[data-question-prompt-length="dense"]')).toBeTruthy();
  });

  it('renders a square Callout with its complete bounded body and standard chip strip', () => {
    const { container } = render(
      <V2ContentCard
        card={baseStory({
          docId: 'callout-1',
          type: 'callout',
          displayMode: 'static',
          title: 'Culture',
          coverImage: undefined,
          content: '<ul><li>Music</li><li>Movies</li><li>Art</li><li>Books</li><li>Traditions</li></ul>',
        })}
      />
    );

    const tile = container.querySelector('[data-card-id="callout-1"]');
    expect(tile?.className).toContain('squareFeedTile');
    expect(tile).toHaveAttribute('data-feed-tile-variant', 'grid');
    expect(screen.getByText('Music')).toBeInTheDocument();
    expect(screen.getByText('Traditions')).toBeInTheDocument();
    expect(screen.getByText('Alan')).toBeInTheDocument();
    expect(screen.getByText('Travel')).toBeInTheDocument();
    expect(container.querySelector('[class*="feedTileChipStrip"]')).toBeTruthy();
  });

  it('renders Gallery type, position, and a fully disclosed bounded feed caption', () => {
    const caption = 'A long authored caption that remains available in full while the feed overlay is visually bounded.';
    const card = baseStory({
      docId: 'gallery-caption',
      type: 'gallery',
      title: 'Captioned album',
      coverImage: undefined,
      galleryMedia: [
        {
          mediaId: 'gallery-image-1',
          order: 0,
          caption,
          media: {
            docId: 'gallery-image-1',
            filename: 'first.jpg',
            storageUrl: 'https://example.com/first.jpg',
            width: 1200,
            height: 900,
          },
        },
        {
          mediaId: 'gallery-image-2',
          order: 1,
          media: {
            docId: 'gallery-image-2',
            filename: 'second.jpg',
            storageUrl: 'https://example.com/second.jpg',
            width: 1200,
            height: 900,
          },
        },
      ],
    });

    render(<V2ContentCard card={card} />);

    expect(screen.getByText('Gallery')).toBeInTheDocument();
    expect(screen.getByText('1/2')).toBeInTheDocument();
    expect(screen.getByLabelText(`Image caption: ${caption}`)).toHaveAttribute('title', caption);
    expect(screen.getByText(caption)).toBeInTheDocument();
  });

  it.each([
    ['gallery', 'inline'],
    ['qa', 'inline'],
    ['quote', 'static'],
    ['callout', 'static'],
  ] as const)(
    'renders %s %s as a compact navigable destination with chips when requested',
    (type, displayMode) => {
      const card = baseStory({
        docId: `${type}-destination`,
        type,
        displayMode,
        title: `${type} destination`,
        content: '<p>Full inline or static body</p>',
        coverImage: type === 'quote' || type === 'callout' ? undefined : baseStory().coverImage,
      });

      const { container } = render(
        <V2ContentCard card={card} size="small" fullWidth destinationTile />
      );

      const link = screen.getByRole('link');
      expect(link).toHaveAttribute('data-feed-tile-variant', 'rail');
      expect(link).toHaveAttribute('href', expect.stringContaining(`/view/${type}-destination`));
      expect(link.className).toContain('squareFeedTile');
      expect(screen.getByText('Alan')).toBeInTheDocument();
      expect(screen.getByText('Travel')).toBeInTheDocument();
      expect(screen.queryByText('Full inline or static body')).not.toBeInTheDocument();
      expect(container.querySelector('[class*="feedTileChipStrip"]')).toBeTruthy();
    }
  );

  it('reveals and restores an inline Question answer while keeping chips on the question face', () => {
    const { container } = render(
      <V2ContentCard
        card={baseStory({
          docId: 'qa-reveal',
          type: 'qa',
          displayMode: 'inline',
          title: 'What is your favorite ice cream?',
          content: '<p>Vanilla</p>',
          coverImage: undefined,
        })}
      />
    );

    const reveal = screen.getByRole('button', { name: 'Reveal answer' });
    const revealCard = container.querySelector('[data-card-id="qa-reveal"]');
    const questionFace = container.querySelector('[class*="qaQuestionFace"]');
    const answerFace = container.querySelector('[class*="qaAnswerFace"]');
    expect(revealCard?.className).toContain('squareFeedTile');
    expect(revealCard).toHaveAttribute('data-feed-tile-variant', 'grid');
    expect(questionFace).toContainElement(screen.getByText('Alan'));
    expect(answerFace).not.toContainElement(screen.getByText('Alan'));
    expect(answerFace).toHaveAttribute('aria-hidden', 'true');

    fireEvent.click(reveal);
    expect(screen.getByRole('button', { name: 'Show question' })).toHaveAttribute('aria-pressed', 'true');
    expect(answerFace).toHaveAttribute('aria-hidden', 'false');
    expect(screen.getByText('Vanilla')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Show question' }));
    expect(screen.getByRole('button', { name: 'Reveal answer' })).toHaveAttribute('aria-pressed', 'false');
  });
});
