import { findExactQuestionDuplicateGroups } from '@/lib/utils/questionDuplicateReview';
import type { Question } from '@/lib/types/question';

function question(
  docId: string,
  prompt: string,
  overrides: Partial<Question> = {}
): Question {
  return {
    docId,
    prompt,
    prompt_lowercase: prompt.toLowerCase(),
    tagIds: [],
    subjectTagIds: [],
    subjectFilterTags: {},
    tags: [],
    usedByCardIds: [],
    usageCount: 0,
    category: '',
    topic: '',
    promptKind: 'primary',
    parentQuestionId: null,
    promptOrder: 0,
    createdAt: 1,
    updatedAt: 1,
    ...overrides,
  };
}

describe('exact Prompt duplicate review', () => {
  it('groups normalized exact primary text but not merely similar text', () => {
    const groups = findExactQuestionDuplicateGroups([
      question('one', 'What happened at the beach?'),
      question('two', '  WHAT happened   at the beach? '),
      question('three', 'What happened at the beach that day?'),
    ]);

    expect(groups).toHaveLength(1);
    expect(groups[0].questions.map((item) => item.docId)).toEqual(['one', 'two']);
    expect(groups[0].canConsolidate).toBe(true);
  });

  it('keeps identical follow-up text under different primary prompts separate', () => {
    expect(findExactQuestionDuplicateGroups([
      question('one', 'How did that feel?', { promptKind: 'followup', parentQuestionId: 'primary-a' }),
      question('two', 'How did that feel?', { promptKind: 'followup', parentQuestionId: 'primary-b' }),
    ])).toEqual([]);
  });

  it('blocks a group that owns different Question Cards', () => {
    const [group] = findExactQuestionDuplicateGroups([
      question('one', 'Who helped you?', { usedByCardIds: ['card-a'], usageCount: 1 }),
      question('two', 'Who helped you?', { usedByCardIds: ['card-b'], usageCount: 1 }),
    ]);

    expect(group.canConsolidate).toBe(false);
    expect(group.blockedReason).toMatch(/different Question Cards/);
  });
});
