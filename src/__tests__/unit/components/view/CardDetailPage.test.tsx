/* eslint-disable @next/next/no-img-element */
import React from 'react';
import { render, screen } from '@testing-library/react';
import CardDetailPage from '@/app/view/[id]/CardDetailPage';
import { useCardContext } from '@/components/providers/CardProvider';
import { useSearchParams } from 'next/navigation';
import type { Card } from '@/lib/types/card';

jest.mock('next-auth/react', () => ({
  useSession: () => ({ data: { user: { role: 'viewer' } } }),
}));

jest.mock('next/navigation', () => ({
  useSearchParams: jest.fn(),
}));

jest.mock('@/components/providers/CardProvider', () => ({
  useCardContext: jest.fn(),
}));

jest.mock('@/components/providers/TagProvider', () => ({
  useTag: () => ({ tags: [] }),
}));

jest.mock('@/components/view/DiscoverySection', () => ({
  __esModule: true,
  default: () => <section data-testid="discovery-section">Discovery</section>,
}));

jest.mock('@/components/view/ChildCardsRail', () => ({
  __esModule: true,
  default: ({ cards, readerMode }: { cards: Card[]; readerMode?: string }) => (
    <section data-testid="child-cards-rail" data-reader-mode={readerMode}>Children: {cards.length}</section>
  ),
}));

jest.mock('@/components/common/TipTapRenderer', () => ({
  __esModule: true,
  default: ({ content }: { content: string }) => <div>{content}</div>,
}));

jest.mock('@/components/view/InlineGallery', () => ({
  __esModule: true,
  default: ({
    ariaLabel,
    media,
    sequenceMedia,
  }: {
    ariaLabel?: string;
    media: Array<{ mediaId: string }>;
    sequenceMedia?: Array<{ mediaId: string }>;
  }) => (
    <section
      data-testid="inline-gallery"
      aria-label={ariaLabel}
      data-media-ids={media.map((item) => item.mediaId).join(',')}
      data-sequence-ids={(sequenceMedia ?? media).map((item) => item.mediaId).join(',')}
    >Gallery</section>
  ),
}));

