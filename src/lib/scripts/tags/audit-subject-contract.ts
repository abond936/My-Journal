import 'dotenv/config';
import { getAdminApp } from '@/lib/config/firebase/admin';
import { getAllTags } from '@/lib/firebase/tagService';
import { buildSubjectFilterTags, normalizeSubjectTagId, normalizeSubjectTagIds } from '@/lib/utils/subjectTag';

type CollectionName = 'cards' | 'media' | 'questions';
type Finding = { collection: CollectionName; id: string; issue: string };

function trueKeys(value: unknown): string[] {
  if (!value || typeof value !== 'object') return [];
  return Object.entries(value as Record<string, unknown>)
    .filter(([, enabled]) => enabled === true)
    .map(([id]) => id)
    .sort((a, b) => a.localeCompare(b));
}

function equalIds(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((id, index) => id === b[index]);
}

async function main() {
  const firestore = getAdminApp().firestore();
  const allTags = await getAllTags();
  const findings: Finding[] = [];
  const summary: Record<CollectionName, Record<string, number>> = {
    cards: {}, media: {}, questions: {},
  };

  for (const collection of ['cards', 'media', 'questions'] as const) {
    const snap = await firestore.collection(collection).select(
      'tags', 'tagIds', 'subjectTagId', 'subjectTagIds', 'subjectFilterTags',
      'galleryImplicitSubjectTagIds'
    ).get();
    summary[collection].documents = snap.size;

    for (const doc of snap.docs) {
      const data = doc.data();
      const assigned = normalizeSubjectTagIds(
        (collection === 'questions' ? data.tagIds : data.tags) as string[] | undefined
      );
      const singular = normalizeSubjectTagId(data.subjectTagId as string | null | undefined);
      const storedArray = Array.isArray(data.subjectTagIds) ? data.subjectTagIds as string[] : undefined;
      const explicit = storedArray ? normalizeSubjectTagIds(storedArray) : singular ? [singular] : [];
      const implicit = collection === 'cards'
        ? normalizeSubjectTagIds(data.galleryImplicitSubjectTagIds as string[] | undefined)
        : [];
      const effective = normalizeSubjectTagIds([...explicit, ...implicit]);

      const record = (issue: string) => {
        findings.push({ collection, id: doc.id, issue });
        summary[collection][issue] = (summary[collection][issue] ?? 0) + 1;
      };

      if (singular && storedArray === undefined) record('legacy-singular-only');
      if (storedArray && storedArray.length !== explicit.length) record('duplicate-or-blank-subject-array');
      if (explicit.length > 0 && singular !== explicit[0]) record('singular-array-mismatch');
      if (explicit.some((id) => !assigned.includes(id))) record('explicit-subject-not-assigned');
      if (implicit.some((id) => !assigned.includes(id))) record('implicit-subject-not-assigned');

      const expectedFilter = trueKeys(await buildSubjectFilterTags(effective, allTags));
      const storedFilter = trueKeys(data.subjectFilterTags);
      if (!equalIds(expectedFilter, storedFilter)) record('subject-filter-mismatch');
    }
  }

  const conflicts = findings.filter((finding) => finding.issue !== 'legacy-singular-only');
  console.log(JSON.stringify({ summary, conflictCount: conflicts.length, samples: conflicts.slice(0, 50) }, null, 2));
  console.log('Read-only audit. No Firestore writes performed.');
  if (conflicts.length > 0) process.exitCode = 2;
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
