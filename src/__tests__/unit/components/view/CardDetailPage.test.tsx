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
  default: ({ cards }: { cards: Card[] }) => (
    <section data-testid="child-cards-rail">Children: {cards.length}</section>
  ),
}));

jest.mock('@/components/common/TipTapRenderer', () => ({
  __esModule: true,
  default: ({ content }: { content: string }) => <div>{content}</div>,
}));

jest.mock('@/components/view/InlineGallery', () => ({
  __esModule: true,
  default: () => <section data-testid="inline-gallery">Gallery</section>,
}));

jest.mock('@/components/view/ReaderCardContextMeta', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('@/components/view/ReaderCardEditModal', () => ({
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
    } as ReturnType<typeof useCardContext>);
  });

  it('suppresses generic discovery in guided mode while preserving structural child rail eligibility', () => {
    mockedUseSearchParams.mockReturnValue(new URLSearchParams('mode=guided') as ReturnType<typeof useSearchParams>);

    render(<CardDetailPage card={parentCard} childrenCards={childCards} />);

    expect(screen.getByRole('heading', { name: 'Parent Story' })).toBeInTheDocument();
    expect(screen.getByTestId('child-cards-rail')).toHaveTextContent('Children: 1');
    expect(screen.queryByTestId('discovery-section')).not.toBeInTheDocument();
  });

  it('keeps generic discovery available in freeform mode', () => {
    mockedUseSearchParams.mockReturnValue(new URLSearchParams('mode=freeform') as ReturnType<typeof useSearchParams>);

    render(<CardDetailPage card={parentCard} childrenCards={childCards} />);

    expect(screen.getByTestId('child-cards-rail')).toBeInTheDocument();
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
});
