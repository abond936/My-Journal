import React from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CardForm from '@/components/admin/studio/cards/CardForm';
import { CardFormProvider } from '@/components/providers/CardFormProvider';
import { Card } from '@/lib/types/card';
import { Tag } from '@/lib/types/tag';

const confirmMock = jest.fn();
const showErrorMock = jest.fn();
const mockInsertPrompt = jest.fn();
let registeredPromptInsert:
  | ((request: { prompt: string; role: 'primary' | 'followup' }) => void)
  | null = null;
let mockAuthoringSurface: {
  compact?: boolean;
  mobileStoryFlow?: boolean;
  registerPromptTextInsert?: (
    handler: ((request: { prompt: string; role: 'primary' | 'followup' }) => void) | null
  ) => void;
} | null = null;

jest.mock('react-dnd', () => ({
  DndProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock('react-dnd-html5-backend', () => ({
  HTML5Backend: {},
}));

jest.mock('swiper/react', () => ({
  Swiper: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SwiperSlide: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
jest.mock('swiper/css', () => ({}), { virtual: true });

jest.mock('@/components/admin/studio/cards/CoverPhotoContainer', () => {
  return function MockCoverPhotoContainer(props: {
    onCommit?: (media: null, position?: string) => void;
  }) {
    return (
      <div>
        <div data-testid="mock-cover-photo">Mock Cover Photo</div>
        <button
          type="button"
          data-testid="mock-cover-clear"
          onClick={() => void props.onCommit?.(null)}
        >
          Clear Cover
        </button>
      </div>
    );
  };
});

jest.mock('@/components/admin/studio/cards/ComposeFeedTilePreview', () => {
  return function MockComposeFeedTilePreview() {
    return <div data-testid="mock-reader-preview">Mock Reader Preview</div>;
  };
});

jest.mock('@/components/admin/studio/cards/GalleryManager', () => {
  return function MockGalleryManager() {
    return <div data-testid="mock-gallery">Mock Gallery</div>;
  };
});

jest.mock('@/components/admin/studio/cards/MacroTagSelector', () => {
  return function MockMacroTagSelector() {
    return <div data-testid="mock-tag-selector">Mock Tag Selector</div>;
  };
});

jest.mock('@/components/admin/common/CardDimensionalTagCommandBar', () => {
  return function MockCardDimensionalTagCommandBar({
    onUpdateTags,
  }: {
    onUpdateTags?: (tags: string[]) => void;
  }) {
    return (
      <button
        type="button"
        data-testid="mock-tag-command-bar"
        onClick={() => onUpdateTags?.(['tag-1', 'tag-2'])}
      >
        Mock Tag Command Bar
      </button>
    );
  };
});

jest.mock('@/components/admin/studio/cards/ChildCardManager', () => {
  return function MockChildCardManager() {
    return <div data-testid="mock-child-manager">Mock Child Manager</div>;
  };
});

jest.mock('@/components/common/RichTextEditor', () => {
  return React.forwardRef(function MockRichTextEditor(
    {
      initialContent,
      onChange,
    }: {
      initialContent?: string;
      onChange: (content: string) => void;
    },
    ref
  ) {
    const [value, setValue] = React.useState(initialContent || '');
    React.useImperativeHandle(ref, () => ({
      getContent: () => value,
      insertImage: jest.fn(),
      insertPrompt: mockInsertPrompt,
    }));
    return (
      <textarea
        data-testid="mock-editor"
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          onChange(e.target.value);
        }}
      />
    );
  });
});

jest.mock('@/components/authoring/CardFormSurfaceContext', () => ({
  useCardFormSurfaceOptional: () => mockAuthoringSurface,
}));

jest.mock('@/components/admin/studio/StudioShellContext', () => ({
  useStudioShellOptional: () => null,
}));

jest.mock('@/components/providers/AppFeedbackProvider', () => ({
  useAppFeedback: () => ({
    alert: jest.fn(async () => undefined),
    confirm: confirmMock,
    showError: showErrorMock,
  }),
}));

jest.mock('@/components/admin/studio/studioRelationshipDndPrimitives', () => ({
  StudioDropZone: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock('@/components/admin/studio/StudioCardFormGallery', () => {
  return function MockStudioCardFormGallery() {
    return <div data-testid="mock-studio-gallery">Mock Studio Gallery</div>;
  };
});

jest.mock('@/components/admin/studio/StudioCardFormChildren', () => {
  return function MockStudioCardFormChildren() {
    return <div data-testid="mock-studio-children">Mock Studio Children</div>;
  };
});

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

describe('CardForm', () => {
  const mockOnSave = jest.fn();

  const renderCardForm = (initialCard: Card = mockCard) =>
    render(
      <CardFormProvider initialCard={initialCard} allTags={mockTags} onSave={mockOnSave}>
        <CardForm />
      </CardFormProvider>
    );

  beforeEach(() => {
    jest.clearAllMocks();
    mockAuthoringSurface = null;
    registeredPromptInsert = null;
    confirmMock.mockResolvedValue(true);
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        settings: {
          galleryTagInheritance: {
            who: true,
            what: true,
            when: true,
            where: true,
          },
          galleryTagInheritanceConfigured: true,
        },
      }),
    }) as jest.Mock;
  });

  it('uses the first primary Prompt as an empty Question Card title and keeps follow-ups in the body', () => {
    mockAuthoringSurface = {
      registerPromptTextInsert: (handler) => {
        registeredPromptInsert = handler;
      },
    };
    renderCardForm({
      ...mockCard,
      title: '',
      title_lowercase: '',
      type: 'qa',
    });

    act(() => {
      registeredPromptInsert?.({ prompt: 'What happened at the beach?', role: 'primary' });
    });
    expect(screen.getByPlaceholderText('Card Title')).toHaveValue('What happened at the beach?');
    expect(mockInsertPrompt).not.toHaveBeenCalled();

    act(() => {
      registeredPromptInsert?.({ prompt: 'What could you hear?', role: 'followup' });
    });
    expect(mockInsertPrompt).toHaveBeenCalledWith('What could you hear?');
  });

  it('does not overwrite an existing Question Card title with a primary Prompt', () => {
    mockAuthoringSurface = {
      registerPromptTextInsert: (handler) => {
        registeredPromptInsert = handler;
      },
    };
    renderCardForm({
      ...mockCard,
      title: 'My chosen title',
      title_lowercase: 'my chosen title',
      type: 'qa',
    });

    act(() => {
      registeredPromptInsert?.({ prompt: 'What happened at the beach?', role: 'primary' });
    });
    expect(screen.getByPlaceholderText('Card Title')).toHaveValue('My chosen title');
    expect(mockInsertPrompt).toHaveBeenCalledWith('What happened at the beach?');
  });

  it('keeps a primary Prompt in the body for a Story Card', () => {
    mockAuthoringSurface = {
      registerPromptTextInsert: (handler) => {
        registeredPromptInsert = handler;
      },
    };
    renderCardForm({
      ...mockCard,
      title: '',
      title_lowercase: '',
      type: 'story',
    });

    act(() => {
      registeredPromptInsert?.({ prompt: 'What happened at the beach?', role: 'primary' });
    });
    expect(screen.getByPlaceholderText('Card Title')).toHaveValue('');
    expect(mockInsertPrompt).toHaveBeenCalledWith('What happened at the beach?');
  });

  it('shows one mobile Story workflow panel at a time', async () => {
    const user = userEvent.setup();
    mockAuthoringSurface = { compact: true, mobileStoryFlow: true };

    renderCardForm();

    expect(screen.getByRole('button', { name: 'Words' })).toHaveAttribute('aria-current', 'step');
    expect(screen.getByTestId('mock-editor')).toBeVisible();
    expect(screen.getByTestId('mock-cover-photo')).not.toBeVisible();

    await user.click(screen.getByRole('button', { name: 'Media' }));

    expect(screen.getByRole('button', { name: 'Media' })).toHaveAttribute('aria-current', 'step');
    expect(screen.getByTestId('mock-editor')).not.toBeVisible();
    expect(screen.getByTestId('mock-cover-photo')).toBeVisible();
  });

  it('asks before a manual tag change overrides an inherited dimension', async () => {
    const inheritedCard: Card = {
      ...mockCard,
      tags: ['tag-1'],
      galleryTagInheritanceOverrides: { who: false, what: false, when: false, where: false },
    };
    mockOnSave.mockResolvedValue({
      ...inheritedCard,
      tags: ['tag-1', 'tag-2'],
      galleryTagInheritanceOverrides: { who: false, what: true, when: false, where: false },
    });
    renderCardForm(inheritedCard);

    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    await userEvent.click(screen.getByTestId('mock-tag-command-bar'));

    await waitFor(() => expect(confirmMock).toHaveBeenCalled());
    expect(confirmMock).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Stop inheriting What?',
        confirmLabel: 'Stop inheriting and change',
      })
    );
    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalledWith(
        expect.objectContaining({
          tags: ['tag-1', 'tag-2'],
          galleryTagInheritanceOverrides: { who: false, what: true, when: false, where: false },
        })
      );
    });
  });

  it('keeps inherited tags unchanged when override confirmation is cancelled', async () => {
    confirmMock.mockResolvedValue(false);
    const inheritedCard: Card = {
      ...mockCard,
      tags: ['tag-1'],
      galleryTagInheritanceOverrides: { who: false, what: false, when: false, where: false },
    };
    renderCardForm(inheritedCard);

    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    await userEvent.click(screen.getByTestId('mock-tag-command-bar'));
    await waitFor(() => expect(confirmMock).toHaveBeenCalled());

    expect(mockOnSave).not.toHaveBeenCalled();
  });

  it('renders all main form sections', () => {
    renderCardForm();

    expect(screen.getByPlaceholderText('Card Title')).toBeInTheDocument();
    expect(screen.getByTestId('mock-editor')).toBeInTheDocument();
    expect(screen.getByTestId('mock-cover-photo')).toBeInTheDocument();
    expect(screen.getByTestId('mock-gallery')).toBeInTheDocument();
    expect(screen.getByTestId('mock-tag-command-bar')).toBeInTheDocument();
    expect(screen.getByTestId('mock-child-manager')).toBeInTheDocument();
  });

  it('saves title on blur for existing cards', async () => {
    mockOnSave.mockResolvedValue({
      ...mockCard,
      title: 'Renamed Card',
      title_lowercase: 'renamed card',
    });

    renderCardForm();

    const titleInput = screen.getByPlaceholderText('Card Title');
    await userEvent.clear(titleInput);
    await userEvent.type(titleInput, 'Renamed Card');
    titleInput.blur();

    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalledWith(expect.objectContaining({ title: 'Renamed Card' }));
    });
  });

  it('saves subtitle on blur', async () => {
    mockOnSave.mockResolvedValue({
      ...mockCard,
      subtitle: 'A subtitle',
    });

    renderCardForm();

    const subtitleInput = screen.getByPlaceholderText('Subtitle');
    await userEvent.type(subtitleInput, 'A subtitle');
    subtitleInput.blur();

    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalledWith({ subtitle: 'A subtitle' });
    });
  });

  it('saves status on change', async () => {
    mockOnSave.mockResolvedValue({
      ...mockCard,
      status: 'published',
    });

    renderCardForm();

    const statusSelect = screen.getByLabelText('Status');
    await userEvent.selectOptions(statusSelect, 'published');

    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalledWith({ status: 'published' });
    });
  });

  it('warns that edits to a published Card may be visible to readers', async () => {
    renderCardForm({ ...mockCard, status: 'published' });

    expect(screen.getByRole('note')).toHaveTextContent(
      'Saved changes may be visible to readers. Return it to Draft first if you want to take it offline while editing.'
    );
  });

  it('reviews exact Reader losses before removing a published Card from Feed', async () => {
    mockOnSave.mockResolvedValue({ ...mockCard, status: 'published', feedIncluded: false });
    global.fetch = jest.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith('/audience-impact') && init?.method === 'POST') {
        return {
          ok: true,
          json: async () => ({ impact: {
            basis: 'current_after_save', standaloneIncluded: false,
            effectiveReaders: [{ contactId: 'reader-2', displayName: 'Blair' }],
            gainingReaders: [],
            losingReaders: [{ contactId: 'reader-1', displayName: 'Alex' }],
            otherRoutes: [],
          } }),
        } as Response;
      }
      return {
        ok: true,
        json: async () => ({ settings: {
          galleryTagInheritance: { who: true, what: true, when: true, where: true },
          galleryTagInheritanceConfigured: true,
        } }),
      } as Response;
    }) as typeof fetch;
    renderCardForm({
      ...mockCard,
      status: 'published',
      feedIncluded: true,
      audience: { allContacts: false, groupIds: [], contactIds: ['reader-1'] },
    });

    await userEvent.click(screen.getAllByLabelText('Include in Reader Feed')[0]);

    await waitFor(() => expect(confirmMock).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Remove published Story from Reader Feed?',
      message: expect.stringContaining('Readers losing access: Alex'),
    })));
    await waitFor(() => expect(mockOnSave).toHaveBeenCalledWith({ feedIncluded: false }));
  });

  it('returns to Draft and explains why a publication attempt was blocked', async () => {
    mockOnSave.mockRejectedValue(
      new Error('This Card cannot be published yet: review Card what, when, where.')
    );

    renderCardForm();

    const statusSelect = screen.getByLabelText('Status');
    await userEvent.selectOptions(statusSelect, 'published');

    await waitFor(() => expect(statusSelect).toHaveValue('draft'));
    expect(showErrorMock).toHaveBeenCalledWith(
      'This Card cannot be published yet: review Card what, when, where.',
      'Card not updated'
    );
  });

  it('saves tags on command-bar update', async () => {
    mockOnSave.mockResolvedValue({
      ...mockCard,
      tags: ['tag-1', 'tag-2'],
    });

    renderCardForm();

    await userEvent.click(screen.getByTestId('mock-tag-command-bar'));

    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalledWith({ tags: ['tag-1', 'tag-2'] });
    });
  });

  it('does not save rich text on change alone', async () => {
    renderCardForm();

    const editor = screen.getByTestId('mock-editor');
    await userEvent.type(editor, 'Updated body');

    expect(mockOnSave).not.toHaveBeenCalled();
  });

  it('clears cover through the narrow cover patch without sending a null focal point', async () => {
    mockOnSave.mockResolvedValue({
      ...mockCard,
      coverImageId: null,
      coverImage: null,
    });

    renderCardForm();

    await userEvent.click(screen.getByTestId('mock-cover-clear'));

    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalledWith({ coverImageId: null, coverImageRotation: 0 });
    });
  });
});
