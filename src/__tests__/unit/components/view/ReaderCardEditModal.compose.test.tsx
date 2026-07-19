import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import useSWR from 'swr';
import ReaderCardEditModal from '@/components/view/ReaderCardEditModal';

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    refresh: jest.fn(),
  }),
  usePathname: () => '/view/card-1',
  useSearchParams: () => new URLSearchParams(),
}));

jest.mock('next-auth/react', () => ({
  useSession: () => ({ data: { user: { role: 'admin' } } }),
}));

jest.mock('swr', () => ({
  __esModule: true,
  default: jest.fn(),
  mutate: jest.fn(),
}));

jest.mock('@/components/providers/AppFeedbackProvider', () => ({
  useAppFeedback: () => ({
    confirm: async () => true,
    alert: async () => undefined,
    showError: jest.fn(),
  }),
}));

jest.mock('@/components/providers/CardProvider', () => ({
  useOptionalCardContext: () => null,
  useCardContext: () => ({
    selectedTags: [],
    readerMode: 'freeform',
    patchVisibleCard: jest.fn(),
  }),
}));

jest.mock('@/components/providers/TagProvider', () => ({
  useTag: () => ({ tags: [] }),
}));

jest.mock('swiper/react', () => ({
  Swiper: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SwiperSlide: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
jest.mock('swiper/css', () => ({}), { virtual: true });

jest.mock('@/components/common/RichTextEditor', () => ({
  __esModule: true,
  default: React.forwardRef(function MockRichTextEditor() {
    return <div data-testid="mock-rich-text-editor">Editor</div>;
  }),
}));

const mockedUseSWR = useSWR as jest.Mock;

describe('ReaderCardEditModal compose integration', () => {
  beforeEach(() => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        settings: {
          galleryTagInheritance: { who: true, what: true, when: true, where: true },
          galleryTagInheritanceConfigured: true,
        },
      }),
    }) as jest.Mock;
    mockedUseSWR.mockImplementation((key: string | null) => {
      if (key === '/api/cards/card-1?children=skip') {
        return {
          data: {
            docId: 'card-1',
            title: 'Reader Story',
            type: 'story',
            status: 'published',
            displayMode: 'navigate',
            content: '<p>Hello</p>',
            galleryMedia: [],
            tags: [],
            createdAt: 1,
            updatedAt: 1,
          },
          mutate: jest.fn(),
        };
      }

      if (key === '/api/tags') {
        return {
          data: [],
        };
      }

      return { data: null };
    });
  });

  afterEach(() => {
    mockedUseSWR.mockReset();
  });

  it('renders the real compose form in controlled mode', async () => {
    render(
      <ReaderCardEditModal
        cardId="card-1"
        returnTo="/view/card-1"
        open
        onOpenChange={jest.fn()}
        renderTrigger={false}
      />
    );

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Card Title')).toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: 'Add from library' })).toBeInTheDocument();
  });
});
