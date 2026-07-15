import type { Person, PersonGroup } from '@/lib/types/archiveIdentity';
import type { Tag } from '@/lib/types/tag';
import { APPROVED_ALIAS_CLUSTERS } from '@/lib/data/approvedIdentityReview';

export type IdentityReviewClassification =
  | 'person'
  | 'relationship-role'
  | 'group'
  | 'structural'
  | 'ambiguous';

export type IdentityReviewAssignment = { id: string; tagIds: string[] };

export type IdentityReviewRow = {
  tagId: string;
  name: string;
  parentId?: string;
  childCount: number;
  classification: IdentityReviewClassification;
  confidence: 'confirmed' | 'candidate' | 'ambiguous';
  evidence: string[];
  direct: { cards: number; media: number; questions: number };
  subtree: { cards: number; media: number; questions: number };
};

export type IdentityReviewAliasCluster = {
  nodeTagId: string;
  nodeName: string;
  candidateTagIds: string[];
  candidateNames: string[];
  decision: 'approved' | 'pending';
  reason: string;
};

export type ArchiveIdentityReviewReport = {
  rows: IdentityReviewRow[];
  aliasClusters: IdentityReviewAliasCluster[];
};

const ROLE_WORDS = new Set([
  'parent', 'parents', 'father', 'mother', 'dad', 'mom', 'child', 'children',
  'son', 'daughter', 'sibling', 'siblings', 'brother', 'sister', 'spouse',
  'husband', 'wife', 'partner', 'grandparent', 'grandparents', 'grandfather',
  'grandmother', 'grandson', 'granddaughter', 'uncle', 'aunt', 'cousin', 'cousins',
  'grandkids',
]);

const STRUCTURAL_WORDS = new Set(['ancestry', 'family', 'friends', 'other', 'z-who']);

function countAssignments(assignments: IdentityReviewAssignment[], tagIds: Set<string>): number {
  return assignments.filter((item) => item.tagIds.some((tagId) => tagIds.has(tagId))).length;
}

export function buildArchiveIdentityReview(input: {
  tags: Tag[];
  people: Person[];
  groups: PersonGroup[];
  cards: IdentityReviewAssignment[];
  media: IdentityReviewAssignment[];
  questions: IdentityReviewAssignment[];
}): IdentityReviewRow[] {
  const whoTags = input.tags.filter((tag) => tag.docId && tag.dimension === 'who');
  const whoIds = new Set(whoTags.map((tag) => tag.docId!));
  const children = new Map<string, string[]>();
  for (const tag of whoTags) {
    if (!tag.parentId || !whoIds.has(tag.parentId)) continue;
    children.set(tag.parentId, [...(children.get(tag.parentId) ?? []), tag.docId!]);
  }
  const personLinks = new Map(input.people.flatMap((person) => person.linkedWhoTagId ? [[person.linkedWhoTagId, person]] : []));
  const groupLinks = new Map(input.groups.flatMap((group) => group.legacyWhoTagIds.map((tagId) => [tagId, group] as const)));

  const descendants = (rootId: string) => {
    const result = new Set([rootId]);
    const pending = [...(children.get(rootId) ?? [])];
    while (pending.length) {
      const id = pending.pop()!;
      if (result.has(id)) continue;
      result.add(id);
      pending.push(...(children.get(id) ?? []));
    }
    return result;
  };

  return whoTags.map((tag) => {
    const tagId = tag.docId!;
    const directIds = new Set([tagId]);
    const subtreeIds = descendants(tagId);
    const evidence: string[] = [];
    let classification: IdentityReviewClassification = 'ambiguous';
    let confidence: IdentityReviewRow['confidence'] = 'ambiguous';
    if (personLinks.has(tagId)) {
      classification = 'person'; confidence = 'confirmed'; evidence.push('Linked to an existing stable Person record.');
    } else if (groupLinks.has(tagId)) {
      classification = 'group'; confidence = 'confirmed'; evidence.push('Linked to an existing typed group.');
    } else if (ROLE_WORDS.has(tag.name.trim().toLowerCase())) {
      classification = 'relationship-role'; confidence = 'candidate'; evidence.push('Name is a perspective-relative family role.');
    } else if (/\s(?:&|and)\s/i.test(tag.name)) {
      classification = 'group'; confidence = 'candidate'; evidence.push('Name combines more than one identity.');
    } else if ((children.get(tagId)?.length ?? 0) > 0 || STRUCTURAL_WORDS.has(tag.name.trim().toLowerCase())) {
      classification = 'structural'; confidence = 'candidate'; evidence.push('Tag is a hierarchy node with Who children.');
    } else {
      classification = 'person'; confidence = 'candidate'; evidence.push('Leaf Who tag is a person candidate; author review is still required.');
    }
    if (tag.parentId) evidence.push('Parent context must be considered before conversion.');
    return {
      tagId,
      name: tag.name,
      parentId: tag.parentId,
      childCount: children.get(tagId)?.length ?? 0,
      classification,
      confidence,
      evidence,
      direct: {
        cards: countAssignments(input.cards, directIds),
        media: countAssignments(input.media, directIds),
        questions: countAssignments(input.questions, directIds),
      },
      subtree: {
        cards: countAssignments(input.cards, subtreeIds),
        media: countAssignments(input.media, subtreeIds),
        questions: countAssignments(input.questions, subtreeIds),
      },
    };
  }).sort((a, b) => a.name.localeCompare(b.name));
}

export function buildArchiveIdentityReviewReport(
  input: Parameters<typeof buildArchiveIdentityReview>[0]
): ArchiveIdentityReviewReport {
  const rows = buildArchiveIdentityReview(input);
  const rowsById = new Map(rows.map((row) => [row.tagId, row]));
  const aliasClusters = rows.flatMap((node): IdentityReviewAliasCluster[] => {
    if (node.classification !== 'structural') return [];
    const prefix = `${node.name.trim().toLowerCase()} `;
    const candidates = rows.filter((row) =>
      row.parentId === node.tagId &&
      row.classification === 'person' &&
      row.name.trim().toLowerCase().startsWith(prefix)
    );
    if (candidates.length < 2) return [];
    const candidateNames = candidates.map((row) => rowsById.get(row.tagId)!.name);
    const approvedNames = APPROVED_ALIAS_CLUSTERS[node.name];
    const approved = approvedNames !== undefined &&
      [...approvedNames].sort().join('\u0000') === [...candidateNames].sort().join('\u0000');
    return [{
      nodeTagId: node.tagId,
      nodeName: node.name,
      candidateTagIds: candidates.map((row) => row.tagId),
      candidateNames,
      decision: approved ? 'approved' : 'pending',
      reason: 'Sibling Who tags share the structural node name and may be historical names for one identity.',
    }];
  });
  return { rows, aliasClusters };
}
