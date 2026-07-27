import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import BulkEditMediaTagsModal from '@/components/admin/studio/media/BulkEditMediaTagsModal';
import type { Media } from '@/lib/types/photo';
import type { Tag } from '@/lib/types/tag';

const bulkApplyTags = jest.fn(async () => undefined);
const media: Media[] = [];
const tagCatalog: Tag[] = [
  { docId: 'alan', name: 'Alan', dimension: 'who', path: [] },
  { docId: 'when-assigned', name: '1957', dimension: 'when', path: [] },
  ...Array.from({ length: 125 }, (_, index) => ({
    docId: `when-unassigned-${index}`,
    name: `Unused ${index}`,
    dimension: 'when' as const,
    path: [],
  })),
];
const mockResolveMediaById = (id: string) => media.find((item) => item.docId === id);

jest.mock('@/components/providers/TagProvider', () => ({
  useTag: () => ({
    tags: tagCatalog,
    loading: false,
  }),
}));

jest.mock('@/components/providers/MediaProvider', () => ({
  useMedia: () => ({
    media,
    resolveMediaById: mockResolveMediaById,
    bulkApplyTags,
  }),
}));

jest.mock('@/components/common/LoadingSpinner', () => ({
  __esModule: true,
  default: () => <div>Loading</div>,
}));

jest.mock('@/components/admin/studio/cards/TagPickerDimensionColumn', () => ({
  __esModule: true,
  default: ({
    dimension,
    getSelectionState,
    onToggleTag,
    hideHeader,
    showManagementControls,
  }: {
    dimension: { dimension?: string };
    getSelectionState: (id: string) => 'checked' | 'unchecked' | 'mixed';
    onToggleTag: (id: string, state: 'checked' | 'unchecked' | 'mixed') => void;
    hideHeader?: boolean;
    showManagementControls?: boolean;
  }) => (
    <section
      data-dimension={dimension.dimension}
      data-management={showManagementControls ? 'shown' : 'hidden'}
    >
      {hideHeader ? null : <h4>{dimension.dimension}</h4>}
      {dimension.dimension === 'who' ? (
        <button type="button" onClick={() => onToggleTag('alan', getSelectionState('alan'))}>
          Toggle Alan
        </button>
      ) : null}
    </section>
  ),
}));

