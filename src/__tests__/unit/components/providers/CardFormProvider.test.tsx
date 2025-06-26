import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CardFormProvider, useCardForm } from '@/components/providers/CardFormProvider';
import { Card } from '@/lib/types/card';
import { Tag } from '@/lib/types/tag';

// Mock card data
const mockCard: Card = {
  id: 'test-card-1',
  title: 'Test Card',
  content: 'Test content',
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
  reflection: [],
  childrenIds: [],
  filterTags: {},
  coverImageId: null,
  coverImage: null,
  contentMedia: [],
  galleryMedia: [],
  inheritedTags: [],
  tagPathsMap: {},
};

// Mock tags
const mockTags: Tag[] = [
  { id: 'tag-1', name: 'Tag 1', dimension: 'what', color: '#000000' },
  { id: 'tag-2', name: 'Tag 2', dimension: 'what', color: '#000000' },
];

// Test component that uses the form context
const TestComponent = () => {
  const { formState, updateField, updateTags, handleSave } = useCardForm();
  return (
    <div>
      <input
        type="text"
        data-testid="title-input"
        value={formState.cardData.title || ''}
        onChange={(e) => updateField('title', e.target.value)}
      />
      <select
        data-testid="tag-select"
        multiple
        value={formState.tags.map(t => t.id)}
        onChange={(e) => {
          const selectedTags = Array.from(e.target.selectedOptions).map(option => 
            mockTags.find(t => t.id === option.value)!
          );
          updateTags(selectedTags);
        }}
      >
        {mockTags.map(tag => (
          <option key={tag.id} value={tag.id}>{tag.name}</option>
        ))}
      </select>
      <button onClick={handleSave} data-testid="save-button">Save</button>
      {formState.errors.title && (
        <span data-testid="title-error">{formState.errors.title}</span>
      )}
      {formState.isSaving && <span data-testid="saving-indicator">Saving...</span>}
    </div>
  );
};

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
  });

  it('validates fields and shows errors', async () => {
    render(
      <CardFormProvider initialCard={mockCard} allTags={mockTags} onSave={mockOnSave}>
        <TestComponent />
      </CardFormProvider>
    );

    const titleInput = screen.getByTestId('title-input');
    await userEvent.clear(titleInput);
    const saveButton = screen.getByTestId('save-button');
    await userEvent.click(saveButton);

    expect(await screen.findByTestId('title-error')).toBeInTheDocument();
  });

  it('calls onSave with updated data when form is valid', async () => {
    render(
      <CardFormProvider initialCard={mockCard} allTags={mockTags} onSave={mockOnSave}>
        <TestComponent />
      </CardFormProvider>
    );

    const titleInput = screen.getByTestId('title-input');
    await userEvent.clear(titleInput);
    await userEvent.type(titleInput, 'New Title');

    const saveButton = screen.getByTestId('save-button');
    await userEvent.click(saveButton);

    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'New Title' }),
        expect.any(Array)
      );
    });
  });

  it('shows loading state during save', async () => {
    mockOnSave.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));

    render(
      <CardFormProvider initialCard={mockCard} allTags={mockTags} onSave={mockOnSave}>
        <TestComponent />
      </CardFormProvider>
    );

    const saveButton = screen.getByTestId('save-button');
    await userEvent.click(saveButton);

    expect(await screen.findByTestId('saving-indicator')).toBeInTheDocument();
  });

  it('handles tag selection', async () => {
    render(
      <CardFormProvider initialCard={mockCard} allTags={mockTags} onSave={mockOnSave}>
        <TestComponent />
      </CardFormProvider>
    );

    const tagSelect = screen.getByTestId('tag-select');
    await userEvent.selectOptions(tagSelect, ['tag-1', 'tag-2']);

    const saveButton = screen.getByTestId('save-button');
    await userEvent.click(saveButton);

    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalledWith(
        expect.any(Object),
        expect.arrayContaining([
          expect.objectContaining({ id: 'tag-1' }),
          expect.objectContaining({ id: 'tag-2' })
        ])
      );
    });
  });

  it('maintains dirty state', async () => {
    render(
      <CardFormProvider initialCard={mockCard} allTags={mockTags} onSave={mockOnSave}>
        <TestComponent />
      </CardFormProvider>
    );

    const titleInput = screen.getByTestId('title-input');
    await userEvent.clear(titleInput);
    await userEvent.type(titleInput, 'New Title');

    // Check if beforeunload event is prevented
    const beforeunloadEvent = new Event('beforeunload');
    beforeunloadEvent.preventDefault = jest.fn();
    window.dispatchEvent(beforeunloadEvent);

    expect(beforeunloadEvent.preventDefault).toHaveBeenCalled();
  });
}); 