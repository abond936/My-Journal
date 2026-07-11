import React from 'react';
import { render, screen } from '@testing-library/react';
import CardAdminGrid from '@/components/admin/studio/cards/CardAdminGrid';
import type { Card } from '@/lib/types/card';

const dragListeners = {
  onPointerDown: jest.fn(),
};

const mockChrome = jest.fn();
const mockJournalImage = jest.fn();

jest.mock('@dnd-kit/core', () => ({
  useDraggable: () => ({
    attributes: { 'data-drag-handle': 'true' },
    listeners: dragListeners,
    setActivatorNodeRef: jest.fn(),
    setNodeRef: jest.fn(),
    isDragging: false,
    transform: null,
  }),
  useDroppable: () => ({
    setNodeRef: jest.fn(),
  }),
  useDndContext: () => ({
    active: {
      data: {
        current: {
          domain: 'collections',
          kind: 'card',
          cardId: 'dragging-card',
        },
      },
    },
  }),
}));

jest.mock('@dnd-kit/utilities', () => ({
  CSS: {
    Translate: {
      toString: () => '',
    },
  },
}));

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
}));

jest.mock('@/components/common/JournalImage', () => ({
  __esModule: true,
  default: (props: Record<string, unknown>) => {
    mockJournalImage(props);
    return <div data-testid="journal-image" />;
  },
}));

jest.mock('@/components/common/TipTapRenderer', () => ({
  __esModule: true,
  default: ({ content }: { content?: unknown }) => (
    <div data-testid="tiptap-content">{typeof content === 'string' ? content : JSON.stringify(content ?? null)}</div>
  ),
}));

