import type { PersonRelationship } from '@/lib/types/archiveIdentity';

function symmetricKey(a: string, b: string): string {
  return [a, b].sort((left, right) => left.localeCompare(right)).join('\u001f');
}

export function normalizeRelationshipEndpoints(
  relationship: PersonRelationship
): PersonRelationship {
  if (relationship.type === 'parent') return relationship;
  const [fromPersonId, toPersonId] = [relationship.fromPersonId, relationship.toPersonId].sort(
    (left, right) => left.localeCompare(right)
  );
  return { ...relationship, fromPersonId, toPersonId };
}

export function assertRelationshipCanBeAdded(
  relationships: PersonRelationship[],
  candidateInput: PersonRelationship,
  excludeRelationshipId?: string
): void {
  const candidate = normalizeRelationshipEndpoints(candidateInput);
  const existing = relationships
    .filter((relationship) => relationship.docId !== excludeRelationshipId)
    .map(normalizeRelationshipEndpoints);

  const duplicate = existing.some((relationship) => {
    if (relationship.type !== candidate.type) return false;
    if (candidate.type === 'parent') {
      return (
        relationship.fromPersonId === candidate.fromPersonId &&
        relationship.toPersonId === candidate.toPersonId
      );
    }
    return (
      symmetricKey(relationship.fromPersonId, relationship.toPersonId) ===
      symmetricKey(candidate.fromPersonId, candidate.toPersonId)
    );
  });
  if (duplicate) throw new Error('This relationship already exists.');

  if (candidate.type !== 'parent') return;
  const childrenByParent = new Map<string, string[]>();
  for (const relationship of existing.filter((entry) => entry.type === 'parent')) {
    const children = childrenByParent.get(relationship.fromPersonId) ?? [];
    children.push(relationship.toPersonId);
    childrenByParent.set(relationship.fromPersonId, children);
  }
  const pending = [candidate.toPersonId];
  const seen = new Set<string>();
  while (pending.length > 0) {
    const personId = pending.pop()!;
    if (personId === candidate.fromPersonId) {
      throw new Error('Parent relationship would create an ancestry cycle.');
    }
    if (seen.has(personId)) continue;
    seen.add(personId);
    pending.push(...(childrenByParent.get(personId) ?? []));
  }
}

export type PerspectiveRole =
  | 'parent'
  | 'child'
  | 'sibling'
  | 'grandparent'
  | 'grandchild'
  | 'spouse'
  | 'partner';

export function resolvePerspectiveRoles(
  relationships: PersonRelationship[],
  perspectivePersonId: string
): Map<string, Set<PerspectiveRole>> {
  const roles = new Map<string, Set<PerspectiveRole>>();
  const add = (personId: string, role: PerspectiveRole) => {
    const current = roles.get(personId) ?? new Set<PerspectiveRole>();
    current.add(role);
    roles.set(personId, current);
  };
  const parentsByChild = new Map<string, Set<string>>();
  const childrenByParent = new Map<string, Set<string>>();

  for (const relationship of relationships) {
    if (relationship.type === 'parent') {
      const parents = parentsByChild.get(relationship.toPersonId) ?? new Set<string>();
      parents.add(relationship.fromPersonId);
      parentsByChild.set(relationship.toPersonId, parents);
      const children = childrenByParent.get(relationship.fromPersonId) ?? new Set<string>();
      children.add(relationship.toPersonId);
      childrenByParent.set(relationship.fromPersonId, children);
    } else if (
      relationship.fromPersonId === perspectivePersonId ||
      relationship.toPersonId === perspectivePersonId
    ) {
      const other =
        relationship.fromPersonId === perspectivePersonId
          ? relationship.toPersonId
          : relationship.fromPersonId;
      add(other, relationship.type);
    }
  }

  const parents = parentsByChild.get(perspectivePersonId) ?? new Set<string>();
  const children = childrenByParent.get(perspectivePersonId) ?? new Set<string>();
  parents.forEach((personId) => add(personId, 'parent'));
  children.forEach((personId) => add(personId, 'child'));

  for (const parentId of parents) {
    for (const siblingId of childrenByParent.get(parentId) ?? []) {
      if (siblingId !== perspectivePersonId) add(siblingId, 'sibling');
    }
    for (const grandparentId of parentsByChild.get(parentId) ?? []) {
      add(grandparentId, 'grandparent');
    }
  }
  for (const childId of children) {
    for (const grandchildId of childrenByParent.get(childId) ?? []) {
      add(grandchildId, 'grandchild');
    }
  }
  return roles;
}

