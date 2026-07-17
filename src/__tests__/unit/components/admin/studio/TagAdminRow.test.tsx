import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { TagAdminRow } from '@/components/admin/studio/tags/TagAdminRow';

const tag = {
  docId: 'tag-parent',
  name: 'Family',
  dimension: 'who' as const,
  cardCount: 3,
  mediaCount: 5,
  children: [{ docId: 'tag-child', name: 'Sandra', dimension: 'who' as const, children: [] }],
};

function renderRow() {
  const props = {
    onUpdateTag: jest.fn(),
    onDeleteTag: jest.fn(),
    onCreateTag: jest.fn(),
    onToggleCollapse: jest.fn(),
  };
  render(<TagAdminRow tag={tag} depth={0} isCollapsed={false} {...props} />);
  return props;
}

describe('TagAdminRow', () => {
  it('labels compact controls and counts', () => {
    renderRow();
    expect(screen.getByRole('button', { name: 'Collapse Family' })).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByLabelText('3 cards, 5 media items')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Actions for Family' })).toBeInTheDocument();
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('opens explicit actions and cancels rename with Escape', () => {
    const { onUpdateTag } = renderRow();
    fireEvent.click(screen.getByRole('button', { name: 'Actions for Family' }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Rename' }));

    const input = screen.getByRole('textbox', { name: 'Rename Family' });
    fireEvent.change(input, { target: { value: 'Changed' } });
    fireEvent.keyDown(input, { key: 'Escape' });

    expect(onUpdateTag).not.toHaveBeenCalled();
    expect(screen.getByText('Family')).toBeInTheDocument();
  });

  it('saves rename on Enter and cancels add-child with Escape', () => {
    const { onUpdateTag, onCreateTag } = renderRow();
    fireEvent.click(screen.getByRole('button', { name: 'Actions for Family' }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Rename' }));
    const rename = screen.getByRole('textbox', { name: 'Rename Family' });
    fireEvent.change(rename, { target: { value: 'Relatives' } });
    fireEvent.keyDown(rename, { key: 'Enter' });
    expect(onUpdateTag).toHaveBeenCalledWith('tag-parent', { name: 'Relatives' });

    fireEvent.click(screen.getByRole('button', { name: 'Actions for Family' }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Add child' }));
    const child = screen.getByRole('textbox', { name: 'New child of Family' });
    fireEvent.change(child, { target: { value: 'New person' } });
    fireEvent.keyDown(child, { key: 'Escape' });
    expect(onCreateTag).not.toHaveBeenCalled();
    expect(screen.queryByRole('textbox', { name: 'New child of Family' })).not.toBeInTheDocument();
  });
});
