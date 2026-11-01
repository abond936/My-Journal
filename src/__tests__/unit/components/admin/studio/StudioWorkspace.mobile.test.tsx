import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import StudioWorkspace from '@/components/admin/studio/StudioWorkspace';

const mockRouterReplace = jest.fn();
let mockSearchParams = new URLSearchParams();
let mockSelectedCardId: string | null = null;
let mockSelectedCardType: 'story' | 'callout' = 'story';
const mockConfirmComposeLeave = jest.fn<Promise<boolean>, []>();
const mockRequestClearSelectedCard = jest.fn<Promise<boolean>, []>();

jest.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mockRouterReplace }),
  useSearchParams: () => mockSearchParams,
}));

jest.mock('@/components/providers/AppFeedbackProvider', () => ({
  useAppFeedback: () => ({
    confirm: jest.fn().mockResolvedValue(true),
    showSuccess: jest.fn(),
    showError: jest.fn(),
  }),
}));

jest.mock('@/components/providers/MediaProvider', () => ({
  useMedia: () => ({
    media: [],
    resolveMediaById: jest.fn(() => null),
    updateMedia: jest.fn(),
    deleteMedia: jest.fn(),
    reconcileCardMediaAssignments: jest.fn(),
    selectedMediaIds: new Set<string>(),
    setSelectedMediaIds: jest.fn(),
    toggleMediaSelection: jest.fn(),
    selectAll: jest.fn(),
    selectNone: jest.fn(),
  }),
}));

jest.mock('@/components/admin/studio/useStudioPaneLayout', () => ({
  useStudioPaneLayout: () => ({
    wideLayout: false,
    paneVisibility: {
      tagsCollapsed: false,
      collectionsCollapsed: false,
      cardsCollapsed: false,
      composeCollapsed: false,
      questionsCollapsed: false,
      mediaCollapsed: false,
    },
    setPaneVisibility: jest.fn(),
    studioRightColumnRef: { current: null },
    cardEditColumnRef: { current: null },
    questionsColumnRef: { current: null },
    bindStudioMediaCardRowRef: jest.fn(),
    togglePane: jest.fn(),
    embeddedRightSlotMinWidth: 720,
  }),
}));

jest.mock('@/components/admin/studio/useStudioSelectedCard', () => ({
  useStudioSelectedCard: () => ({
    selectedCardId: mockSelectedCardId,
    setSelectedCardId: jest.fn(),
    selectedPreview: mockSelectedCardId ? { docId: mockSelectedCardId, title: 'Selected', type: mockSelectedCardType } : null,
    setSelectedPreview: jest.fn(),
    selectedDetail: null,
    setSelectedDetail: jest.fn(),
    selectedPreviewRef: { current: null },
    selectedDetailRef: { current: null },
    selectedLoadState: mockSelectedCardId ? 'ready' : 'idle',
    cardLoading: false,
    cardError: null,
    setCardError: jest.fn(),
    setCardLoading: jest.fn(),
    selectCard: jest.fn(),
    requestSelectCard: jest.fn().mockResolvedValue(true),
    confirmComposeLeave: mockConfirmComposeLeave,
    requestClearSelectedCard: mockRequestClearSelectedCard,
    registerComposeLeaveGuard: jest.fn(),
    getKnownCardPreview: jest.fn(() => null),
    loadSelectedCard: jest.fn(),
    patchSelectedCard: jest.fn(),
    evictCard: jest.fn(),
    activeCardViewModel: {
      status: mockSelectedCardId ? 'preview' : 'empty',
      card: mockSelectedCardId ? { docId: mockSelectedCardId, title: 'Selected', type: mockSelectedCardType } : null,
      preview: null,
      detail: null,
      error: null,
    },
  }),
}));

jest.mock('@/components/admin/collections/CollectionsAdminClient', () => ({
  __esModule: true,
  default: (props: {
    embeddedTagsCollapsed?: boolean;
    embeddedCollectionsCollapsed?: boolean;
    embeddedCardsCollapsed?: boolean;
    embeddedRightSlotCollapsed?: boolean;
    embeddedUnparentedReplacement?: (context: Record<string, unknown>) => React.ReactNode;
    embeddedRightSlot?: React.ReactNode | ((context: Record<string, unknown>) => React.ReactNode);
  }) => {
    const context = {
      refreshStructure: jest.fn(),
      upsertCard: jest.fn(),
      removeCard: jest.fn(),
    };
    return (
      <div data-testid="collections-shell">
        {!props.embeddedTagsCollapsed ? <div data-testid="tags-pane" /> : null}
        {!props.embeddedCollectionsCollapsed ? <div data-testid="collections-pane" /> : null}
        {!props.embeddedCardsCollapsed ? props.embeddedUnparentedReplacement?.(context) : null}
        {!props.embeddedRightSlotCollapsed
          ? typeof props.embeddedRightSlot === 'function'
            ? props.embeddedRightSlot(context)
            : props.embeddedRightSlot
          : null}
      </div>
    );
  },
}));

jest.mock('@/components/admin/studio/StudioTreeCandidateCardBank', () => ({
  __esModule: true,
  default: () => <div data-testid="cards-pane" />,
}));

jest.mock('@/components/admin/studio/StudioCardEditPane', () => ({
  __esModule: true,
  default: () => <div data-testid="compose-pane" />,
}));

