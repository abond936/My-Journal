import type { Card } from '@/lib/types/card';
import { AppError, ErrorCode } from '@/lib/types/error';
import type { Firestore } from 'firebase-admin/firestore';

const QUESTIONS_COLLECTION = 'questions';

export async function assertValidQuestionBackedQa(
  firestore: Firestore,
  candidate: Partial<Card>,
  existing?: Partial<Card>
): Promise<void> {
  const finalType = candidate.type ?? existing?.type ?? 'story';
  if (finalType !== 'qa') return;

  const questionId = candidate.questionId ?? existing?.questionId;
  if (!questionId) {
    throw new AppError(
      ErrorCode.VALIDATION_ERROR,
      'Q&A cards must be created from a question-bank prompt.'
    );
  }

  const questionSnap = await firestore.collection(QUESTIONS_COLLECTION).doc(questionId).get();
  if (!questionSnap.exists) {
    throw new AppError(
      ErrorCode.VALIDATION_ERROR,
      'Q&A card questionId must reference an existing question.'
    );
  }
}
