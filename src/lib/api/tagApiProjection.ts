import type { Tag } from '@/lib/types/tag';

/** Denormalized operational fields maintained for admin tooling; omitted from viewer tag reads. */
const TAG_ADMIN_OPERATIONAL_FIELDS = [
  'cardCount',
  'mediaCount',
  'uniqueCardIds',
  'uniqueMediaIds',
] as const satisfies ReadonlyArray<keyof Tag>;

export function projectTagForApiResponse(
  tag: Tag,
  includeAdminOperationalFields: boolean
): Tag {
  if (includeAdminOperationalFields) {
    return tag;
  }

  const projected = { ...tag };
  for (const field of TAG_ADMIN_OPERATIONAL_FIELDS) {
    delete projected[field];
  }
  return projected;
}

export function projectTagsForApiResponse(
  tags: Tag[],
  includeAdminOperationalFields: boolean
): Tag[] {
  if (includeAdminOperationalFields) {
    return tags;
  }
  return tags.map((tag) => projectTagForApiResponse(tag, false));
}
