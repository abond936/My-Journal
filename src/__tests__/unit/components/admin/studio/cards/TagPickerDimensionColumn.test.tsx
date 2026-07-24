import React from 'react';
import { render, screen } from '@testing-library/react';
import TagPickerDimensionColumn from '@/components/admin/studio/cards/TagPickerDimensionColumn';
import type { TagWithChildren } from '@/lib/types/tag';

jest.mock('@/components/providers/TagProvider', () => ({
  useTag: () => ({ createTag: jest.fn() }),
}));

const whoDimension = {
  docId: 'who',
  name: 'Who',
  dimension: 'who',
  children: [
    {
      docId: 'family',
      name: 'Family',
      dimension: 'who',
      children: [
        {
          docId: 'father',
          name: 'Father',
          dimension: 'who',
          children: [],
        },
      ],
    },
  ],
} as TagWithChildren;

describe('TagPickerDimensionColumn', () => {
  it('keeps a selected path expanded after that selection is removed', () => {
    const { rerender } = render(
      <TagPickerDimensionColumn
        dimension={whoDimension}
        selection={new Set(['father'])}
        onSelectionChange={jest.fn()}
        expandedNodeIds={new Set(['family'])}
        checkboxIdPrefix="tag"
      />
    );

    expect(screen.getByText('Father')).toBeInTheDocument();

    rerender(
      <TagPickerDimensionColumn
        dimension={whoDimension}
        selection={new Set()}
        onSelectionChange={jest.fn()}
        expandedNodeIds={new Set()}
        checkboxIdPrefix="tag"
      />
    );

    expect(screen.getByText('Father')).toBeInTheDocument();
  });

  it('reveals a deeply selected tag without showing tag-creation controls', () => {
    render(
      <TagPickerDimensionColumn
        dimension={whoDimension}
        selection={new Set(['father'])}
        onSelectionChange={jest.fn()}
        expandedNodeIds={new Set(['family'])}
        checkboxIdPrefix="filter"
        showManagementControls={false}
        initialExpandLevels={1}
      />
    );

    expect(screen.getByText('Father')).toBeInTheDocument();
    expect(screen.queryByPlaceholderText('New tag')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Add child tag under Family' })).not.toBeInTheDocument();
    expect(screen.getByText('▼')).toBeInTheDocument();
  });

  it('disables the tag tree while preserving controls rendered above it', () => {
    render(
      <TagPickerDimensionColumn
        dimension={whoDimension}
        selection={new Set()}
        onSelectionChange={jest.fn()}
        checkboxIdPrefix="empty-filter"
        showManagementControls={false}
        headerControl={<label><input type="checkbox" />Subjects only</label>}
        disabled
      />
    );

    expect(screen.getByRole('checkbox', { name: 'Subjects only' })).toBeEnabled();
    expect(screen.getByRole('checkbox', { name: 'Family' })).toBeDisabled();
  });
});
