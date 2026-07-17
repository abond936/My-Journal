import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MacroTagSelector from '@/components/admin/studio/cards/MacroTagSelector';
import type { Tag } from '@/lib/types/tag';

jest.mock('@/components/providers/TagProvider', () => ({
  useTag: () => ({
    tags: [],
    createTag: jest.fn(),
  }),
}));

jest.mock('@/components/admin/studio/cards/TagPickerDimensionColumn', () => ({
  __esModule: true,
  default: ({ dimension }: { dimension: { docId: string } }) => (
    <div data-testid={`mock-dimension-${dimension.docId}`} />
  ),
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

  it('can show one dimension without dropping selections from the others', async () => {
    const onChange = jest.fn();
    render(
      <MacroTagSelector
        startExpanded
        selectedTags={tags}
        allTags={tags}
        onChange={onChange}
        visibleDimensions={['who']}
        pickerTitle="Who filters"
        collapsedSummary="none"
      />
    );

    expect(screen.getByRole('heading', { name: 'Who filters' })).toBeInTheDocument();
    expect(screen.getByTestId('mock-dimension-dim-who')).toBeInTheDocument();
    expect(screen.queryByTestId('mock-dimension-dim-what')).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(onChange).toHaveBeenCalledWith(['alan', 'party']));
  });

  it('saves multiple subjects with the assignment in one coordinated callback', async () => {
    const onSaveAssignment = jest.fn(async () => undefined);
    render(
      <MacroTagSelector
        startExpanded
        selectedTags={tags}
        allTags={tags}
        onChange={jest.fn()}
        subjectTagIds={['alan']}
        onSaveAssignment={onSaveAssignment}
        collapsedSummary="none"
      />
    );

    await userEvent.click(screen.getByRole('button', { name: 'Birthday Party' }));
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(onSaveAssignment).toHaveBeenCalledWith(['alan', 'party'], ['alan', 'party']);
    });
  });

  it('limits subject editing to the visible dimension while preserving hidden subjects', async () => {
    const onSaveAssignment = jest.fn(async () => undefined);
    render(
      <MacroTagSelector
        startExpanded
        selectedTags={tags}
        allTags={tags}
        onChange={jest.fn()}
        subjectTagIds={['alan', 'party']}
        onSaveAssignment={onSaveAssignment}
        visibleDimensions={['who']}
        collapsedSummary="none"
      />
    );

    expect(screen.getByRole('button', { name: 'Alan' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Birthday Party' })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Alan' }));
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(onSaveAssignment).toHaveBeenCalledWith(['alan', 'party'], ['party']);
    });
  });
});
