import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import useSWR from 'swr';
import ReaderCardEditModal from '@/components/view/ReaderCardEditModal';
import { useMedia } from '@/components/providers/MediaProvider';

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    refresh: jest.fn(),
  }),
  usePathname: () => '/view',
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
  }),
}));

jest.mock('@/components/providers/TagProvider', () => ({
  useTag: () => ({ tags: [] }),
}));

jest.mock('@/components/providers/CardFormProvider', () => ({
  CardFormProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useCardForm: () => ({
    confirmLeaveIfDirtyAsync: async () => true,
    isDirty: false,
    resetForm: () => undefined,
    syncPersistableBaseline: () => undefined,
    formState: { isSaving: false },
  }),
}));

jest.mock('@/components/authoring/CardFormSurfaceContext', () => ({
  CardFormSurfaceProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock('@/components/admin/studio/cards/CardForm', () => ({
  __esModule: true,
  default: function MockCardForm() {
    useMedia();
    return <div>Reader compose ready</div>;
  },
}));

const mockedUseSWR = useSWR as jest.Mock;

describe('ReaderCardEditModal', () => {
  beforeEach(() => {
    mockedUseSWR.mockImplementation((key: string | null) => {
      if (key === '/api/cards/card-1?children=skip') {
        return {
          data: {
            docId: 'card-1',
            title: 'Reader Story',
            type: 'story',
            status: 'published',
            displayMode: 'navigate',
            content: '',
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

  it('provides media context to the reader compose form', () => {
    render(
      <ReaderCardEditModal cardId="card-1" returnTo="/view/card-1">
        Edit
      </ReaderCardEditModal>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));

    expect(screen.getByText('Reader compose ready')).toBeInTheDocument();
  });

  it('opens in controlled mode without a trigger button', async () => {
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
      expect(screen.getByText('Reader compose ready')).toBeInTheDocument();
    });
  });
});
