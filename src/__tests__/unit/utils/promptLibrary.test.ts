import type { Question } from '@/lib/types/question';
import {
  getPromptOrderSiblings,
  orderPromptLibraryQuestions,
  promptNeedsOrganization,
} from '@/lib/utils/promptLibrary';

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
    subjectTagId: null,
    subjectTagIds: [],
    subjectFilterTags: {},
    tags: [],
    usedByCardIds: [],
    usageCount: 0,
    category: 'Life stories',
    topic: 'Childhood home',
    promptKind: 'primary',
    parentQuestionId: null,
    promptOrder: 0,
    createdAt: 1,
    updatedAt: 1,
    ...overrides,
  };
}

describe('Prompt Library ordering', () => {
  it('presents each primary with its directly ordered follow-ups', () => {
    const primaryOne = question('primary-1', 'First primary', { promptOrder: 0 });
    const primaryTwo = question('primary-2', 'Second primary', { promptOrder: 1 });
    const followupTwo = question('followup-2', 'Second follow-up', {
      promptKind: 'followup', parentQuestionId: primaryOne.docId, promptOrder: 1,
    });
    const followupOne = question('followup-1', 'First follow-up', {
      promptKind: 'followup', parentQuestionId: primaryOne.docId, promptOrder: 0,
    });

    expect(orderPromptLibraryQuestions([followupTwo, primaryTwo, followupOne, primaryOne]).map(item => item.docId))
      .toEqual(['primary-1', 'followup-1', 'followup-2', 'primary-2']);
  });

  it('limits primary order to a Topic and follow-up order to one primary', () => {
    const primaryOne = question('primary-1', 'First primary');
    const primaryTwo = question('primary-2', 'Second primary', { promptOrder: 1 });
    const otherTopic = question('primary-other', 'Other topic', { topic: 'School' });
    const followupOne = question('followup-1', 'First follow-up', {
      promptKind: 'followup', parentQuestionId: primaryOne.docId,
    });
    const followupTwo = question('followup-2', 'Other follow-up', {
      promptKind: 'followup', parentQuestionId: primaryTwo.docId,
    });
    const all = [primaryOne, primaryTwo, otherTopic, followupOne, followupTwo];

    expect(getPromptOrderSiblings(primaryOne, all).map(item => item.docId)).toEqual(['primary-1', 'primary-2']);
    expect(getPromptOrderSiblings(followupOne, all).map(item => item.docId)).toEqual(['followup-1']);
  });

  it('keeps incomplete Category or Topic placement in the manual curation queue', () => {
    expect(promptNeedsOrganization(question('legacy', 'Legacy prompt', { category: '', topic: '' }))).toBe(true);
    expect(promptNeedsOrganization(question('missing-topic', 'Missing topic', { topic: '' }))).toBe(true);
    expect(promptNeedsOrganization(question('organized', 'Organized prompt'))).toBe(false);
  });
});
