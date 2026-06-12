/* eslint-disable @next/next/no-img-element */
import React from 'react';
import { render, screen } from '@testing-library/react';
import V2ContentCard from '@/components/view/V2ContentCard';
import type { Card } from '@/lib/types/card';

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
    onClick,
    ...rest
  }: React.ComponentProps<'a'>) {
    return (
      <a href={href} className={className} onClick={onClick} {...rest}>
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

jest.mock('@/components/providers/TagProvider', () => ({
  useTag: () => ({ tags: [] }),
}));

jest.mock('@/components/common/JournalImage', () => ({
  __esModule: true,
  default: function MockJournalImage({
    alt,
    style,
    className,
  }: {
    alt: string;
    style?: React.CSSProperties;
    className?: string;
  }) {
    return <img alt={alt} style={style} className={className} />;
  },
}));

jest.mock('@/components/common/TipTapStaticContent', () => ({
  __esModule: true,
  default: ({ content }: { content?: unknown }) => (
    <div data-testid="tiptap-static-content">{typeof content === 'string' ? content : JSON.stringify(content ?? null)}</div>
  ),
}));

jest.mock('@/components/common/TipTapRenderer', () => ({
  __esModule: true,
  default: ({ content }: { content?: unknown }) => (
    <div data-testid="tiptap-content">{typeof content === 'string' ? content : JSON.stringify(content ?? null)}</div>
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

const baseCard = {
  docId: 'card-1',
  title: 'Landscape story',
  type: 'story',
  status: 'published',
  displayMode: 'navigate',
  subtitle: 'Supporting line',
  coverImageFocalPoint: { x: 800, y: 400 },
} as Card;

describe('V2ContentCard cover framing', () => {
  it('uses a landscape-oriented frame for landscape covers in the reader feed', () => {
    render(
      <V2ContentCard
        card={{
          ...baseCard,
          coverImage: {
            docId: 'media-1',
            storageUrl: 'https://example.com/landscape.jpg',
            width: 1600,
            height: 900,
          },
        }}
      />
    );

    const image = screen.getByAltText('Landscape story');
    expect(image.parentElement).toHaveStyle({ aspectRatio: '3/2' });
    expect(image).toHaveStyle({ objectPosition: '50% 50%' });
  });

  it('collapses closed-story portrait covers into the shorter landscape-style frame', () => {
    render(
      <V2ContentCard
        card={{
          ...baseCard,
          title: 'Portrait story',
          coverImageFocalPoint: { x: 400, y: 800 },
          coverImage: {
            docId: 'media-2',
            storageUrl: 'https://example.com/portrait.jpg',
            width: 900,
            height: 1600,
          },
        }}
      />
    );

    const image = screen.getByAltText('Portrait story');
    expect(image.parentElement).toHaveStyle({ aspectRatio: '3/2' });
  });

  it('uses the same shorter frame for closed-story placeholder covers', () => {
    render(
      <V2ContentCard
        card={{
          ...baseCard,
          title: 'Placeholder story',
          coverImage: undefined,
          coverImageFocalPoint: undefined,
        }}
      />
    );

    const title = screen.getByText('Placeholder story');
    const imageContainer = title.closest('a')?.querySelector('.imageContainer');
    expect(imageContainer).toHaveStyle({ aspectRatio: '3/2' });
  });

  it('uses contain rendering when the card cover mode is fit', () => {
    render(
      <V2ContentCard
        card={{
          ...baseCard,
          title: 'Welcome wordmark',
          coverImageMode: 'fit',
          coverImage: {
            docId: 'media-3',
            storageUrl: 'https://example.com/welcome.jpg',
            width: 1800,
            height: 500,
          },
        }}
      />
    );

    const image = screen.getByAltText('Welcome wordmark');
    expect(image.parentElement).toHaveStyle({ aspectRatio: '3/2' });
    expect(image).toHaveStyle({ objectFit: 'contain', objectPosition: 'center' });
  });

  it('uses static inline content rendering for closed QA tiles in inline display mode', () => {
    render(
      <V2ContentCard
        card={{
          ...baseCard,
          type: 'qa',
          displayMode: 'inline',
          content: '<p>Inline QA body</p>',
        }}
      />
    );

    expect(screen.getByTestId('tiptap-static-content')).toHaveTextContent('<p>Inline QA body</p>');
    expect(screen.queryByTestId('tiptap-content')).not.toBeInTheDocument();
  });

  it('renders closed quote tiles from the title instead of rich-text body content', () => {
    render(
      <V2ContentCard
        card={{
          ...baseCard,
          title: 'Quoted title',
          type: 'quote',
          displayMode: 'static',
          content: 'Quote body from rich text',
        }}
      />
    );

    expect(screen.getByText('Quoted title')).toBeInTheDocument();
    expect(screen.queryByText('Quote body from rich text')).not.toBeInTheDocument();
  });

  it('keeps closed callout tiles on rich-text body content', () => {
    render(
      <V2ContentCard
        card={{
          ...baseCard,
          title: 'Callout title',
          type: 'callout',
          displayMode: 'static',
          content: 'Callout body from rich text',
        }}
      />
    );

    expect(screen.getByText('Callout title')).toBeInTheDocument();
    expect(screen.getByText('Callout body from rich text')).toBeInTheDocument();
  });

  it('forces closed quote and callout tiles onto the utility portrait frame even when cover metadata exists', () => {
    const { container } = render(
      <>
        <V2ContentCard
          card={{
            ...baseCard,
            docId: 'quote-with-cover',
            title: 'Covered quote',
            type: 'quote',
            displayMode: 'static',
            content: 'Ignored quote body',
            coverImage: {
              docId: 'media-quote-cover',
              storageUrl: 'https://example.com/quote-cover.jpg',
              width: 1600,
              height: 900,
            },
          }}
        />
        <V2ContentCard
          card={{
            ...baseCard,
            docId: 'callout-with-cover',
            title: 'Covered callout',
            type: 'callout',
            displayMode: 'static',
            content: 'Visible callout body',
            coverImage: {
              docId: 'media-callout-cover',
              storageUrl: 'https://example.com/callout-cover.jpg',
              width: 1600,
              height: 900,
            },
          }}
        />
      </>
    );

    const quoteCard = container.querySelector('[data-card-id="quote-with-cover"]');
    const calloutCard = container.querySelector('[data-card-id="callout-with-cover"]');

    expect(quoteCard?.className).toContain('closedFeedPortrait');
    expect(quoteCard?.className).not.toContain('closedFeedLandscape');
    expect(calloutCard?.className).toContain('closedFeedPortrait');
    expect(calloutCard?.className).not.toContain('closedFeedLandscape');
  });
});
