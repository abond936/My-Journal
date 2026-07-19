import { getQuestionPromptLength } from '@/lib/utils/questionPromptPresentation';

describe('getQuestionPromptLength', () => {
  it('classifies prompt lengths for proportional Question rendering', () => {
    expect(getQuestionPromptLength('What happened next?')).toBe('standard');
    expect(getQuestionPromptLength('A'.repeat(55))).toBe('compact');
    expect(getQuestionPromptLength('A'.repeat(85))).toBe('dense');
  });
});
