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
});
