import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CardForm from '@/components/admin/card-admin/CardForm';
import { CardFormProvider } from '@/components/providers/CardFormProvider';
import { Card } from '@/lib/types/card';
import { Tag } from '@/lib/types/tag';

// Mock child components
jest.mock('@/components/admin/card-admin/CoverPhotoContainer', () => {
  return function MockCoverPhotoContainer({ onChange }: { onChange: (media: any) => void }) {
    return (
      <button
        data-testid="mock-cover-photo"
        onClick={() => onChange({ id: 'test-media-1', url: 'test.jpg' })}
      >
        Mock Cover Photo
      </button>
    );
  };
});

jest.mock('@/components/admin/card-admin/GalleryManager', () => {
  return function MockGalleryManager({ onChange }: { onChange: (media: any[]) => void }) {
    return (
      <button
        data-testid="mock-gallery"
        onClick={() => onChange([{ id: 'test-media-1', url: 'test.jpg' }])}
      >
        Mock Gallery
      </button>
    );
  };
});

jest.mock('@/components/admin/card-admin/MacroTagSelector', () => {
  return function MockMacroTagSelector({ onChange }: { onChange: (tags: string[]) => void }) {
    return (
      <button
        data-testid="mock-tag-selector"
        onClick={() => onChange(['tag-1', 'tag-2'])}
      >
        Mock Tag Selector
      </button>
    );
  };
});

jest.mock('@/components/admin/card-admin/ChildCardManager', () => {
  return function MockChildCardManager() {
    return <div data-testid="mock-child-manager">Mock Child Manager</div>;
  };
});

jest.mock('@/components/common/RichTextEditor', () => {
  return function MockRichTextEditor({ onChange }: { onChange: (content: string) => void }) {
    return (
      <textarea
        data-testid="mock-editor"
        onChange={(e) => onChange(e.target.value)}
      />
    );
  };
});

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

describe('CardForm', () => {
  const mockOnDelete = jest.fn();
  const mockOnSave = jest.fn();

  const renderCardForm = () => {
    return render(
      <CardFormProvider initialCard={mockCard} allTags={mockTags} onSave={mockOnSave}>
        <CardForm
          initialCard={mockCard}
          allTags={mockTags}
          onDelete={mockOnDelete}
        />
      </CardFormProvider>
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders all form sections', () => {
    renderCardForm();

    expect(screen.getByPlaceholderText('Card Title')).toBeInTheDocument();
    expect(screen.getByTestId('mock-editor')).toBeInTheDocument();
    expect(screen.getByTestId('mock-cover-photo')).toBeInTheDocument();
    expect(screen.getByTestId('mock-gallery')).toBeInTheDocument();
    expect(screen.getByTestId('mock-tag-selector')).toBeInTheDocument();
    expect(screen.getByTestId('mock-child-manager')).toBeInTheDocument();
  });

  it('updates title field', async () => {
    renderCardForm();

    const titleInput = screen.getByPlaceholderText('Card Title');
    await userEvent.clear(titleInput);
    await userEvent.type(titleInput, 'New Title');

    expect(titleInput).toHaveValue('New Title');
  });

  it('updates content field', async () => {
    renderCardForm();

    const editor = screen.getByTestId('mock-editor');
    await userEvent.type(editor, 'New content');

    expect(editor).toHaveValue('New content');
  });

  it('updates status field', async () => {
    renderCardForm();

    const statusSelect = screen.getByRole('combobox');
    await userEvent.selectOptions(statusSelect, 'published');

    expect(statusSelect).toHaveValue('published');
  });

  it('handles cover photo updates', async () => {
    renderCardForm();

    const coverPhotoButton = screen.getByTestId('mock-cover-photo');
    await userEvent.click(coverPhotoButton);

    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalledWith(
        expect.objectContaining({
          coverImageId: 'test-media-1'
        }),
        expect.any(Array)
      );
    });
  });

  it('handles gallery updates', async () => {
    renderCardForm();

    const galleryButton = screen.getByTestId('mock-gallery');
    await userEvent.click(galleryButton);

    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalledWith(
        expect.any(Object),
        expect.any(Array)
      );
    });
  });

  it('handles tag selection', async () => {
    renderCardForm();

    const tagButton = screen.getByTestId('mock-tag-selector');
    await userEvent.click(tagButton);

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

  it('shows validation errors', async () => {
    renderCardForm();

    const titleInput = screen.getByPlaceholderText('Card Title');
    await userEvent.clear(titleInput);

    const submitButton = screen.getByRole('button', { name: /save/i });
    await userEvent.click(submitButton);

    expect(await screen.findByText(/title is required/i)).toBeInTheDocument();
  });

  it('calls onSave with updated data when form is valid', async () => {
    renderCardForm();

    const titleInput = screen.getByPlaceholderText('Card Title');
    await userEvent.clear(titleInput);
    await userEvent.type(titleInput, 'New Title');

    const submitButton = screen.getByRole('button', { name: /save/i });
    await userEvent.click(submitButton);

    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'New Title'
        }),
        expect.any(Array)
      );
    });
  });

  it('shows loading state during save', async () => {
    mockOnSave.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));
    renderCardForm();

    const submitButton = screen.getByRole('button', { name: /save/i });
    await userEvent.click(submitButton);

    expect(await screen.findByText(/saving/i)).toBeInTheDocument();
  });

  it('prevents navigation when form is dirty', async () => {
    renderCardForm();

    const titleInput = screen.getByPlaceholderText('Card Title');
    await userEvent.clear(titleInput);
    await userEvent.type(titleInput, 'New Title');

    // Check if beforeunload event is prevented
    const beforeunloadEvent = new Event('beforeunload');
    beforeunloadEvent.preventDefault = jest.fn();
    window.dispatchEvent(beforeunloadEvent);

    expect(beforeunloadEvent.preventDefault).toHaveBeenCalled();
  });
}); 