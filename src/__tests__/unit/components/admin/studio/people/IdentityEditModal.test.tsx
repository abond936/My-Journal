import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import IdentityEditModal from '@/components/admin/studio/people/IdentityEditModal';
import type { Person } from '@/lib/types/archiveIdentity';
import type { Tag } from '@/lib/types/tag';

jest.mock('@/components/admin/studio/cards/EditModal', () => ({
  __esModule: true,
  default: ({ children, title }: { children: React.ReactNode; title: string }) => <div><h2>{title}</h2>{children}</div>,
}));

const person: Person = {
  docId: 'sandra',
  kind: 'human',
  canonicalName: 'Sandra',
  aliases: [{ name: 'Sandra Bond' }, { name: 'Sandra Davis' }],
  linkedWhoTagId: 'sandra',
  legacyWhoTagIds: ['sandra-bond', 'sandra-davis'],
  status: 'active',
};
const tags: Tag[] = [
  { docId: 'sandra', name: 'Sandra', dimension: 'who' },
  { docId: 'sandra-bond', name: 'Sandra Bond', dimension: 'who' },
  { docId: 'sandra-davis', name: 'Sandra Davis', dimension: 'who' },
];

describe('IdentityEditModal', () => {
  it('shows identity details and saves canonical names and aliases', async () => {
    const onSave = jest.fn(async () => undefined);
    render(<IdentityEditModal person={person} whoTags={tags} saving={false} onClose={jest.fn()} onSave={onSave} />);

    expect(screen.getByText('Sandra Bond, Sandra Davis')).toBeInTheDocument();
    const aliases = screen.getByLabelText('Aliases');
    await userEvent.clear(aliases);
    await userEvent.type(aliases, 'Sandra Bond, Sandra Davis, Sandy');
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({
      canonicalName: 'Sandra',
      aliases: [{ name: 'Sandra Bond' }, { name: 'Sandra Davis' }, { name: 'Sandy' }],
      linkedWhoTagId: 'sandra',
    }));
  });
});
