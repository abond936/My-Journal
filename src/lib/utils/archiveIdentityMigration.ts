import type { Person } from '@/lib/types/archiveIdentity';
import type { Tag } from '@/lib/types/tag';

export type IdentityMigrationRecord = Person & { docId: string };

export type IdentityMigrationPlan = {
  proposed: IdentityMigrationRecord[];
  existing: IdentityMigrationRecord[];
  conflicts: string[];
};

function normalize(value: string): string {
  return value.trim().toLocaleLowerCase();
}

export function sameMigrationIdentity(left: Person, right: IdentityMigrationRecord): boolean {
  const leftAliases = left.aliases.map((alias) => alias.name).sort();
  const rightAliases = right.aliases.map((alias) => alias.name).sort();
  return left.kind === right.kind &&
    left.canonicalName === right.canonicalName &&
    left.linkedWhoTagId === right.linkedWhoTagId &&
    left.status === right.status &&
    leftAliases.length === rightAliases.length &&
    leftAliases.every((name, index) => name === rightAliases[index]) &&
    [...left.legacyWhoTagIds].sort().join('\u0000') === [...right.legacyWhoTagIds].sort().join('\u0000');
}

export function buildApprovedIdentityMigrationPlan(input: {
  tags: Tag[];
  people: Person[];
  approvedClusters: Readonly<Record<string, readonly string[]>>;
}): IdentityMigrationPlan {
  const proposed: IdentityMigrationRecord[] = [];
  const existing: IdentityMigrationRecord[] = [];
  const conflicts: string[] = [];
  const whoTags = input.tags.filter((tag) => tag.docId && tag.dimension === 'who');

  for (const [canonicalName, aliasNames] of Object.entries(input.approvedClusters)) {
    const nodes = whoTags.filter((tag) => normalize(tag.name) === normalize(canonicalName));
    if (nodes.length !== 1) {
      conflicts.push(`${canonicalName}: expected one canonical Who tag; found ${nodes.length}.`);
      continue;
    }
    const node = nodes[0];
    const aliases = aliasNames.map((aliasName) => {
      const matches = whoTags.filter((tag) =>
        tag.parentId === node.docId && normalize(tag.name) === normalize(aliasName)
      );
      if (matches.length !== 1) {
        conflicts.push(`${canonicalName}: expected one child Who tag named ${aliasName}; found ${matches.length}.`);
        return null;
      }
      return matches[0];
    });
    if (aliases.some((tag) => tag === null)) continue;

    const expected: IdentityMigrationRecord = {
      docId: node.docId!,
      kind: 'human',
      canonicalName: node.name,
      aliases: aliases.map((tag) => ({ name: tag!.name })),
      linkedWhoTagId: node.docId,
      legacyWhoTagIds: aliases.map((tag) => tag!.docId!),
      status: 'active',
    };
    const linked = input.people.filter((person) =>
      person.docId === expected.docId ||
      person.linkedWhoTagId === expected.linkedWhoTagId ||
      normalize(person.canonicalName) === normalize(expected.canonicalName) ||
      person.legacyWhoTagIds.some((id) => expected.legacyWhoTagIds.includes(id))
    );
    if (linked.length === 0) {
      proposed.push(expected);
    } else if (linked.length === 1 && sameMigrationIdentity(linked[0], expected)) {
      existing.push(expected);
    } else {
      conflicts.push(`${canonicalName}: existing identity data conflicts with the approved record.`);
    }
  }

  return { proposed, existing, conflicts };
}

