import type { Card } from '@/lib/types/card';
import { QuestionAnswerConflictError } from '@/lib/services/questionService';
import { removeCardFromTypesense, syncCardToTypesense } from '@/lib/services/typesenseService';

export async function withCardMutationRetry<T>(
  operation: () => Promise<T>,
  maxRetries = 3,
  baseDelay = 1000
): Promise<T> {
  let lastError: Error | undefined;
  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (
        lastError.message.includes('permission') ||
        lastError.message.includes('validation') ||
        lastError.message.includes('not found') ||
        error instanceof QuestionAnswerConflictError
      ) {
        throw error;
      }
      if (attempt === maxRetries) {
        console.error(`Operation failed after ${maxRetries + 1} attempts:`, lastError);
        throw lastError;
      }
      const delay = baseDelay * 2 ** attempt;
      console.warn(
        `Operation failed (attempt ${attempt + 1}/${maxRetries + 1}), retrying in ${delay}ms:`,
        lastError.message
      );
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  throw lastError ?? new Error('Card mutation failed without an error.');
}

export function syncCardProjection(card: Card): void {
  void syncCardToTypesense(card);
}

export async function syncCardProjections(cards: Card[]): Promise<void> {
  await Promise.all(cards.map((card) => syncCardToTypesense(card)));
}

export function removeCardProjection(cardId: string): void {
  void removeCardFromTypesense(cardId);
}
