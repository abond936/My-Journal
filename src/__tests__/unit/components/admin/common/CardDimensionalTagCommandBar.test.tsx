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

  it('shows an inherited unreviewed dimension as blank', () => {
    render(
      <CardDimensionalTagCommandBar
        card={{
          tags: ['party'],
          subjectTagId: null,
          galleryTagRollupStatuses: {
            who: 'unreviewed', what: 'reviewed', when: 'empty', where: 'empty',
          },
        }}
        allTags={tags}
        onUpdateTags={jest.fn()}
      />
    );

    expect(
      screen.getByTitle('Blank; Who requires review because at least one Gallery item is blank.')
    ).toHaveTextContent('-');
  });

  it('adds and removes subjects without replacing the other selected subjects', async () => {
    const onUpdateSubjectTagIds = jest.fn(async () => undefined);
    render(
      <CardDimensionalTagCommandBar
        card={{ tags: ['alan', 'bob', 'party'], subjectTagId: 'alan', subjectTagIds: ['alan'] }}
        allTags={tags}
        onUpdateTags={jest.fn()}
        onUpdateSubjectTagIds={onUpdateSubjectTagIds}
      />
    );

    await userEvent.click(screen.getByRole('button', { name: 'Bob' }));
    await userEvent.click(screen.getByRole('menuitemcheckbox', { name: 'Subject' }));
    expect(onUpdateSubjectTagIds).toHaveBeenCalledWith(['alan', 'bob']);
  });

  it('supports Compose dimension icons, read-only inheritance status, underlined tags, and no search field', () => {
    render(
      <CardDimensionalTagCommandBar
        card={card}
        allTags={tags}
        onUpdateTags={jest.fn()}
        showDimensionIcons
        underlineTags
        hideSearch
        dimensionLeadContent={(dimension) => (
          <span>{dimension} Inherited</span>
        )}
      />
    );

    expect(document.querySelectorAll('.lucide-user, .lucide-square, .lucide-calendar, .lucide-map-pin')).toHaveLength(4);
    expect(screen.getAllByText(/Inherited/)).toHaveLength(4);
    expect(screen.queryByPlaceholderText('Edit tags...')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Alan, subject' }).closest('[class*="wrapUnderlineTags"]')).not.toBeNull();
  });

  it('uses a structured date as the primary Compose When chip', () => {
    render(
      <CardDimensionalTagCommandBar
        card={card}
        allTags={tags}
        onUpdateTags={jest.fn()}
        temporalValue={{
          status: 'known',
          year: 1968,
          precision: 'year',
          approximate: true,
          source: 'manual',
        }}
      />
    );

    expect(screen.getByLabelText('When: circa 1968')).toHaveTextContent('~1968');
  });

  it('shows inherited reviewed resolutions instead of Unreviewed or empty', () => {
    render(
      <CardDimensionalTagCommandBar
        card={{
          tags: [],
          dimensionReview: {
            who: { reviewed: true, resolution: 'not_applicable' },
          },
          galleryTagRollupStatuses: {
            who: 'reviewed',
            what: 'empty',
            when: 'empty',
            where: 'empty',
          },
        }}
        allTags={tags}
        onUpdateTags={jest.fn()}
      />
    );

    expect(screen.getByText('N/A').closest('[title]')).toHaveAttribute('title', 'Who: N/A');
    expect(screen.queryByText('Unreviewed')).not.toBeInTheDocument();
  });
});
