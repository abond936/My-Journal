import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import BulkEditMediaTagsModal from '@/components/admin/studio/media/BulkEditMediaTagsModal';
import type { Media } from '@/lib/types/photo';
import type { Tag } from '@/lib/types/tag';

const bulkApplyTags = jest.fn(async () => undefined);
const media = [{
  docId: 'media-1',
  filename: 'family.jpg',
  tags: [],
  subjectTagIds: [],
} as Media];
const mockResolveMediaById = (id: string) => media.find((item) => item.docId === id);

jest.mock('@/components/providers/TagProvider', () => ({
  useTag: () => ({
    tags: [{ docId: 'alan', name: 'Alan', dimension: 'who', path: [] }] as Tag[],
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
    expect(screen.getByText('(Choose one or more assigned tags as subjects.)')).toBeInTheDocument();
    expect(document.querySelectorAll('[data-subject-dimension]')).toHaveLength(4);
    expect(document.querySelector('[data-dimension="who"]')).toHaveAttribute('data-management', 'shown');
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
});