jest.mock('@/components/admin/studio/StudioQuestionsPane', () => ({
  __esModule: true,
  default: () => <div data-testid="prompts-pane" />,
}));

jest.mock('@/components/admin/studio/media/MediaAdminContent', () => ({
  __esModule: true,
  default: ({ initialReviewMediaId }: { initialReviewMediaId?: string | null }) => (
    <div data-testid="media-pane" data-review-media-id={initialReviewMediaId ?? undefined} />
  ),
}));

jest.mock('@/components/admin/studio/media/MediaEditModal', () => ({
  __esModule: true,
  default: ({ isOpen, selectedMediaId }: { isOpen: boolean; selectedMediaId: string | null }) =>
    isOpen ? <div data-testid="media-editor">{selectedMediaId}</div> : null,
}));

describe('StudioWorkspace mobile destinations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSearchParams = new URLSearchParams();
    mockSelectedCardId = null;
    mockSelectedCardType = 'story';
    mockConfirmComposeLeave.mockResolvedValue(true);
    mockRequestClearSelectedCard.mockResolvedValue(true);
    window.localStorage.clear();
  });

  it('starts with the Cards list and exposes all five labelled destinations', () => {
    render(<StudioWorkspace />);

    expect(screen.getByRole('heading', { name: 'Cards' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'New Card' })).toBeInTheDocument();
    expect(screen.getByTestId('cards-pane')).toBeInTheDocument();
    expect(screen.queryByTestId('compose-pane')).not.toBeInTheDocument();

    const navigation = screen.getByRole('navigation', { name: 'Author destinations' });
    expect(navigation).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cards' })).toHaveAttribute('aria-current', 'page');
    for (const label of ['Cards', 'Media', 'Prompts', 'Collections', 'Tags']) {
      expect(screen.getByRole('button', { name: label })).toBeInTheDocument();
    }
  });

  it('switches from Cards to the focused Media destination and updates the route', async () => {
    render(<StudioWorkspace />);
    fireEvent.click(screen.getByRole('button', { name: 'Media' }));

    await waitFor(() => expect(screen.getByRole('heading', { name: 'Media' })).toBeInTheDocument());
    expect(screen.getByTestId('media-pane')).toBeInTheDocument();
    expect(screen.queryByTestId('cards-pane')).not.toBeInTheDocument();
    expect(mockRouterReplace).toHaveBeenCalledWith('/admin/studio?destination=media');
  });

  it('opens a direct durable Collection handoff in the Collections destination', () => {
    mockSearchParams = new URLSearchParams('collection=my-life');
    render(<StudioWorkspace />);

    expect(screen.getByRole('heading', { name: 'Collections' })).toBeInTheDocument();
    expect(screen.getByTestId('collections-pane')).toBeInTheDocument();
    expect(screen.queryByTestId('cards-pane')).not.toBeInTheDocument();
  });

  it('opens an exact Media handoff in the Media destination and editor', async () => {
    mockSearchParams = new URLSearchParams('destination=media&media=media-1');
    const fetchMock = jest.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ media: { docId: 'media-1', filename: 'beach.jpg' } }),
    } as Response);
    Object.defineProperty(global, 'fetch', { value: fetchMock, writable: true, configurable: true });

    render(<StudioWorkspace />);

    expect(screen.getByRole('heading', { name: 'Media' })).toBeInTheDocument();
    expect(await screen.findByTestId('media-editor')).toHaveTextContent('media-1');
    expect(fetchMock).toHaveBeenCalledWith('/api/images/media-1', expect.objectContaining({
      cache: 'no-store',
    }));
    delete (global as typeof globalThis & { fetch?: typeof fetch }).fetch;
  });

  it('opens an exact Media classification handoff in the review surface', () => {
    mockSearchParams = new URLSearchParams('destination=media&mediaReview=media-2');

    render(<StudioWorkspace />);

    expect(screen.getByRole('heading', { name: 'Media' })).toBeInTheDocument();
    expect(screen.getByTestId('media-pane')).toHaveAttribute('data-review-media-id', 'media-2');
  });

  it('keeps a dirty Compose surface in place when the leave guard declines', async () => {
    mockSelectedCardId = 'card-1';
    mockSelectedCardType = 'callout';
    mockConfirmComposeLeave.mockResolvedValue(false);
    render(<StudioWorkspace />);

    expect(screen.getByTestId('compose-pane')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Back to Cards' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Media' }));

    await waitFor(() => expect(mockConfirmComposeLeave).toHaveBeenCalledTimes(1));
    expect(screen.getByTestId('compose-pane')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cards' })).toHaveAttribute('aria-current', 'page');
    expect(mockRouterReplace).not.toHaveBeenCalled();
  });

  it('gives mobile Story Compose the full screen and keeps Back to Cards as the guarded exit', async () => {
    mockSelectedCardId = 'story-1';
    mockRequestClearSelectedCard.mockResolvedValue(false);
    render(<StudioWorkspace />);

    expect(screen.getByTestId('compose-pane')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Back to Cards' })).toBeInTheDocument();
    expect(screen.queryByRole('navigation', { name: 'Author destinations' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Back to Cards' }));

    await waitFor(() => expect(mockRequestClearSelectedCard).toHaveBeenCalledTimes(1));
    expect(screen.getByTestId('compose-pane')).toBeInTheDocument();
    expect(mockRouterReplace).not.toHaveBeenCalled();
  });
});
