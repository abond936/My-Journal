import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import V2ContentCard from '@/components/view/V2ContentCard';
import type { Card } from '@/lib/types/card';

jest.mock('next-auth/react', () => ({
  useSession: () => ({ data: { user: { role: 'admin' } } }),
}));

jest.mock('next/dynamic', () => ({
  __esModule: true,
  default: () =>
    function DynamicReaderCardEditEntry({
      children,
      onBeforeOpen,
      onCardSaved,
    }: {
      children: React.ReactNode;
      onBeforeOpen?: () => void;
      onCardSaved?: (savedCard: Card) => void;
    }) {
      return (
        <button
          type="button"
          onClick={() => {
            onBeforeOpen?.();
            onCardSaved?.({ docId: 'card-1', title: 'Updated', type: 'story', status: 'published' } as Card);
          }}
        >
          {children}
        </button>
      );
    },
}));

jest.mock('swiper/react', () => ({
  Swiper: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SwiperSlide: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
jest.mock('swiper/css', () => ({}), { virtual: true });

jest.mock('next/link', () => {
  function MockNextLink({ children, href, className }: React.ComponentProps<'a'>) {
    return (
      <a href={href} className={className}>
        {children}
      </a>
    );
  }

  MockNextLink.displayName = 'MockNextLink';
  return MockNextLink;
});

const patchVisibleCard = jest.fn();

jest.mock('@/components/providers/CardProvider', () => ({
  useCardContext: () => ({ readerMode: 'freeform', patchVisibleCard }),
}));

jest.mock('@/components/common/JournalImage', () => ({
  __esModule: true,
  default: function MockJournalImage({ alt }: { alt?: string }) {
    return <img alt={alt ?? ''} />;
  },
}));

describe('V2ContentCard admin edit entry', () => {
  beforeEach(() => {
    patchVisibleCard.mockReset();
  });

  it('renders feed edit affordance and reconciles saved cards into the feed cache', () => {
    const onBeforeNavigateToAdminEdit = jest.fn();

    render(
      <V2ContentCard
        card={
          {
            docId: 'card-1',
            title: 'Story title',
            type: 'story',
            status: 'published',
            displayMode: 'navigate',
            content: '<p>Body</p>',
          } as Card
        }
        onBeforeNavigateToAdminEdit={onBeforeNavigateToAdminEdit}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));

    expect(onBeforeNavigateToAdminEdit).toHaveBeenCalledTimes(1);
    expect(patchVisibleCard).toHaveBeenCalledWith(
      expect.objectContaining({ docId: 'card-1', title: 'Updated' })
    );
  });
});
