export type QuestionPromptLength = 'standard' | 'compact' | 'dense';

/** Keep one proportional Question face while fitting unusually long prompts. */
export function getQuestionPromptLength(title: string): QuestionPromptLength {
  const length = title.trim().length;
  if (length > 84) return 'dense';
  if (length > 54) return 'compact';
  return 'standard';
}
