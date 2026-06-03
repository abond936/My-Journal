import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CardDimensionalTagCommandBar from '@/components/admin/common/CardDimensionalTagCommandBar';
import type { Card } from '@/lib/types/card';
import type { Tag } from '@/lib/types/tag';

const tags: Tag[] = [
  { docId: 'alan', name: 'Alan', dimension: 'who' } as Tag,
  { docId: 'bob', name: 'Bob', dimension: 'who' } as Tag,
  { docId: 'party', name: 'Birthday Party', dimension: 'what' } as Tag,
];

const card: Pick<Card, 'tags' | 'subjectTagId'> = {
  tags: ['alan', 'bob', 'party'],
  subjectTagId: 'alan',
};

describe('CardDimensionalTagCommandBar', () => {
  it('opens a two-option menu from a visible tag and toggles subject selection', async () => {
    const onUpdateTags = jest.fn();
    const onUpdateSubjectTagId = jest.fn(async () => undefined);

    render(
      <CardDimensionalTagCommandBar
        card={card}
        allTags={tags}
        onUpdateTags={onUpdateTags}
        onUpdateSubjectTagId={onUpdateSubjectTagId}
      />
    );

    expect(screen.getAllByText('Bob')).toHaveLength(1);

    await userEvent.click(screen.getByRole('button', { name: 'Bob' }));

    const menu = screen.getByRole('menu', { name: 'Bob actions' });
    expect(within(menu).getByRole('menuitemcheckbox', { name: 'Subject' })).toBeInTheDocument();
    expect(within(menu).getByRole('menuitem', { name: 'Remove' })).toBeInTheDocument();

    await userEvent.click(within(menu).getByRole('menuitemcheckbox', { name: 'Subject' }));

    await waitFor(() => {
      expect(onUpdateSubjectTagId).toHaveBeenCalledWith('bob');
    });
    expect(onUpdateTags).not.toHaveBeenCalled();
  });

  it('removes a selected tag through the chip action menu', async () => {
    const onUpdateTags = jest.fn(async () => undefined);

    render(
      <CardDimensionalTagCommandBar
        card={card}
        allTags={tags}
        onUpdateTags={onUpdateTags}
      />
    );

    await userEvent.click(screen.getByRole('button', { name: 'Bob' }));
    await userEvent.click(screen.getByRole('menuitem', { name: 'Remove' }));

    await waitFor(() => {
      expect(onUpdateTags).toHaveBeenCalledWith(['alan', 'party']);
    });
  });

  it('renders the subject first within its dimension when multiple tags are assigned', () => {
    render(
      <CardDimensionalTagCommandBar
        card={{ tags: ['alan', 'bob', 'party'], subjectTagId: 'bob' }}
        allTags={tags}
        onUpdateTags={jest.fn()}
        stackTagsWithinDimension
      />
    );

    const bob = screen.getByRole('button', { name: 'Bob, subject' });
    const alan = screen.getByRole('button', { name: 'Alan' });

    expect(bob.compareDocumentPosition(alan) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});
