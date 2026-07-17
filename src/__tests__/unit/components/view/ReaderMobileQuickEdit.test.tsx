import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import ReaderMobileQuickEdit from '@/components/view/ReaderMobileQuickEdit';
import { patchReaderQuickEdit } from '@/lib/utils/readerCardPatchReconcile';

const showError = jest.fn();

jest.mock('@/lib/utils/readerCardPatchReconcile', () => ({
  ...jest.requireActual('@/lib/utils/readerCardPatchReconcile'),
  patchReaderQuickEdit: jest.fn(),
}));

jest.mock('@/components/providers/AppFeedbackProvider', () => ({
  useAppFeedback: () => ({
    confirm: jest.fn(async () => true),
    showError,
    showSuccess: jest.fn(),
  }),
}));

const patchReaderQuickEditMock = jest.mocked(patchReaderQuickEdit);

describe('ReaderMobileQuickEdit', () => {
  beforeEach(() => {
    showError.mockReset();
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
        onOpenFullEditor={jest.fn()}
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
        onOpenFullEditor={jest.fn()}
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
        onOpenFullEditor={jest.fn()}
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

  it('shows required-title validation beside the title without calling the API', () => {
    render(
      <ReaderMobileQuickEdit
        open
        onClose={jest.fn()}
        onOpenFullEditor={jest.fn()}
        cardId="card-1"
        initial={{ title: 'Title', subtitle: '', excerpt: '', content: '<p>Body</p>' }}
        onSaved={jest.fn()}
      />
    );

    const title = screen.getByLabelText('Title');
    fireEvent.change(title, { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(title).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByText('Add a title before saving this card.')).toBeInTheDocument();
    expect(patchReaderQuickEditMock).not.toHaveBeenCalled();
  });

  it('opens the full editor from the mobile quick editor', () => {
    const onOpenFullEditor = jest.fn();

    render(
      <ReaderMobileQuickEdit
        open
        onClose={jest.fn()}
        onOpenFullEditor={onOpenFullEditor}
        cardId="card-1"
        initial={{ title: 'Title', subtitle: '', excerpt: '', content: '<p>Body</p>' }}
        onSaved={jest.fn()}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Full editor' }));

    expect(onOpenFullEditor).toHaveBeenCalledTimes(1);
  });

  it('keeps failed edits open and unchanged for retry', async () => {
    patchReaderQuickEditMock.mockRejectedValueOnce(new Error('Save unavailable.'));
    const onClose = jest.fn();
    const onSaved = jest.fn();

    render(
      <ReaderMobileQuickEdit
        open
        onClose={onClose}
        onOpenFullEditor={jest.fn()}
        cardId="card-1"
        initial={{ title: 'Old title', subtitle: '', excerpt: '', content: '<p>Body</p>' }}
        onSaved={onSaved}
      />
    );

    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'Unsaved title' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(showError).toHaveBeenCalled());
    expect(screen.getByRole('dialog', { name: 'Quick edit' })).toBeInTheDocument();
    expect(screen.getByLabelText('Title')).toHaveValue('Unsaved title');
    expect(onSaved).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Save' })).toBeEnabled();
  });
});
