import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import ReaderMobileQuickEdit from '@/components/view/ReaderMobileQuickEdit';
import { patchReaderQuickEdit } from '@/lib/utils/readerCardPatchReconcile';

jest.mock('@/lib/utils/readerCardPatchReconcile', () => ({
  ...jest.requireActual('@/lib/utils/readerCardPatchReconcile'),
  patchReaderQuickEdit: jest.fn(),
}));

jest.mock('@/components/providers/AppFeedbackProvider', () => ({
  useAppFeedback: () => ({
    confirm: jest.fn(async () => true),
    showError: jest.fn(),
    showSuccess: jest.fn(),
  }),
}));

const patchReaderQuickEditMock = jest.mocked(patchReaderQuickEdit);

describe('ReaderMobileQuickEdit', () => {
  beforeEach(() => {
    patchReaderQuickEditMock.mockReset();
    patchReaderQuickEditMock.mockResolvedValue({
      docId: 'card-1',
      title: 'Updated title',
      subtitle: 'Sub',
      excerpt: 'Excerpt',
      content: '<p>Updated body</p>',
      status: 'published',
      type: 'story',
    } as never);
  });

  it('saves changed metadata through patchReaderQuickEdit', async () => {
    const onSaved = jest.fn();
    const onClose = jest.fn();

    render(
      <ReaderMobileQuickEdit
        open
        onClose={onClose}
        cardId="card-1"
        initial={{ title: 'Old title', subtitle: '', excerpt: '', content: '<p>Body</p>' }}
        onSaved={onSaved}
      />
    );

    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'Updated title' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(patchReaderQuickEditMock).toHaveBeenCalledWith(
        'card-1',
        expect.objectContaining({ title: 'Updated title' }),
        expect.objectContaining({ title: 'Old title', content: '<p>Body</p>' })
      );
    });

    expect(onSaved).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it('shows body field for eligible prose content', async () => {
    render(
      <ReaderMobileQuickEdit
        open
        onClose={jest.fn()}
        cardId="card-1"
        initial={{ title: 'Title', subtitle: '', excerpt: '', content: '<p>Original body</p>' }}
        onSaved={jest.fn()}
      />
    );

    expect(screen.getByLabelText('Body')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Body'), { target: { value: 'Updated body' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(patchReaderQuickEditMock).toHaveBeenCalledWith(
        'card-1',
        expect.objectContaining({ body: 'Updated body' }),
        expect.any(Object)
      );
    });
  });

  it('shows guidance instead of body field for rich content', () => {
    render(
      <ReaderMobileQuickEdit
        open
        onClose={jest.fn()}
        cardId="card-1"
        initial={{
          title: 'Title',
          subtitle: '',
          excerpt: '',
          content: '<p>Hi</p><figure data-media-id="media-1"></figure>',
        }}
        onSaved={jest.fn()}
      />
    );

    expect(screen.queryByLabelText('Body')).not.toBeInTheDocument();
    expect(screen.getByText(/rich formatting/i)).toBeInTheDocument();
  });
});
