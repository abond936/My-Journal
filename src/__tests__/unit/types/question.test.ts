import { createQuestionSchema, questionSchema, updateQuestionSchema } from '@/lib/types/question';

describe('Question subject contract', () => {
  it('accepts multiple subjects on create and update', () => {
    expect(createQuestionSchema.parse({
      prompt: 'Who influenced you?',
      tagIds: ['alan', 'bob'],
      subjectTagIds: ['alan', 'bob'],
    }).subjectTagIds).toEqual(['alan', 'bob']);
    expect(updateQuestionSchema.parse({ subjectTagIds: ['bob'] })).toEqual({ subjectTagIds: ['bob'] });
  });

  it('normalizes absent stored subject collections to empty', () => {
    const parsed = questionSchema.parse({
      docId: 'q1', prompt: 'Question?', prompt_lowercase: 'question?',
      tagIds: [], tags: [], usedByCardIds: [], usageCount: 0, createdAt: 1, updatedAt: 1,
    });
    expect(parsed.subjectTagIds).toEqual([]);
    expect(parsed.subjectFilterTags).toEqual({});
  });
});
