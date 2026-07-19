import type { CardUpdate } from '@/lib/types/card';

export type QuestionRevealValidation = {
  valid: boolean;
  imageCount: number;
  message?: string;
};

/** Structural rules that can be enforced independently of responsive layout measurement. */
export function validateQuestionRevealContent(card: CardUpdate): QuestionRevealValidation {
  if (card.type !== 'qa' || card.displayMode !== 'inline') {
    return { valid: true, imageCount: 0 };
  }

  const content = card.content?.trim() ?? '';
  if (!content) {
    return {
      valid: false,
      imageCount: 0,
      message: 'A Reveal question needs an answer in Content.',
    };
  }

  const figureCount = (content.match(/<figure\b[^>]*data-figure-with-image/gi) ?? []).length;
  const imageCount = figureCount > 0 ? figureCount : (content.match(/<img\b/gi) ?? []).length;
  if (imageCount > 1) {
    return {
      valid: false,
      imageCount,
      message: 'A Reveal answer can contain one image. Remove the additional images or use Open.',
    };
  }

  return { valid: true, imageCount };
}
