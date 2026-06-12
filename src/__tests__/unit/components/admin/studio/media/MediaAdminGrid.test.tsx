import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import MediaAdminGrid from '@/components/admin/studio/media/MediaAdminGrid';
import type { Media } from '@/lib/types/photo';

const updateMedia = jest.fn(async () => true);

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
}));

jest.mock('@/components/providers/MediaProvider', () => ({
  useMedia: () => ({
    media: [
      {
        docId: 'media-1',
        filename: 'family.jpg',
        width: 1600,
        height: 900,
        size: 1024,
        contentType: 'image/jpeg',
        storageUrl: 'https://example.com/family.jpg',
        storagePath: 'images/family.jpg',
        caption: 'Short caption',
        tags: [],
        who: [],
        what: [],
        when: [],
        where: [],
        referencedByCardIds: [],
        source: 'local',
        sourcePath: '/family.jpg',
        objectPosition: '50% 50%',
        createdAt: 1,
        updatedAt: 1,
      },
    ] satisfies Media[],
    selectedMediaIds: [],
    setSelectedMediaIds: jest.fn(),
    updateMedia,
    deleteMedia: jest.fn(async () => undefined),
  }),
}));

jest.mock('@/components/providers/TagProvider', () => ({
  useTag: () => ({ tags: [] }),
}));

jest.mock('@/components/providers/AppFeedbackProvider', () => ({
  useAppFeedback: () => ({
    confirm: jest.fn(async () => false),
    showError: jest.fn(),
  }),
}));

jest.mock('@/components/common/JournalImage', () => ({
  __esModule: true,
  default: () => <div data-testid="journal-image" />,
}));

jest.mock('@/components/admin/common/DimensionalTagVerticalChips', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('@/components/admin/common/CardDimensionalTagCommandBar', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('@/components/admin/studio/media/MediaEditModal', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('@/components/admin/studio/media/MediaLinkedCardsModal', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('@/components/admin/studio/media/useMediaReferenceSummaries', () => ({
  __esModule: true,
  default: () => ({}),
}));

jest.mock('@/components/admin/studio/StudioShellContext', () => ({
  useStudioShellOptional: () => null,
}));

jest.mock('@/lib/utils/photoUtils', () => ({
  getDisplayUrl: () => '/test.jpg',
  getStudioDisplayUrl: () => '/test-studio.jpg',
}));

jest.mock('@/components/admin/common/AdminGridCellChrome', () => ({
  __esModule: true,
  default: (props: Record<string, unknown>) => (
    <div data-testid="media-grid-root">
      {props.thumbnail as React.ReactNode}
      {props.belowThumbnail as React.ReactNode}
    </div>
  ),
}));

const DEFAULT_DIMENSION_FILTERS = {
  who: { mode: 'any' as const, tagId: '' },
  what: { mode: 'any' as const, tagId: '' },
  when: { mode: 'any' as const, tagId: '' },
  where: { mode: 'any' as const, tagId: '' },
};

describe('MediaAdminGrid', () => {
  beforeEach(() => {
    updateMedia.mockClear();
  });

  it('starts inline captions at one row', () => {
    render(
      <MediaAdminGrid
        dimensionFilters={DEFAULT_DIMENSION_FILTERS}
        inlineCaptionEditing
      />
    );

    const input = screen.getByTestId('media-inline-caption-media-1') as HTMLTextAreaElement;
    expect(input.rows).toBe(1);
  });

  it('grows the inline caption field when the caption wraps beyond one row', () => {
    render(
      <MediaAdminGrid
        dimensionFilters={DEFAULT_DIMENSION_FILTERS}
        inlineCaptionEditing
      />
    );

    const input = screen.getByTestId('media-inline-caption-media-1') as HTMLTextAreaElement;

    Object.defineProperty(input, 'offsetHeight', { configurable: true, value: 24 });
    Object.defineProperty(input, 'clientHeight', { configurable: true, value: 24 });
    Object.defineProperty(input, 'scrollHeight', { configurable: true, value: 64 });

    fireEvent.change(input, { target: { value: 'This caption is long enough to wrap to multiple lines in the inline editor.' } });

    expect(input.style.height).toBe('64px');
  });
});
