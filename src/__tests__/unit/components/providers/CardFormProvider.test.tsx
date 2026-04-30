import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CardFormProvider, useCardForm } from '@/components/providers/CardFormProvider';
import { Card } from '@/lib/types/card';
import { Tag } from '@/lib/types/tag';

const mockCard: Card = {
  docId: 'test-card-1',
  title: 'Test Card',
  title_lowercase: 'test card',
  subtitle: null,
  excerpt: null,
  excerptAuto: true,
  content: '<p>Test content</p>',
  status: 'draft',
  type: 'story',
  displayMode: 'inline',
  createdAt: Date.now(),
  updatedAt: Date.now(),
  tags: [],
  who: [],
  what: [],
  when: [],
  where: [],
  childrenIds: [],
  filterTags: {},
  coverImageId: null,
  coverImage: null,
  contentMedia: [],
  galleryMedia: [],
};

const mockTags: Tag[] = [
  { docId: 'tag-1', name: 'Tag 1', dimension: 'what', color: '#000000' } as Tag,
  { docId: 'tag-2', name: 'Tag 2', dimension: 'what', color: '#000000' } as Tag,
];

function TestComponent() {
  const { formState, setField, updateTags, handleSave, persistFieldPatch, isDirty } = useCardForm();
  return (
    <div>
      <input
        data-testid="title-input"
        value={formState.cardData.title || ''}
        onChange={(e) => setField('title', e.target.value)}
      />
      <button type="button" data-testid="patch-button" onClick={() => void persistFieldPatch({ title: 'Patched Title' })}>
        Patch
      </button>
      <button type="button" data-testid="tag-button" onClick={() => updateTags(mockTags)}>
        Set Tags
      </button>
      <button type="button" data-testid="save-button" onClick={() => void handleSave()}>
        Save
      </button>
      <span data-testid="dirty-flag">{isDirty ? 'dirty' : 'clean'}</span>
      {formState.errors.title ? <span data-testid="title-error">{formState.errors.title}</span> : null}
      {formState.isSaving ? <span data-testid="saving-indicator">Saving...</span> : null}
    </div>
  );
}

describe('CardFormProvider', () => {
  const mockOnSave = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('initializes with the provided card data', () => {
    render(
      <CardFormProvider initialCard={mockCard} allTags={mockTags} onSave={mockOnSave}>
        <TestComponent />
      </CardFormProvider>
    );

    expect(screen.getByTestId('title-input')).toHaveValue('Test Card');
    expect(screen.getByTestId('dirty-flag')).toHaveTextContent('clean');
  });

  it('updates form state when fields change', async () => {
    render(
      <CardFormProvider initialCard={mockCard} allTags={mockTags} onSave={mockOnSave}>
        <TestComponent />
      </CardFormProvider>
    );

    const titleInput = screen.getByTestId('title-input');
    await userEvent.clear(titleInput);
    await userEvent.type(titleInput, 'New Title');

    expect(titleInput).toHaveValue('New Title');
    expect(screen.getByTestId('dirty-flag')).toHaveTextContent('dirty');
  });

  it('allows blank titles under the current partial-save schema', async () => {
    mockOnSave.mockResolvedValue({
      ...mockCard,
      title: '',
      title_lowercase: '',
    });

    render(
      <CardFormProvider initialCard={mockCard} allTags={mockTags} onSave={mockOnSave}>
        <TestComponent />
      </CardFormProvider>
    );

    const titleInput = screen.getByTestId('title-input');
    await userEvent.clear(titleInput);
    await userEvent.click(screen.getByTestId('save-button'));

    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalledWith(expect.objectContaining({ title: '' }));
    });
    expect(screen.queryByTestId('title-error')).not.toBeInTheDocument();
  });

  it('calls onSave with updated data when form is valid', async () => {
    mockOnSave.mockResolvedValue({
      ...mockCard,
      title: 'New Title',
      title_lowercase: 'new title',
    });

    render(
      <CardFormProvider initialCard={mockCard} allTags={mockTags} onSave={mockOnSave}>
        <TestComponent />
      </CardFormProvider>
    );

    const titleInput = screen.getByTestId('title-input');
    await userEvent.clear(titleInput);
    await userEvent.type(titleInput, 'New Title');
    await userEvent.click(screen.getByTestId('save-button'));

    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalledWith(expect.objectContaining({ title: 'New Title' }));
    });
    expect(screen.getByTestId('dirty-flag')).toHaveTextContent('clean');
  });

  it('shows loading state during save', async () => {
    mockOnSave.mockImplementation(
      () => new Promise<Card>((resolve) => setTimeout(() => resolve(mockCard), 100))
    );

    render(
      <CardFormProvider initialCard={mockCard} allTags={mockTags} onSave={mockOnSave}>
        <TestComponent />
      </CardFormProvider>
    );

    await userEvent.click(screen.getByTestId('save-button'));
    expect(await screen.findByTestId('saving-indicator')).toBeInTheDocument();
  });

  it('handles tag selection via updateTags', async () => {
    render(
      <CardFormProvider initialCard={mockCard} allTags={mockTags} onSave={mockOnSave}>
        <TestComponent />
      </CardFormProvider>
    );

    await userEvent.click(screen.getByTestId('tag-button'));
    await userEvent.click(screen.getByTestId('save-button'));

    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalledWith(
        expect.objectContaining({ tags: ['tag-1', 'tag-2'] })
      );
    });
  });

  it('persists field patches without resetting unsaved form state', async () => {
    mockOnSave.mockResolvedValue({
      ...mockCard,
      title: 'Patched Title',
      title_lowercase: 'patched title',
    });

    render(
      <CardFormProvider initialCard={mockCard} allTags={mockTags} onSave={mockOnSave}>
        <TestComponent />
      </CardFormProvider>
    );

    await userEvent.clear(screen.getByTestId('title-input'));
    await userEvent.type(screen.getByTestId('title-input'), 'Locally Edited');
    await userEvent.click(screen.getByTestId('patch-button'));

    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalledWith({ title: 'Patched Title' });
    });
    expect(screen.getByTestId('title-input')).toHaveValue('Patched Title');
  });
});
