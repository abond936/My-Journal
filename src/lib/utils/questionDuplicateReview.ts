import type { Question } from '@/lib/types/question';

export type ExactQuestionDuplicateGroup = {
  key: string;
  questions: Question[];
  linkedCardIds: string[];
  canConsolidate: boolean;
  blockedReason?: string;
};

function duplicateKey(question: Question): string {
  const normalized = question.prompt.trim().replace(/\s+/g, ' ').toLowerCase();
  const parent = question.promptKind === 'followup' ? question.parentQuestionId ?? 'missing-parent' : '';
  return `${question.promptKind}|${parent}|${normalized}`;
}

export function findExactQuestionDuplicateGroups(
  questions: Question[]
): ExactQuestionDuplicateGroup[] {
  const byKey = new Map<string, Question[]>();
  for (const question of questions) {
    const key = duplicateKey(question);
    byKey.set(key, [...(byKey.get(key) ?? []), question]);
  }
  return [...byKey.entries()]
    .filter(([, members]) => members.length > 1)
    .map(([key, members]) => {
      const linkedCardIds = [...new Set(members.flatMap((question) => question.usedByCardIds))];
      return {
        key,
        questions: [...members].sort((a, b) =>
          a.createdAt - b.createdAt || a.docId.localeCompare(b.docId)
        ),
        linkedCardIds,
        canConsolidate: linkedCardIds.length <= 1 && members.length <= 25,
        ...(linkedCardIds.length > 1
          ? { blockedReason: 'These prompts own different Question Cards and must remain separate.' }
          : members.length > 25
            ? { blockedReason: 'This unusually large duplicate group requires bounded review.' }
            : {}),
      };
    })
    .sort((a, b) => a.questions[0].prompt.localeCompare(b.questions[0].prompt));
}

export function exactQuestionDuplicateGroupForSurvivor(
  questions: Question[],
  survivorId: string
): ExactQuestionDuplicateGroup | null {
  return findExactQuestionDuplicateGroups(questions)
    .find((group) => group.questions.some((question) => question.docId === survivorId)) ?? null;
}
