/** Author-approved Review decisions. These are inputs to a later dry-run migration, not write instructions. */
export const APPROVED_ALIAS_CLUSTERS: Readonly<Record<string, readonly string[]>> = {
  Caroline: ['Caroline Bond', 'Caroline Gibbons'],
  Christine: ['Christine Hatchett', 'Christine Stone'],
  Dora: ['Dora Davis', 'Dora McDonald', 'Dora Stone'],
  Elizabeth: ['Elizabeth Bond', 'Elizabeth Cochran'],
  Margaret: ['Margaret Baker', 'Margaret Bond'],
  Marsha: ['Marsha Dorsey', 'Marsha Fortunato', 'Marsha Hammond'],
  Mildred: ['Mildred Davis', 'Mildred Godfrey'],
  Nell: ['Nell Bond', 'Nell Hammond'],
  Sandra: ['Sandra Bond', 'Sandra Davis'],
};

/** The author is the archive perspective for resolving contextual human relationships. */
export const APPROVED_ARCHIVE_PERSPECTIVE = {
  canonicalName: 'Alan Bond',
  whoTagName: 'Alan Bond',
} as const;
