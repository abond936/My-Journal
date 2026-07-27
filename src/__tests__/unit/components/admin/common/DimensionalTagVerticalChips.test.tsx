import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DimensionalTagVerticalChips from '@/components/admin/common/DimensionalTagVerticalChips';
import type { Tag } from '@/lib/types/tag';

const tags: Tag[] = [
  { docId: 'alan', name: 'Alan', dimension: 'who' } as Tag,
  { docId: 'bob', name: 'Bob', dimension: 'who' } as Tag,
  { docId: 'party', name: 'Birthday Party', dimension: 'what' } as Tag,
];

describe('DimensionalTagVerticalChips', () => {
  it('opens only the clicked dimension and exposes subject and remove actions per tag', async () => {
    const onUpdateTags = jest.fn(async () => undefined);
    const onUpdateSubjectTagId = jest.fn(async () => undefined);

    render(
      <DimensionalTagVerticalChips
        tagIds={['alan', 'bob', 'party']}
        subjectTagId="bob"
        allTags={tags}
        variant="inline"
        onUpdateTags={onUpdateTags}
        onUpdateSubjectTagId={onUpdateSubjectTagId}
      />
    );

    await userEvent.click(screen.getByRole('button', { name: 'Bob' }));

    const dialog = screen.getByRole('dialog', { name: 'Who tags' });
    expect(within(dialog).getByRole('button', { name: 'Alan' })).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Bob' })).toBeInTheDocument();
    expect(within(dialog).queryByRole('button', { name: 'Birthday Party' })).not.toBeInTheDocument();

    await userEvent.click(within(dialog).getByRole('button', { name: 'Alan' }));
    await userEvent.click(within(dialog).getByRole('button', { name: 'Subject' }));

    await waitFor(() => {
      expect(onUpdateSubjectTagId).toHaveBeenCalledWith('alan');
    });
    expect(onUpdateTags).not.toHaveBeenCalled();
  });

  it('removes a hidden tag from the selected dimension menu', async () => {
    const onUpdateTags = jest.fn(async () => undefined);

    render(
      <DimensionalTagVerticalChips
        tagIds={['alan', 'bob', 'party']}
        allTags={tags}
        variant="inline"
        onUpdateTags={onUpdateTags}
      />
    );

    await userEvent.click(screen.getByRole('button', { name: /multiple/i }));

    const dialog = screen.getByRole('dialog', { name: 'Who tags' });
    await userEvent.click(within(dialog).getByRole('button', { name: 'Bob' }));
    await userEvent.click(within(dialog).getByRole('button', { name: 'Remove' }));

    await waitFor(() => {
      expect(onUpdateTags).toHaveBeenCalledWith(['alan', 'party']);
    });
  });

  it('adds a subject without replacing an existing subject', async () => {
    const onUpdateSubjectTagIds = jest.fn(async () => undefined);
    render(
      <DimensionalTagVerticalChips
        tagIds={['alan', 'bob', 'party']}
        subjectTagIds={['alan']}
        allTags={tags}
        variant="inline"
        onUpdateTags={jest.fn()}
        onUpdateSubjectTagIds={onUpdateSubjectTagIds}
      />
    );

    await userEvent.click(screen.getByRole('button', { name: 'Alan' }));
    const dialog = screen.getByRole('dialog', { name: 'Who tags' });
    await userEvent.click(within(dialog).getByRole('button', { name: 'Bob' }));
    await userEvent.click(within(dialog).getByRole('button', { name: 'Subject' }));
    expect(onUpdateSubjectTagIds).toHaveBeenCalledWith(['alan', 'bob']);
  });

  it('shows a single tag name, Multiple, and Subjects+ using full-list tooltips', () => {
    const { rerender } = render(
      <DimensionalTagVerticalChips
        tagIds={['alan']}
        allTags={tags}
        variant="inline"
        onUpdateTags={jest.fn()}
      />
    );
    expect(screen.getByRole('button', { name: 'Alan' })).toHaveAttribute('title', expect.stringContaining('Tags: Alan'));

    rerender(
      <DimensionalTagVerticalChips
        tagIds={['alan', 'bob']}
        allTags={tags}
        variant="inline"
        onUpdateTags={jest.fn()}
      />
    );
    expect(screen.getByRole('button', { name: 'Multiple' })).toHaveAttribute('title', expect.stringContaining('Alan, Bob'));

    rerender(
      <DimensionalTagVerticalChips
        tagIds={['alan', 'bob']}
        subjectTagIds={['alan']}
        allTags={tags}
        variant="inline"
        onUpdateTags={jest.fn()}
      />
    );
    expect(screen.getByRole('button', { name: 'Alan' })).toHaveAttribute('title', expect.stringContaining('Selected subjects: Alan'));
  });

  it('shows a structured date instead of the legacy When tag preview', () => {
    render(
      <DimensionalTagVerticalChips
        tagIds={[]}
        allTags={tags}
        variant="inline"
        temporalValue={{
          status: 'known',
          year: 1968,
          month: 7,
          precision: 'month',
          approximate: false,
          source: 'manual',
        }}
        onUpdateTags={jest.fn()}
      />
    );

    expect(screen.getByRole('button', { name: '1968-07' })).toHaveAttribute(
      'title',
      'When: July 1968'
    );
  });

  it('shows reviewed resolutions instead of empty dashes', () => {
    render(
      <DimensionalTagVerticalChips
        tagIds={[]}
        allTags={tags}
        variant="inline"
        dimensionReview={{
          who: { reviewed: true, resolution: 'not_applicable' },
          where: { reviewed: true, resolution: 'unknown' },
        }}
        onUpdateTags={jest.fn()}
      />
    );

    expect(screen.getByRole('button', { name: 'N/A' })).toHaveAttribute(
      'title',
      'Who: N/A'
    );
    expect(screen.getByRole('button', { name: 'Unknown' })).toHaveAttribute(
      'title',
      'Where: Unknown'
    );
  });
});
