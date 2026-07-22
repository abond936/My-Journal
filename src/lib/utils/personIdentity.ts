import { personSchema, type Person } from '@/lib/types/archiveIdentity';
import { tagSchema, type Tag } from '@/lib/types/tag';

export interface ResolvedPersonIdentity {
  personTagId: string;
  canonicalName: string;
  kind: 'human' | 'nonhuman';
  assignable: boolean;
  source: 'tag' | 'legacy';
  tag: Tag;
  legacyProfile?: Person;
}

/**
 * Resolves one identity without allowing the legacy profile to replace tag authority.
 * Any selected Who tag can be an identity endpoint; legacy profiles are optional compatibility data.
 */
export function resolvePersonIdentity(
  rawTag: unknown,
  rawLegacyProfiles: unknown[] = []
): ResolvedPersonIdentity {
  const tag = tagSchema.parse(rawTag);
  if (!tag.docId || tag.dimension !== 'who') {
    throw new Error('Person identity must reference an existing Who tag with a document ID.');
  }

  const legacyProfiles = rawLegacyProfiles.map((profile) => personSchema.parse(profile));
  const matchingProfiles = legacyProfiles.filter(
    (profile) => profile.docId === tag.docId || profile.linkedWhoTagId === tag.docId
  );
  const conflictingProfiles = matchingProfiles.filter(
    (profile) => profile.linkedWhoTagId && profile.linkedWhoTagId !== tag.docId
  );
  if (conflictingProfiles.length > 0 || matchingProfiles.length > 1) {
    throw new Error('Person identity compatibility records conflict for this Who tag.');
  }

  const legacyProfile = matchingProfiles[0];
  return {
    personTagId: tag.docId,
    canonicalName: tag.name,
    kind: legacyProfile?.kind ?? 'human',
    assignable: tag.assignable !== false,
    source: 'tag',
    tag,
    ...(legacyProfile ? { legacyProfile } : {}),
  };
}
