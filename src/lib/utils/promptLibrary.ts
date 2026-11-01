import type { Question } from '@/lib/types/question';

export const PROMPT_NEEDS_ORGANIZATION_FILTER = '__needs_prompt_organization__';

export function promptNeedsOrganization(question: Question): boolean {
  return !question.category || !question.topic;
}

function compareWithinPromptGroup(a: Question, b: Question): number {
  return a.promptOrder - b.promptOrder ||
    a.prompt.localeCompare(b.prompt) ||
    a.docId.localeCompare(b.docId);
}

export function getPromptOrderSiblings(question: Question, questions: Question[]): Question[] {
  return questions
    .filter(candidate =>
      candidate.category === question.category &&
      candidate.topic === question.topic &&
      candidate.promptKind === question.promptKind &&
      (question.promptKind === 'primary' || candidate.parentQuestionId === question.parentQuestionId)
    )
    .sort(compareWithinPromptGroup);
}

export function orderPromptLibraryQuestions(questions: Question[]): Question[] {
  const topicKeys = Array.from(new Set(questions.map(question =>
    JSON.stringify([question.category, question.topic])
  ))).sort((left, right) => {
    const [leftCategory, leftTopic] = JSON.parse(left) as [string, string];
    const [rightCategory, rightTopic] = JSON.parse(right) as [string, string];
    return leftCategory.localeCompare(rightCategory) || leftTopic.localeCompare(rightTopic);
  });

  const ordered: Question[] = [];
  for (const key of topicKeys) {
    const [category, topic] = JSON.parse(key) as [string, string];
    const topicQuestions = questions.filter(question =>
      question.category === category && question.topic === topic
    );
    const primaries = topicQuestions
      .filter(question => question.promptKind === 'primary')
      .sort(compareWithinPromptGroup);
    const placedFollowupIds = new Set<string>();

    for (const primary of primaries) {
      ordered.push(primary);
      const followups = topicQuestions
        .filter(question => question.promptKind === 'followup' && question.parentQuestionId === primary.docId)
        .sort(compareWithinPromptGroup);
      followups.forEach(question => placedFollowupIds.add(question.docId));
      ordered.push(...followups);
    }

    ordered.push(...topicQuestions
      .filter(question => question.promptKind === 'followup' && !placedFollowupIds.has(question.docId))
      .sort(compareWithinPromptGroup));
  }
  return ordered;
}
