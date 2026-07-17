import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CardFormProvider, useCardForm } from '@/components/providers/CardFormProvider';
import { Card } from '@/lib/types/card';
import { Tag } from '@/lib/types/tag';

const confirmMock = jest.fn();

jest.mock('@/components/providers/AppFeedbackProvider', () => ({
  useAppFeedback: () => ({
    confirm: confirmMock,
    alert: jest.fn(async () => undefined),
    showSuccess: jest.fn(),
    showError: jest.fn(),
  }),
}));

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
  const { formState, setField, updateTags, handleSave, persistFieldPatch, isDirty, confirmLeaveIfDirtyAsync } = useCardForm();
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
      <button type="button" data-testid="tag-patch-button" onClick={() => void persistFieldPatch({ tags: ['tag-1'] })}>
        Patch tags
      </button>
      <button type="button" data-testid="tag-button" onClick={() => updateTags(mockTags)}>
        Set Tags
      </button>
      <button type="button" data-testid="save-button" onClick={() => void handleSave()}>
        Save
      </button>
      <button type="button" data-testid="leave-button" onClick={() => void confirmLeaveIfDirtyAsync()}>
        Leave
      </button>
      <span data-testid="dirty-flag">{isDirty ? 'dirty' : 'clean'}</span>
      <span data-testid="save-status">{formState.saveStatus}</span>
      <span data-testid="derived-tag-state">
        {JSON.stringify({
          tags: formState.cardData.tags,
          subjectTagId: formState.cardData.subjectTagId,
          subjectTagIds: formState.cardData.subjectTagIds,
          subjectFilterTags: formState.cardData.subjectFilterTags,
          filterTags: formState.cardData.filterTags,
          who: formState.cardData.who,
          galleryTagRollupStatuses: formState.cardData.galleryTagRollupStatuses,
          galleryImplicitSubjectTagIds: formState.cardData.galleryImplicitSubjectTagIds,
        })}
      </span>
      {formState.errors.title ? <span data-testid="title-error">{formState.errors.title}</span> : null}
      {formState.isSaving ? <span data-testid="saving-indicator">Saving...</span> : null}
    </div>
  );
}

describe('CardFormProvider', () => {
  const mockOnSave = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    confirmMock.mockResolvedValue(true);
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

  it('reports localized saving and saved states for instant field saves', async () => {
    let resolveSave!: (card: Card) => void;
    mockOnSave.mockImplementation(() => new Promise<Card>((resolve) => { resolveSave = resolve; }));

    render(
      <CardFormProvider initialCard={mockCard} allTags={mockTags} onSave={mockOnSave}>
        <TestComponent />
      </CardFormProvider>
    );

    await userEvent.click(screen.getByTestId('patch-button'));
    expect(screen.getByTestId('save-status')).toHaveTextContent('saving');

    resolveSave({ ...mockCard, title: 'Patched Title', title_lowercase: 'patched title' });
    await waitFor(() => expect(screen.getByTestId('save-status')).toHaveTextContent('saved'));
  });

  it('reconciles server-derived tag and subject truth after a tag patch', async () => {
    mockOnSave.mockResolvedValue({
      ...mockCard,
      tags: ['tag-1', 'who-ancestor'],
      subjectTagId: null,
      subjectTagIds: [],
      subjectFilterTags: {},
      filterTags: { 'tag-1': true, 'who-ancestor': true },
      who: ['tag-1', 'who-ancestor'],
      galleryTagRollupStatuses: {
        who: 'reviewed',
        what: 'empty',
        when: 'empty',
        where: 'empty',
      },
      galleryImplicitSubjectTagIds: ['tag-1'],
    });

    render(
      <CardFormProvider initialCard={{ ...mockCard, subjectTagId: 'removed-subject' }} allTags={mockTags} onSave={mockOnSave}>
        <TestComponent />
      </CardFormProvider>
    );

    await userEvent.click(screen.getByTestId('tag-patch-button'));

    await waitFor(() => expect(screen.getByTestId('save-status')).toHaveTextContent('saved'));
    expect(screen.getByTestId('derived-tag-state')).toHaveTextContent(
      JSON.stringify({
        tags: ['tag-1', 'who-ancestor'],
        subjectTagId: null,
        subjectTagIds: [],
        subjectFilterTags: {},
        filterTags: { 'tag-1': true, 'who-ancestor': true },
        who: ['tag-1', 'who-ancestor'],
        galleryTagRollupStatuses: {
          who: 'reviewed',
          what: 'empty',
          when: 'empty',
          where: 'empty',
        },
        galleryImplicitSubjectTagIds: ['tag-1'],
      })
    );
  });

  it('keeps a visible error state when an instant field save fails', async () => {
    mockOnSave.mockResolvedValue(null);

    render(
      <CardFormProvider initialCard={mockCard} allTags={mockTags} onSave={mockOnSave}>
        <TestComponent />
      </CardFormProvider>
    );

    await userEvent.click(screen.getByTestId('patch-button'));
    await waitFor(() => expect(screen.getByTestId('save-status')).toHaveTextContent('error'));
  });

  it('does not prompt on leave when nothing has marked the form dirty', async () => {
    render(
      <CardFormProvider initialCard={mockCard} allTags={mockTags} onSave={mockOnSave}>
        <TestComponent />
      </CardFormProvider>
    );

    await userEvent.click(screen.getByTestId('leave-button'));

    expect(confirmMock).not.toHaveBeenCalled();
  });
});