jest.mock('@/components/view/ReaderCardContextMeta', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('@/components/view/ReaderCardEditEntry', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock('@/components/common/JournalImage', () => ({
  __esModule: true,
  default: ({ alt, style, className }: { alt: string; style?: React.CSSProperties; className?: string }) => (
    <img alt={alt} style={style} className={className} />
  ),
}));

const mockedUseCardContext = useCardContext as jest.MockedFunction<typeof useCardContext>;
const mockedUseSearchParams = useSearchParams as jest.MockedFunction<typeof useSearchParams>;

const parentCard = {
  docId: 'parent-card',
  title: 'Parent Story',
  type: 'story',
  status: 'published',
  content: '<p>Parent content</p>',
} as Card;

const childCards = [
  {
    docId: 'child-card',
    title: 'Child Story',
    type: 'story',
    status: 'published',
  } as Card,
];

describe('CardDetailPage guided discovery contract', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedUseCardContext.mockReturnValue({
      readerMode: 'freeform',
      patchVisibleCard: jest.fn(),
    } as ReturnType<typeof useCardContext>);
  });

  it('marks a long open Question prompt for the shared proportional fit', () => {
    mockedUseSearchParams.mockReturnValue(new URLSearchParams('mode=freeform') as ReturnType<typeof useSearchParams>);
    const longQuestion = {
      ...parentCard,
      docId: 'long-question',
      type: 'qa',
      title: 'What was your relationship with your parents like when you were a child, teenager, or adult?',
    } as Card;

    const { container } = render(<CardDetailPage card={longQuestion} childrenCards={[]} />);
    expect(container.querySelector('[data-question-prompt-length="dense"]')).toBeTruthy();
  });

  it('suppresses generic discovery in guided mode while preserving structural child rail eligibility', () => {
    mockedUseSearchParams.mockReturnValue(new URLSearchParams('mode=guided') as ReturnType<typeof useSearchParams>);

    render(<CardDetailPage card={parentCard} childrenCards={childCards} />);

    expect(screen.getByRole('heading', { name: 'Parent Story' })).toBeInTheDocument();
    expect(screen.getByTestId('child-cards-rail')).toHaveTextContent('Children: 1');
    expect(screen.getByTestId('child-cards-rail')).toHaveAttribute('data-reader-mode', 'guided');
    expect(screen.queryByTestId('discovery-section')).not.toBeInTheDocument();
  });

  it('keeps generic discovery available in freeform mode', () => {
    mockedUseSearchParams.mockReturnValue(new URLSearchParams('mode=freeform') as ReturnType<typeof useSearchParams>);

    render(<CardDetailPage card={parentCard} childrenCards={childCards} />);

    expect(screen.getByTestId('child-cards-rail')).toBeInTheDocument();
    expect(screen.getByTestId('child-cards-rail')).toHaveAttribute('data-reader-mode', 'freeform');
    expect(screen.getByTestId('discovery-section')).toBeInTheDocument();
  });

  it('uses contain rendering on detail covers when the card cover mode is fit', () => {
    mockedUseSearchParams.mockReturnValue(new URLSearchParams('mode=freeform') as ReturnType<typeof useSearchParams>);

    render(
      <CardDetailPage
        card={{
          ...parentCard,
          title: 'Welcome wordmark',
          coverImageMode: 'fit',
          coverImage: {
            docId: 'media-1',
            storageUrl: 'https://example.com/welcome.jpg',
            width: 1800,
            height: 500,
          },
        } as Card}
        childrenCards={childCards}
      />
    );

    const image = screen.getByAltText('Welcome wordmark');
    expect(image).toHaveStyle({ objectFit: 'contain', objectPosition: 'center' });
  });

  it('matches the authored Compose crop for fill-mode detail covers', () => {
    mockedUseSearchParams.mockReturnValue(new URLSearchParams('mode=freeform') as ReturnType<typeof useSearchParams>);

    render(
      <CardDetailPage
        card={{
          ...parentCard,
          title: 'Portrait memory',
          coverImageMode: 'fill',
          coverImageFocalPoint: { x: 225, y: 800 },
          coverImage: {
            docId: 'media-2',
            storageUrl: 'https://example.com/portrait.jpg',
            width: 900,
            height: 1600,
          },
        } as Card}
        childrenCards={childCards}
      />
    );

    const image = screen.getByAltText('Portrait memory');
    expect(image).toHaveStyle({ objectFit: 'cover', objectPosition: '25% 50%' });
  });

  it('renders Callout detail in an emphasized panel with its full authored content', () => {
    mockedUseSearchParams.mockReturnValue(new URLSearchParams('mode=freeform') as ReturnType<typeof useSearchParams>);
    const content = '<ul><li>Music</li><li>Movies</li><li>Art</li><li>Books</li><li>Traditions</li></ul>';

    const { container } = render(
      <CardDetailPage
        card={{
          ...parentCard,
          docId: 'callout-1',
          type: 'callout',
          title: 'Culture',
          subtitle: 'The things that shaped us.',
          displayMode: 'static',
          content,
        } as Card}
        childrenCards={[]}
      />
    );

    expect(screen.getByRole('heading', { name: 'Culture' })).toBeInTheDocument();
    expect(screen.getByText('The things that shaped us.')).toBeInTheDocument();
    expect(screen.getByText(content)).toBeInTheDocument();
    expect(container.querySelector('[class*="calloutDetailPanel"]')).toBeTruthy();
    expect(container.querySelector('[class*="calloutDetailWatermark"]')).toBeTruthy();
  });

  it('orders a Story cover before its kicker, title, tags, and content', () => {
    mockedUseSearchParams.mockReturnValue(new URLSearchParams('mode=freeform') as ReturnType<typeof useSearchParams>);
    const { container } = render(
      <CardDetailPage
        card={{
          ...parentCard,
          coverImage: { docId: 'cover-1', storageUrl: 'https://example.com/cover.jpg' },
        } as Card}
        childrenCards={[]}
      />
    );

    const cover = screen.getByAltText('Parent Story');
    const kicker = screen.getByText('Story');
    const title = screen.getByRole('heading', { name: 'Parent Story' });
    const content = screen.getByText('<p>Parent content</p>');
    expect(cover.compareDocumentPosition(kicker)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    expect(kicker.compareDocumentPosition(title)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    expect(title.compareDocumentPosition(content)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    expect(container.querySelector('[class*="detailKicker"]')).toBeTruthy();
  });

  it('orders a Gallery viewer before its kicker, title, and optional content', () => {
    mockedUseSearchParams.mockReturnValue(new URLSearchParams('mode=freeform') as ReturnType<typeof useSearchParams>);
    render(
      <CardDetailPage
        card={{
          ...parentCard,
          docId: 'gallery-1',
          type: 'gallery',
          title: 'Family album',
          content: '<p>Album context</p>',
          galleryMedia: [{
            mediaId: 'image-1',
            order: 0,
            media: { docId: 'image-1', storageUrl: 'https://example.com/image.jpg' },
          }],
        } as Card}
        childrenCards={[]}
      />
    );

    const gallery = screen.getByTestId('inline-gallery');
    const kicker = document.querySelector('[class*="detailKicker"]');
    const title = screen.getByRole('heading', { name: 'Family album' });
    const content = screen.getByText('<p>Album context</p>');
    expect(gallery).toHaveAttribute('aria-label', 'Family album');
    expect(kicker).toHaveTextContent('Gallery');
    expect(gallery.compareDocumentPosition(kicker!)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    expect(kicker!.compareDocumentPosition(title)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    expect(title.compareDocumentPosition(content)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
  });

  it('uses the selected Gallery cover as hero and removes it from the remaining sequence', () => {
    mockedUseSearchParams.mockReturnValue(new URLSearchParams('mode=freeform') as ReturnType<typeof useSearchParams>);
    render(
      <CardDetailPage
        card={{
          ...parentCard,
          docId: 'gallery-dedupe',
          type: 'gallery',
          title: 'Selected hero album',
          coverImageId: 'image-2',
          coverImage: { docId: 'image-2', storageUrl: 'https://example.com/two.jpg' },
          galleryMedia: [1, 2, 3].map((number, index) => ({
            mediaId: `image-${number}`,
            order: index,
            media: { docId: `image-${number}`, storageUrl: `https://example.com/${number}.jpg` },
          })),
        } as Card}
        childrenCards={[]}
      />
    );

    const galleries = screen.getAllByTestId('inline-gallery');
    expect(galleries).toHaveLength(2);
    expect(galleries[0]).toHaveAttribute('data-media-ids', 'image-2');
    expect(galleries[1]).toHaveAttribute('data-media-ids', 'image-1,image-3');
    expect(galleries[1]).toHaveAttribute('data-sequence-ids', 'image-1,image-2,image-3');
  });

  it('removes a Story cover from its attached Gallery without dropping it from lightbox sequence truth', () => {
    mockedUseSearchParams.mockReturnValue(new URLSearchParams('mode=freeform') as ReturnType<typeof useSearchParams>);
    render(
      <CardDetailPage
        card={{
          ...parentCard,
          coverImageId: 'image-1',
          coverImage: { docId: 'image-1', storageUrl: 'https://example.com/one.jpg' },
          galleryMedia: [1, 2].map((number, index) => ({
            mediaId: `image-${number}`,
            order: index,
            media: { docId: `image-${number}`, storageUrl: `https://example.com/${number}.jpg` },
          })),
        } as Card}
        childrenCards={[]}
      />
    );

    const gallery = screen.getByTestId('inline-gallery');
    expect(gallery).toHaveAttribute('data-media-ids', 'image-2');
    expect(gallery).toHaveAttribute('data-sequence-ids', 'image-1,image-2');
  });
});
