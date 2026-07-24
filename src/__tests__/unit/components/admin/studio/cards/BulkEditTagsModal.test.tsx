import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import BulkEditTagsModal from '@/components/admin/studio/cards/BulkEditTagsModal';
import type { Card } from '@/lib/types/card';

jest.mock('@/components/providers/TagProvider', () => ({
  useTag: () => ({
    loading: false,
    tags: [
      { docId: 'alan', name: 'Alan', dimension: 'who' },
      { docId: 'party', name: 'Party', dimension: 'what' },
    ],
  }),
}));

jest.mock('@/components/admin/studio/cards/TagPickerDimensionColumn', () => ({
  __esModule: true,
  default: ({ dimension, disabled }: { dimension: { docId: string }; disabled?: boolean }) => (
    <div data-testid={`dimension-${dimension.docId}`} data-disabled={disabled ? 'true' : 'false'} />
  ),
}));

const cards = [
  {
    docId: 'one',
    title: 'One',
    tags: ['alan'],
    subjectTagIds: ['alan'],
    galleryTagInheritanceOverrides: { who: true, what: true, when: true, where: true },
  },
  {
    docId: 'two',
    title: 'Two',
    tags: ['party'],
    galleryTagInheritanceOverrides: { who: false, what: true, when: true, where: true },
  },
] as Card[];

describe('BulkEditTagsModal', () => {
  beforeEach(() => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        settings: {
          galleryTagInheritance: { who: true, what: true, when: true, where: true },
        },
      }),
    }) as jest.Mock;
  });

  it('defaults every dimension to Keep and enables only an overridden column', async () => {
    render(
      <BulkEditTagsModal
        cardIds={['one', 'two']}
        selectedCards={cards}
        isOpen
        onClose={jest.fn()}
        onSave={jest.fn(async () => undefined)}
      />
    );

    await waitFor(() => expect(screen.getAllByRole('radio', { name: 'Keep' })).toHaveLength(4));
    expect(screen.getByText('1 inherited · 1 overridden')).toBeInTheDocument();
    expect(screen.getByTestId('dimension-dim-who')).toHaveAttribute('data-disabled', 'true');

    const overrideControls = screen.getAllByRole('radio', { name: 'Override' });
    await userEvent.click(overrideControls[0]);

    expect(screen.getByTestId('dimension-dim-who')).toHaveAttribute('data-disabled', 'false');
    expect(screen.getByTestId('dimension-dim-what')).toHaveAttribute('data-disabled', 'true');
  });
});
