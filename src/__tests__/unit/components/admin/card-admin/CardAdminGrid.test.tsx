import React from 'react';
import { render, screen } from '@testing-library/react';
import CardAdminGrid from '@/components/admin/card-admin/CardAdminGrid';
import type { Card } from '@/lib/types/card';

const dragListeners = {
  onPointerDown: jest.fn(),
};

const mockChrome = jest.fn();

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
  default: () => <div data-testid="journal-image" />,
}));

jest.mock('@/components/admin/common/CardDimensionalTagCommandBar', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('@/components/admin/common/DimensionalTagVerticalChips', () => ({
  __esModule: true,
  default: () => null,
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
});
