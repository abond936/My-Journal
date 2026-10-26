import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import AdminDimensionalTagFilter from '@/components/admin/common/AdminDimensionalTagFilter';
import { DEFAULT_ADMIN_DIMENSION_FILTERS } from '@/lib/preferences/adminFilters';
import type { Tag } from '@/lib/types/tag';

jest.mock('@/components/providers/TagProvider', () => ({
  useTag: () => ({ tags: [] }),
}));

jest.mock('@/components/admin/studio/cards/TagPickerDimensionColumn', () => ({
  __esModule: true,
  default: ({
    dimension,
    headerControl,
    headerIcon,
    bodyOverride,
  }: {
    dimension: { docId: string; dimension: 'who' | 'what' | 'when' | 'where' };
    headerControl?: React.ReactNode;
    headerIcon?: React.ReactNode;
    bodyOverride?: React.ReactNode;
  }) => (
    <div data-testid={`dimension-${dimension.docId}`}>
      {headerIcon}
      {headerControl}
      {bodyOverride}
    </div>
  ),
}));

const tags = [
  { docId: 'alan', name: 'Alan', dimension: 'who' },
  { docId: 'party', name: 'Party', dimension: 'what' },
] as Tag[];

describe('AdminDimensionalTagFilter', () => {
  it('opens one complete four-dimension filter modal', () => {
    render(
      <AdminDimensionalTagFilter
        selectedTagIds={['alan', 'party']}
        allTags={tags}
        onSelectedTagIdsChange={jest.fn()}
        dimensionFilters={DEFAULT_ADMIN_DIMENSION_FILTERS}
        onDimensionFilterChange={jest.fn()}
        surfaceLabel="Cards"
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Open all cards tag filters' }));
    expect(screen.getByPlaceholderText('Enter tags…')).toBeInTheDocument();
    expect(screen.getByTestId('dimension-dim-who')).toBeInTheDocument();
    expect(screen.getByTestId('dimension-dim-what')).toBeInTheDocument();
    expect(screen.getByTestId('dimension-dim-who').querySelector('.lucide-user')).toBeTruthy();
    expect(
      within(screen.getByTestId('dimension-dim-when')).getByRole('radio', { name: 'Any' })
    ).toBeInTheDocument();
    expect(screen.queryByText('Structured date')).not.toBeInTheDocument();
  });

  it('shows the applied presence rule and selected tags while closed', () => {
    render(
      <AdminDimensionalTagFilter
        selectedTagIds={['alan', 'party']}
        allTags={tags}
        onSelectedTagIdsChange={jest.fn()}
        dimensionFilters={{
          ...DEFAULT_ADMIN_DIMENSION_FILTERS,
          who: { mode: 'isEmpty', tagId: '', subjectOnly: true },
        }}
        onDimensionFilterChange={jest.fn()}
        surfaceLabel="Media"
      />
    );

    expect(screen.queryByText('Alan')).not.toBeInTheDocument();
    expect(screen.getByText('Party')).toBeInTheDocument();
    expect(screen.getByText('Subjects empty')).toBeInTheDocument();
  });

  it('uses an icon-only trigger while preserving its accessible name', () => {
    render(
      <AdminDimensionalTagFilter
        selectedTagIds={[]}
        allTags={tags}
        onSelectedTagIdsChange={jest.fn()}
        dimensionFilters={DEFAULT_ADMIN_DIMENSION_FILTERS}
        onDimensionFilterChange={jest.fn()}
        surfaceLabel="Media"
      />
    );

    const trigger = screen.getByRole('button', { name: 'Open all media tag filters' });
    expect(trigger).toBeInTheDocument();
    expect(trigger).not.toHaveTextContent('Tags');
  });

  it('stages per-dimension subject and empty rules until one Apply action', () => {
    const onRuleChange = jest.fn();
    const onApply = jest.fn();
    render(
      <AdminDimensionalTagFilter
        selectedTagIds={[]}
        allTags={tags}
        onSelectedTagIdsChange={jest.fn()}
        dimensionFilters={DEFAULT_ADMIN_DIMENSION_FILTERS}
        onDimensionFilterChange={onRuleChange}
        surfaceLabel="Cards"
        onApply={onApply}
      />
    );

    expect(screen.queryByRole('group', { name: 'Cards tag rules' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Open all cards tag filters' }));
    const whoColumn = within(screen.getByTestId('dimension-dim-who'));
    fireEvent.click(whoColumn.getByLabelText('Subjects only'));
    fireEvent.click(whoColumn.getByLabelText('Empty'));

    expect(onRuleChange).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Apply' }));
    expect(onApply).toHaveBeenCalledWith(expect.objectContaining({
      dimensionFilters: expect.objectContaining({
        who: { mode: 'isEmpty', tagId: '', subjectOnly: true },
      }),
    }));
  });

  it('stages review-state filters and exposes an inclusive year range', () => {
    const onApply = jest.fn();
    render(
      <AdminDimensionalTagFilter
        selectedTagIds={[]}
        allTags={tags}
        onSelectedTagIdsChange={jest.fn()}
        dimensionFilters={DEFAULT_ADMIN_DIMENSION_FILTERS}
        onDimensionFilterChange={jest.fn()}
        surfaceLabel="Media"
        onApply={onApply}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Open all media tag filters' }));
    fireEvent.change(screen.getByLabelText('When review state'), {
      target: { value: 'unreviewed' },
    });
    expect(
      within(screen.getByTestId('dimension-dim-when')).getByRole('radio', { name: 'Blank' })
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Year range')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Apply' }));

    expect(onApply).toHaveBeenCalledWith(expect.objectContaining({
      dimensionFilters: expect.objectContaining({
        when: expect.objectContaining({ reviewState: 'unreviewed' }),
      }),
    }));
  });
});
