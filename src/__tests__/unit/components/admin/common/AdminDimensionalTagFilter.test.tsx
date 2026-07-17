import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import AdminDimensionalTagFilter from '@/components/admin/common/AdminDimensionalTagFilter';
import { DEFAULT_ADMIN_DIMENSION_FILTERS } from '@/lib/preferences/adminFilters';
import type { Tag } from '@/lib/types/tag';

jest.mock('@/components/providers/TagProvider', () => ({
  useTag: () => ({ tags: [] }),
}));

jest.mock('@/components/admin/studio/cards/TagPickerDimensionColumn', () => ({
  __esModule: true,
  default: ({ dimension }: { dimension: { docId: string } }) => (
    <div data-testid={`dimension-${dimension.docId}`} />
  ),
}));

const tags = [
  { docId: 'alan', name: 'Alan', dimension: 'who' },
  { docId: 'party', name: 'Party', dimension: 'what' },
] as Tag[];

describe('AdminDimensionalTagFilter', () => {
  it('opens a dimension independently and keeps the complete picker available', () => {
    render(
      <AdminDimensionalTagFilter
        selectedTagIds={['alan', 'party']}
        allTags={tags}
        onSelectedTagIdsChange={jest.fn()}
        tagScope="all"
        onTagScopeChange={jest.fn()}
        dimensionFilters={DEFAULT_ADMIN_DIMENSION_FILTERS}
        onDimensionFilterChange={jest.fn()}
        surfaceLabel="Cards"
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Browse Who tags' }));
    expect(screen.getByTestId('dimension-dim-who')).toBeInTheDocument();
    expect(screen.queryByTestId('dimension-dim-what')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Close dialog' }));

    fireEvent.click(screen.getByRole('button', { name: 'Browse all cards tag filters' }));
    expect(screen.getByTestId('dimension-dim-who')).toBeInTheDocument();
    expect(screen.getByTestId('dimension-dim-what')).toBeInTheDocument();
  });

  it('keeps presence and scope rules behind the rules control', () => {
    const onScopeChange = jest.fn();
    const onRuleChange = jest.fn();
    render(
      <AdminDimensionalTagFilter
        selectedTagIds={[]}
        allTags={tags}
        onSelectedTagIdsChange={jest.fn()}
        tagScope="all"
        onTagScopeChange={onScopeChange}
        dimensionFilters={DEFAULT_ADMIN_DIMENSION_FILTERS}
        onDimensionFilterChange={onRuleChange}
        surfaceLabel="Cards"
      />
    );

    expect(screen.queryByRole('group', { name: 'Cards tag rules' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Cards tag rules' }));
    fireEvent.change(screen.getByLabelText('Who tag presence'), { target: { value: 'hasAny' } });
    fireEvent.change(screen.getByDisplayValue('Any assigned tag'), { target: { value: 'subject' } });

    expect(onRuleChange).toHaveBeenCalledWith('who', { mode: 'hasAny', tagId: '' });
    expect(onScopeChange).toHaveBeenCalledWith('subject');
  });
});
