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
  default: ({
    dimension,
    showManagementControls,
    hideHeader,
    disabled,
  }: {
    dimension: { docId: string; children?: Array<{ name: string }> };
    showManagementControls?: boolean;
    hideHeader?: boolean;
    disabled?: boolean;
  }) => (
    <div
      data-testid={`mock-dimension-${dimension.docId}`}
      data-management={showManagementControls ? 'shown' : 'hidden'}
      data-header={hideHeader ? 'hidden' : 'shown'}
      data-disabled={disabled ? 'true' : 'false'}
    >
      {(dimension.children ?? []).map((child) => child.name).join(', ')}
    </div>
  ),
}));

const tags: Tag[] = [
  { docId: 'alan', name: 'Alan', dimension: 'who' } as Tag,
  { docId: 'party', name: 'Birthday Party', dimension: 'what' } as Tag,
];
const whenTag = { docId: 'when-1957', name: '1957', dimension: 'when' } as Tag;

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

  it('shows every taxonomy tag when used as a filter picker', () => {
    const completeTreeTags = [
      ...tags,
      { docId: 'z-what', name: 'z-what', dimension: 'what' },
    ] as Tag[];

    render(
      <MacroTagSelector
        startExpanded
        selectedTags={[completeTreeTags[2]]}
        allTags={completeTreeTags}
        onChange={jest.fn()}
        includeAllTags
        collapsedSummary="none"
      />
    );

    expect(screen.getByTestId('mock-dimension-dim-what')).toHaveTextContent('z-what');
  });

  it('uses the Media Tags assignment layout for Card Tags', async () => {
    const onSaveAssignment = jest.fn(async () => undefined);
    render(
      <MacroTagSelector
        startExpanded
        selectedTags={tags}
        allTags={tags}
        onChange={jest.fn()}
        subjectTagIds={['alan']}
        onSaveAssignment={onSaveAssignment}
        pickerTitle="Card Tags"
        searchPlaceholder="Search tags..."
        visibleDimensions={['who', 'what', 'when', 'where']}
        unifiedAssignmentLayout
        collapsedSummary="none"
      />
    );

    expect(screen.getByRole('heading', { name: 'Card Tags' })).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Search tags...')).toBeInTheDocument();
    expect(screen.getByText('(Choose one or more assigned tags as subjects.)')).toBeInTheDocument();
    expect(document.querySelectorAll('[data-subject-dimension]')).toHaveLength(4);
    expect(screen.getByTestId('mock-dimension-dim-who')).toHaveAttribute('data-management', 'hidden');
    expect(screen.getByTestId('mock-dimension-dim-who')).toHaveAttribute('data-header', 'hidden');

    await userEvent.click(screen.getByRole('checkbox', { name: 'Birthday Party' }));
    await userEvent.click(screen.getByRole('button', { name: 'Apply' }));

    await waitFor(() => {
      expect(onSaveAssignment).toHaveBeenCalledWith(['alan', 'party'], ['alan', 'party']);
    });
  });

  it('stages Gallery inheritance by dimension while keeping inherited subjects editable', async () => {
    const onSaveAssignmentWithInheritance = jest.fn(async () => undefined);
    render(
      <MacroTagSelector
        startExpanded
        selectedTags={tags}
        allTags={tags}
        onChange={jest.fn()}
        subjectTagIds={['alan']}
        onSaveAssignmentWithInheritance={onSaveAssignmentWithInheritance}
        pickerTitle="Card Tags"
        unifiedAssignmentLayout
        visibleDimensions={['who', 'what', 'when', 'where']}
        galleryTagIdsByDimension={{ who: ['alan'], what: ['party'], when: [], where: [] }}
        galleryRollupStatuses={{ who: 'reviewed', what: 'reviewed', when: 'empty', where: 'empty' }}
        inheritanceByDimension={{ who: true, what: false, when: true, where: true }}
        inheritanceAvailableByDimension={{ who: true, what: true, when: true, where: true }}
        collapsedSummary="none"
      />
    );

    expect(screen.getByText('Gallery tags')).toBeInTheDocument();
    expect(screen.getByText('Tag source')).toBeInTheDocument();
    expect(screen.getByTestId('mock-dimension-dim-who')).toHaveAttribute('data-disabled', 'true');
    expect(screen.getByTestId('mock-dimension-dim-what')).toHaveAttribute('data-disabled', 'false');
    expect(screen.getByRole('checkbox', { name: 'Alan' })).toBeEnabled();

    const inheritControls = screen.getAllByRole('checkbox', { name: 'Inherit?' });
    await userEvent.click(inheritControls[0]);
    expect(screen.getByTestId('mock-dimension-dim-who')).toHaveAttribute('data-disabled', 'false');
    await userEvent.click(screen.getByRole('button', { name: 'Apply' }));

    await waitFor(() => {
      expect(onSaveAssignmentWithInheritance).toHaveBeenCalledWith(
        ['alan', 'party'],
        ['alan'],
        { who: false, what: false, when: true, where: true }
      );
    });
  });

  it('does not present a retained When tag as a subject when a structured date is known', () => {
    render(
      <MacroTagSelector
        startExpanded
        selectedTags={[...tags, whenTag]}
        allTags={[...tags, whenTag]}
        onChange={jest.fn()}
        subjectTagIds={['when-1957']}
        onSaveAssignment={jest.fn(async () => undefined)}
        temporalValue={{
          status: 'known',
          year: 2008,
          precision: 'year',
          approximate: false,
          source: 'manual',
        }}
        visibleDimensions={['who', 'what', 'when', 'where']}
        unifiedAssignmentLayout
        collapsedSummary="none"
      />
    );

    expect(screen.queryByRole('checkbox', { name: '1957' })).not.toBeInTheDocument();
  });
});
