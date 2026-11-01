import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import StudioQuestionsPane from '@/components/admin/studio/StudioQuestionsPane';
import type { Question } from '@/lib/types/question';

const routerReplace = jest.fn();
const requestSelectCard = jest.fn();
const registerQuestionCardDeleteSync = jest.fn();
const insertPromptText = jest.fn(() => true);
const feedback = {
  showError: jest.fn(),
  showSuccess: jest.fn(),
  confirm: jest.fn(),
};
let selectedCardId: string | null = null;

const questions: Question[] = [
  {
    docId: 'unlinked',
    prompt: 'What happened at the beach?',
    prompt_lowercase: 'what happened at the beach?',
    tagIds: [],
    subjectTagIds: [],
    subjectFilterTags: {},
    tags: [],
    usedByCardIds: [],
    usageCount: 0,
    category: 'Life',
    topic: 'Trips',
    promptKind: 'primary',
    parentQuestionId: null,
    promptOrder: 0,
    createdAt: 1,
    updatedAt: 1,
  },
  {
    docId: 'unlinked-followup',
    prompt: 'What could you hear?',
    prompt_lowercase: 'what could you hear?',
    tagIds: [],
    subjectTagIds: [],
    subjectFilterTags: {},
    tags: [],
    usedByCardIds: [],
    usageCount: 0,
    category: 'Life',
    topic: 'Trips',
    promptKind: 'followup',
    parentQuestionId: 'unlinked',
    promptOrder: 0,
    createdAt: 2,
    updatedAt: 2,
  },
  {
    docId: 'linked',
    prompt: 'Who taught you to cook?',
    prompt_lowercase: 'who taught you to cook?',
    tagIds: [],
    subjectTagIds: [],
    subjectFilterTags: {},
    tags: [],
    usedByCardIds: ['card-existing'],
    usageCount: 1,
    category: 'Life',
    topic: 'Food',
    promptKind: 'primary',
    parentQuestionId: null,
    promptOrder: 0,
    createdAt: 1,
    updatedAt: 1,
  },
];

jest.mock('next/navigation', () => ({
  useRouter: () => ({ replace: routerReplace }),
}));

jest.mock('@/components/providers/AppFeedbackProvider', () => ({
  useAppFeedback: () => feedback,
}));

jest.mock('@/components/providers/TagProvider', () => ({
  useTag: () => ({
    tags: [],
    dimensionTree: { who: [], what: [], when: [], where: [] },
  }),
}));

jest.mock('@/components/admin/studio/StudioShellContext', () => ({
  useStudioShell: () => ({
    selectCard: jest.fn(),
    requestSelectCard,
    getKnownCardPreview: jest.fn(() => null),
    selectedCardId,
    selectedPreview: null,
    selectedDetail: null,
    setSelectedPreview: jest.fn(),
    setSelectedDetail: jest.fn(),
    upsertCollectionsCardList: jest.fn(),
    registerQuestionCardDeleteSync,
    selectedLoadState: 'idle',
    insertPromptText,
  }),
}));

jest.mock('@/components/admin/studio/cards/EditModal', () => ({
  __esModule: true,
  default: () => null,
}));
jest.mock('@/components/admin/studio/cards/MacroTagSelector', () => ({
  __esModule: true,
  default: () => null,
}));
jest.mock('@/components/admin/common/CardDimensionalTagCommandBar', () => ({
  __esModule: true,
  default: () => null,
}));
jest.mock('@/components/admin/common/DimensionalTagVerticalChips', () => ({
  __esModule: true,
  default: () => null,
}));
jest.mock('@/components/admin/common/DebouncedSearchInput', () => ({
  __esModule: true,
  default: () => null,
}));

describe('StudioQuestionsPane Card-first entry', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    selectedCardId = null;
    requestSelectCard.mockResolvedValue(true);
    feedback.confirm.mockResolvedValue(true);
    global.fetch = jest.fn(async (input: RequestInfo | URL) => {
      if (String(input) === '/api/admin/questions') {
        return {
          ok: true,
          status: 200,
          json: async () => ({ questions }),
        } as Response;
      }
      throw new Error(`Unexpected request: ${String(input)}`);
    }) as jest.Mock;
  });

  it('starts ordinary writing in Cards without creating a linked answer record', async () => {
    render(<StudioQuestionsPane />);

    const [start] = await screen.findAllByRole('button', { name: 'Start a Card before adding prompts' });
    expect(screen.queryByRole('button', { name: 'Create answer card in Compose' })).not.toBeInTheDocument();
    fireEvent.click(start);

    expect(routerReplace).toHaveBeenCalledWith('/admin/studio?destination=cards&new=1');
    expect(global.fetch).not.toHaveBeenCalledWith(
      expect.stringContaining('/create-card'),
      expect.anything()
    );
  });

  it('preserves access to an existing legacy linked Question Card', async () => {
    render(<StudioQuestionsPane />);

    fireEvent.click(await screen.findByRole('button', { name: 'Open linked Question Card in Compose' }));

    await waitFor(() => expect(requestSelectCard).toHaveBeenCalledWith(
      'card-existing',
      expect.objectContaining({ docId: 'card-existing', type: 'qa', title: 'Who taught you to cook?' })
    ));
    expect(routerReplace).toHaveBeenCalledWith('/admin/studio?card=card-existing');
  });

  it('copies one primary question with its ordered follow-ups into the open Card', async () => {
    selectedCardId = 'card-draft';
    render(<StudioQuestionsPane />);

    fireEvent.click(await screen.findByRole('button', {
      name: 'Add primary question and 1 follow-up to open Card',
    }));

    expect(insertPromptText.mock.calls.map(([request]) => request)).toEqual([
      { prompt: 'What happened at the beach?', role: 'primary' },
      { prompt: 'What could you hear?', role: 'followup' },
    ]);
    expect(feedback.showSuccess).toHaveBeenCalledWith('2 related prompts copied into the open Card.');
  });

  it('lets the author choose the survivor for an exact duplicate group', async () => {
    const duplicate = {
      ...questions[0],
      docId: 'unlinked-duplicate',
      category: 'Older',
      topic: 'Unsorted',
      createdAt: 3,
      updatedAt: 3,
    };
    let loadCount = 0;
    global.fetch = jest.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      if (String(input) === '/api/admin/questions' && !init?.method) {
        loadCount += 1;
        return {
          ok: true,
          status: 200,
          json: async () => ({ questions: loadCount === 1 ? [...questions, duplicate] : questions }),
        } as Response;
      }
      if (String(input) === '/api/admin/questions/consolidate') {
        return {
          ok: true,
          status: 200,
          json: async () => ({ question: questions[0] }),
        } as Response;
      }
      throw new Error(`Unexpected request: ${String(input)}`);
    }) as jest.Mock;

    render(<StudioQuestionsPane />);
    const actions = await screen.findAllByRole('button', {
      name: 'Keep this Prompt and consolidate exact duplicates',
    });
    fireEvent.click(actions[0]);

    await waitFor(() => expect(global.fetch).toHaveBeenCalledWith(
      '/api/admin/questions/consolidate',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ survivorId: 'unlinked' }),
      })
    ));
    expect(feedback.confirm).toHaveBeenCalledWith(expect.objectContaining({
      confirmLabel: 'Keep and consolidate',
    }));
    await waitFor(() => expect(feedback.showSuccess).toHaveBeenCalledWith(
      'Exact duplicate prompts were consolidated without changing any Question Card.'
    ));
  });
});