describe('BulkEditMediaTagsModal', () => {
  beforeEach(() => {
    bulkApplyTags.mockClear();
    media.splice(0, media.length, {
      docId: 'media-1',
      filename: 'family.jpg',
      tags: [],
      subjectTagIds: [],
    } as Media);
  });

  it('applies tag and Subject decisions in one authoritative request', async () => {
    render(
      <BulkEditMediaTagsModal
        mediaIds={['media-1']}
        isOpen
        onClose={jest.fn()}
        onSave={jest.fn(async () => undefined)}
      />
    );

    await waitFor(() => expect(screen.getByRole('button', { name: 'Toggle Alan' })).toBeInTheDocument());
    expect(screen.getByRole('heading', { name: 'Media Tags' })).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Search tags...')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Who' }).querySelector('.lucide-user')).toBeInTheDocument();
    expect(screen.getByText('(Choose assigned tags or a Known date as subjects.)')).toBeInTheDocument();
    expect(document.querySelectorAll('[data-subject-dimension]')).toHaveLength(4);
    expect(document.querySelector('[data-dimension="who"]')).toHaveAttribute('data-management', 'hidden');
    expect(document.querySelector('[data-dimension="when"]')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Year')).toBeInTheDocument();
    expect(screen.queryByRole('radio', { name: 'Unreviewed' })).not.toBeInTheDocument();
    expect(screen.queryByPlaceholderText('New tag')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Tag selection states')).toHaveTextContent('Legend:EmptySomeAll');
    fireEvent.click(screen.getByRole('button', { name: 'Toggle Alan' }));
    const subject = await screen.findByRole('checkbox', { name: 'Alan' });
    fireEvent.click(subject);
    fireEvent.click(screen.getByRole('button', { name: 'Apply' }));

    await waitFor(() => {
      expect(bulkApplyTags).toHaveBeenCalledTimes(1);
      expect(bulkApplyTags).toHaveBeenCalledWith(['media-1'], {
        addTagIds: ['alan'],
        removeTagIds: [],
        addSubjectTagIds: ['alan'],
        removeSubjectTagIds: [],
      });
    });
  });

  it('persists independent Reviewed and mutually exclusive resolution decisions', async () => {
    render(
      <BulkEditMediaTagsModal
        mediaIds={['media-1']}
        isOpen
        onClose={jest.fn()}
        onSave={jest.fn(async () => undefined)}
      />
    );

    fireEvent.click(await screen.findByRole('checkbox', { name: 'who reviewed' }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'where unknown' }));
    expect(screen.getByRole('checkbox', { name: 'where reviewed' })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'where unknown' })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'where not applicable' })).not.toBeChecked();
    fireEvent.click(screen.getByRole('button', { name: 'Apply' }));

    await waitFor(() => {
      expect(bulkApplyTags).toHaveBeenCalledWith(['media-1'], {
        addTagIds: [],
        removeTagIds: [],
        addSubjectTagIds: [],
        removeSubjectTagIds: [],
        dimensionReviewUpdates: { who: true, where: true },
        dimensionResolutionUpdates: { where: 'unknown' },
      });
    });
  });

  it('stages a top-mounted Clear action until Apply', async () => {
    media[0] = {
      ...media[0],
      tags: ['alan'],
      subjectTagIds: ['alan'],
      dimensionReview: { who: { reviewed: true } },
    } as Media;
    render(
      <BulkEditMediaTagsModal
        mediaIds={['media-1']}
        isOpen
        onClose={jest.fn()}
        onSave={jest.fn(async () => undefined)}
      />
    );

    const clearWho = await screen.findByRole('button', { name: 'Clear who' });
    const toggleAlan = screen.getByRole('button', { name: 'Toggle Alan' });
    expect(clearWho.compareDocumentPosition(toggleAlan) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    fireEvent.click(clearWho);
    expect(bulkApplyTags).not.toHaveBeenCalled();
    expect(screen.getByRole('checkbox', { name: 'who reviewed' })).not.toBeChecked();
    fireEvent.click(screen.getByRole('button', { name: 'Apply' }));

    await waitFor(() => {
      expect(bulkApplyTags).toHaveBeenCalledWith(['media-1'], {
        addTagIds: [],
        removeTagIds: ['alan'],
        addSubjectTagIds: [],
        removeSubjectTagIds: ['alan'],
        dimensionReviewUpdates: { who: false },
        dimensionResolutionUpdates: { who: null },
      });
    });
  });

  it('removes only assigned dimensional tags when choosing Not applicable', async () => {
    media[0] = {
      ...media[0],
      tags: [],
      when: ['when-assigned'],
      subjectTagIds: ['when-assigned'],
    } as Media;

    render(
      <BulkEditMediaTagsModal
        mediaIds={['media-1']}
        isOpen
        onClose={jest.fn()}
        onSave={jest.fn(async () => undefined)}
      />
    );

    fireEvent.click(await screen.findByRole('checkbox', { name: 'when not applicable' }));
    fireEvent.click(screen.getByRole('button', { name: 'Apply' }));

    await waitFor(() => {
      expect(bulkApplyTags).toHaveBeenCalledWith(['media-1'], {
        addTagIds: [],
        removeTagIds: ['when-assigned'],
        addSubjectTagIds: [],
        removeSubjectTagIds: ['when-assigned'],
        temporal: null,
        temporalSubject: false,
        dimensionReviewUpdates: { when: true },
        dimensionResolutionUpdates: { when: 'not_applicable' },
      });
    });
  });

  it('removes a legacy When subject when a structured date replaces its authoring meaning', async () => {
    media[0] = {
      ...media[0],
      tags: ['when-assigned'],
      when: ['when-assigned'],
      subjectTagIds: ['when-assigned'],
    } as Media;

    render(
      <BulkEditMediaTagsModal
        mediaIds={['media-1']}
        isOpen
        onClose={jest.fn()}
        onSave={jest.fn(async () => undefined)}
      />
    );

    expect(await screen.findByRole('checkbox', { name: '1957' })).toBeChecked();
    const yearInput = await screen.findByLabelText('Year');
    fireEvent.change(yearInput, { target: { value: '1968' } });
    fireEvent.blur(yearInput);
    expect(screen.queryByRole('checkbox', { name: '1957' })).not.toBeInTheDocument();
    expect(
      document.querySelector('[data-subject-dimension="when"]')
    ).toHaveTextContent('1968');
    expect(screen.getByRole('checkbox', { name: '1968' })).not.toBeChecked();
    fireEvent.click(screen.getByRole('checkbox', { name: '1968' }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'when reviewed' }));
    fireEvent.click(screen.getByRole('button', { name: 'Apply' }));

    await waitFor(() => {
      expect(bulkApplyTags).toHaveBeenCalledWith(['media-1'], {
        addTagIds: [],
        removeTagIds: [],
        addSubjectTagIds: [],
        removeSubjectTagIds: ['when-assigned'],
        temporal: expect.objectContaining({
          status: 'known',
          precision: 'year',
          year: 1968,
        }),
        temporalSubject: true,
        dimensionReviewUpdates: { when: true },
        dimensionResolutionUpdates: { when: null },
      });
    });
  });
});
