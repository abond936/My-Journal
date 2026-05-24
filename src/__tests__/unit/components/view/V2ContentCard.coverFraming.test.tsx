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
  return ({ children, href, className, onClick, ...rest }: React.ComponentProps<'a'>) => (
    <a href={href} className={className} onClick={onClick} {...rest}>
      {children}
    </a>
  );
});

jest.mock('@/components/providers/CardProvider', () => ({
  useCardContext: () => ({ readerMode: 'freeform' }),
}));

jest.mock('@/components/providers/TagProvider', () => ({
  useTag: () => ({ tags: [] }),
}));

jest.mock('@/components/common/JournalImage', () => ({
  __esModule: true,
  default: ({ alt, style, className }: { alt: string; style?: React.CSSProperties; className?: string }) => (
    <img alt={alt} style={style} className={className} />
  ),
}));

jest.mock('@/components/common/TipTapRenderer', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('@/components/view/ReaderCardContextMeta', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('@/components/view/ReaderCardEditModal', () => ({
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

  it('uses a portrait-oriented frame for portrait covers in the reader feed', () => {
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
    expect(image.parentElement).toHaveStyle({ aspectRatio: '4/5' });
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
});
