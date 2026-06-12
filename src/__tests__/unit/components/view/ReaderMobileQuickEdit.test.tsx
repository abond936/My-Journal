import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import ReaderMobileQuickEdit from '@/components/view/ReaderMobileQuickEdit';
import { patchReaderCard } from '@/lib/utils/readerCardPatchReconcile';

jest.mock('@/lib/utils/readerCardPatchReconcile', () => ({
  ...jest.requireActual('@/lib/utils/readerCardPatchReconcile'),
  patchReaderCard: jest.fn(),
}));

jest.mock('@/components/providers/AppFeedbackProvider', () => ({
  useAppFeedback: () => ({
    confirm: jest.fn(async () => true),
    showError: jest.fn(),
    showSuccess: jest.fn(),
  }),
}));

const patchReaderCardMock = jest.mocked(patchReaderCard);

describe('ReaderMobileQuickEdit', () => {
  beforeEach(() => {
    patchReaderCardMock.mockReset();
    patchReaderCardMock.mockResolvedValue({
      docId: 'card-1',
      title: 'Updated title',
      subtitle: 'Sub',
      excerpt: 'Excerpt',
      status: 'published',
      type: 'story',
    } as never);
  });

  it('saves changed metadata through patchReaderCard', async () => {
    const onSaved = jest.fn();
    const onClose = jest.fn();

    render(
      <ReaderMobileQuickEdit
        open
        onClose={onClose}
        cardId="card-1"
        initial={{ title: 'Old title', subtitle: '', excerpt: '' }}
        onSaved={onSaved}
      />
    );

    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'Updated title' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(patchReaderCardMock).toHaveBeenCalledWith('card-1', { title: 'Updated title' });
    });

    expect(onSaved).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });
});
