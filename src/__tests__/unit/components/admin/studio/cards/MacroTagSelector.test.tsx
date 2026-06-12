import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MacroTagSelector from '@/components/admin/card-admin/MacroTagSelector';
import type { Tag } from '@/lib/types/tag';

jest.mock('@/components/providers/TagProvider', () => ({
  useTag: () => ({
    tags: [],
    createTag: jest.fn(),
  }),
}));

jest.mock('@/components/admin/card-admin/TagPickerDimensionColumn', () => ({
  __esModule: true,
  default: () => <div data-testid="mock-dimension-column" />,
}));

const tags: Tag[] = [
  { docId: 'alan', name: 'Alan', dimension: 'who' } as Tag,
  { docId: 'party', name: 'Birthday Party', dimension: 'what' } as Tag,
];

describe('MacroTagSelector', () => {
  it('shows selected tags as subject candidates in expanded view and saves the chosen subject', async () => {
    const onChange = jest.fn();
    const onSubjectTagIdChange = jest.fn(async () => undefined);

    render(
      <MacroTagSelector
        startExpanded
        selectedTags={tags}
        allTags={tags}
        onChange={onChange}
        subjectTagId="alan"
        onSubjectTagIdChange={onSubjectTagIdChange}
        collapsedSummary="none"
      />
    );

    expect(screen.getByText('Subject')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Birthday Party' }));
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(onChange).toHaveBeenCalledWith(['alan', 'party']);
      expect(onSubjectTagIdChange).toHaveBeenCalledWith('party');
    });
  });
});