jest.mock('@/components/admin/common/CardDimensionalTagCommandBar', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('@/components/admin/common/DimensionalTagVerticalChips', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('@/components/view/FeedTileChipStrip', () => ({
  __esModule: true,
  default: () => <div data-testid="feed-tile-chip-strip" />,
}));

jest.mock('@/components/admin/studio/cards/AdminClosedCardTileShell', () => ({
  __esModule: true,
  default: (props: Record<string, unknown>) => {
    mockJournalImage({
      style: {
        objectFit: props.previewObjectFit,
        objectPosition: props.previewObjectPosition,
      },
    });
    return (
      <div data-testid="admin-closed-tile-shell">
        {(props.card as { title?: string })?.title}
      </div>
    );
  },
}));

jest.mock('@/components/providers/AppFeedbackProvider', () => ({
  useAppFeedback: () => ({
    showToast: jest.fn(),
    showSuccess: jest.fn(),
    showError: jest.fn(),
  }),
}));

jest.mock('@/lib/utils/cardDeleteWarnings', () => ({
  buildSingleCardDeletePrompt: () => 'Delete?',
  fetchCardDeleteParents: async () => ({ parentTitles: [], verificationFailed: false }),
}));

jest.mock('@/lib/utils/photoUtils', () => ({
  getDisplayUrl: () => '/test.jpg',
  getStudioDisplayUrl: () => '/test-studio.jpg',
}));

jest.mock('@/lib/hooks/useDefaultDndSensors', () => ({
  DND_POINTER_IGNORE_ATTR: 'data-dnd-pointer-ignore',
}));

jest.mock('@/components/admin/common/AdminGridCellChrome', () => ({
  __esModule: true,
  default: (props: Record<string, unknown>) => {
    mockChrome(props);
    return (
      <div data-testid="grid-root">
        <div {...(props.rootProps as Record<string, unknown> | undefined)}>
          {props.thumbnail as React.ReactNode}
          {props.belowThumbnail as React.ReactNode}
        </div>
        {props.overlayTopEnd as React.ReactNode}
      </div>
    );
  },
}));

describe('CardAdminGrid', () => {
  const baseCard: Card = {
    docId: 'card-1',
    title: 'Card One',
    title_lowercase: 'card one',
    status: 'draft',
    type: 'story',
    displayMode: 'navigate',
    tags: [],
    who: [],
    what: [],
    when: [],
    where: [],
    childrenIds: [],
    galleryMedia: [],
    coverImage: null,
  } as Card;

  beforeEach(() => {
    mockChrome.mockClear();
    mockJournalImage.mockClear();
    dragListeners.onPointerDown.mockClear();
  });

  it('registers Studio curated-tree drag on the full grid tile instead of requiring a handle', () => {
    render(
      <CardAdminGrid
        cards={[baseCard]}
        selectedCardIds={new Set()}
        allTags={[]}
        onSelectCard={jest.fn()}
        onSelectAll={jest.fn()}
        onSaveScrollPosition={jest.fn()}
        onUpdateCard={jest.fn(async () => {})}
        onDeleteCard={jest.fn(async () => {})}
        studioCuratedTreeDrag
        studioEmbedCellClickSelects
      />
    );

    expect(screen.queryByRole('button', { name: 'Drag into curated tree' })).not.toBeInTheDocument();

    const chromeProps = mockChrome.mock.calls.at(-1)?.[0] as {
      rootProps?: Record<string, unknown>;
    };

    expect(chromeProps.rootProps).toBeDefined();
    expect(chromeProps.rootProps).toHaveProperty('onPointerDown');
  });

  it('renders a reader-style question utility preview in the Studio compact grid', () => {
    render(
      <CardAdminGrid
        cards={[{ ...baseCard, type: 'qa', title: 'Question prompt', coverImage: null }]}
        selectedCardIds={new Set()}
        allTags={[]}
        onSelectCard={jest.fn()}
        onSelectAll={jest.fn()}
        onSaveScrollPosition={jest.fn()}
        onUpdateCard={jest.fn(async () => {})}
        onDeleteCard={jest.fn(async () => {})}
        studioEmbedCellClickSelects
        compactStudioGrid
      />
    );

    expect(screen.queryByText('No cover')).not.toBeInTheDocument();
    expect(screen.getByText('Question prompt')).toBeInTheDocument();
  });

  it('renders a reader-style quote utility preview even when cover metadata exists', () => {
    render(
      <CardAdminGrid
        cards={[
          {
            ...baseCard,
            type: 'quote',
            title: 'Quoted title',
            coverImage: {
              docId: 'media-1',
              storageUrl: 'https://example.com/quote-cover.jpg',
              width: 1600,
              height: 900,
            },
          },
        ]}
        selectedCardIds={new Set()}
        allTags={[]}
        onSelectCard={jest.fn()}
        onSelectAll={jest.fn()}
        onSaveScrollPosition={jest.fn()}
        onUpdateCard={jest.fn(async () => {})}
        onDeleteCard={jest.fn(async () => {})}
        studioEmbedCellClickSelects
        compactStudioGrid
      />
    );

    expect(screen.queryByText('No cover')).not.toBeInTheDocument();
    expect(screen.queryByTestId('journal-image')).not.toBeInTheDocument();
    expect(screen.getByText('Quoted title')).toBeInTheDocument();
  });

  it('renders a reader-style callout utility preview with visible body content', () => {
    render(
      <CardAdminGrid
        cards={[
          {
            ...baseCard,
            type: 'callout',
            title: 'Callout title',
            content: 'Callout body from rich text',
          } as Card,
        ]}
        selectedCardIds={new Set()}
        allTags={[]}
        onSelectCard={jest.fn()}
        onSelectAll={jest.fn()}
        onSaveScrollPosition={jest.fn()}
        onUpdateCard={jest.fn(async () => {})}
        onDeleteCard={jest.fn(async () => {})}
        studioEmbedCellClickSelects
        compactStudioGrid
      />
    );

    expect(screen.queryByText('No cover')).not.toBeInTheDocument();
    expect(screen.getByTestId('admin-closed-tile-shell')).toBeInTheDocument();
    expect(screen.getByText('Callout title')).toBeInTheDocument();
  });

  it('applies cover focal-point positioning to Studio compact-grid thumbnails', () => {
    render(
      <CardAdminGrid
        cards={[
          {
            ...baseCard,
            title: 'Focused cover',
            coverImageMode: 'fill',
            coverImageFocalPoint: { x: 1600, y: 200 },
            coverImage: {
              docId: 'media-1',
              storageUrl: 'https://example.com/focused-cover.jpg',
              width: 2000,
              height: 1000,
              objectPosition: '50% 50%',
            },
          } as Card,
        ]}
        selectedCardIds={new Set()}
        allTags={[]}
        onSelectCard={jest.fn()}
        onSelectAll={jest.fn()}
        onSaveScrollPosition={jest.fn()}
        onUpdateCard={jest.fn(async () => {})}
        onDeleteCard={jest.fn(async () => {})}
        studioEmbedCellClickSelects
        compactStudioGrid
      />
    );

    const imageProps = mockJournalImage.mock.calls.at(-1)?.[0] as {
      style?: { objectFit?: string; objectPosition?: string };
    };

    expect(imageProps.style?.objectFit).toBe('cover');
    expect(imageProps.style?.objectPosition).not.toBe('50% 50%');
  });
});
