import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TagSearchSelect from '@/components/admin/common/TagSearchSelect';
import type { Tag } from '@/lib/types/tag';

const tags = [
  { docId: 'who-root', name: 'Family', dimension: 'who' },
  { docId: 'alan', name: 'Alan', parentId: 'who-root', path: ['who-root', 'alan'], dimension: 'who' },
  { docId: 'what-root', name: 'Events', dimension: 'what' },
] as Tag[];

describe('TagSearchSelect', () => {
  it('shows breadcrumb results and selects the first result with Enter', async () => {
    const onSelect = jest.fn();
    const onValueChange = jest.fn();
    const { rerender } = render(
      <TagSearchSelect
        allTags={tags}
        selectedTagIds={[]}
        value=""
        onValueChange={onValueChange}
        onSelect={onSelect}
      />
    );

    rerender(
      <TagSearchSelect
        allTags={tags}
        selectedTagIds={[]}
        value="alan"
        onValueChange={onValueChange}
        onSelect={onSelect}
      />
    );

    expect(screen.getByRole('option')).toHaveTextContent('Family / Alan');
    await userEvent.type(screen.getByRole('combobox'), '{enter}');
    expect(onSelect).toHaveBeenCalledWith('alan');
    expect(onValueChange).toHaveBeenCalledWith('');
  });

  it('excludes dimensions that the containing modal does not author', () => {
    render(
      <TagSearchSelect
        allTags={tags}
        selectedTagIds={[]}
        value="events"
        onValueChange={jest.fn()}
        onSelect={jest.fn()}
        allowedDimensions={['who']}
      />
    );

    expect(screen.queryByRole('option')).not.toBeInTheDocument();
    expect(screen.getByText('No matching tags.')).toBeInTheDocument();
  });
});
