import 'dotenv/config';
import { mkdir, writeFile } from 'fs/promises';
import { dirname, resolve } from 'path';
import { getAdminApp } from '@/lib/config/firebase/admin';

type RawRecord = Record<string, unknown> & { docId: string };
type RawTag = RawRecord & { name?: string; parentId?: string; dimension?: string };
type Assignment = {
  id: string;
  label: string;
  status?: string;
  tagIds: string[];
  subjectTagIds: string[];
};

const outputArg = process.argv.find((arg) => arg.startsWith('--output='));
const outputPath = resolve(outputArg?.slice('--output='.length) || 'temp/what-vocabulary-manifest.json');

function strings(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === 'string') : [];
}

function assignments(records: RawRecord[], tagField: 'tags' | 'tagIds', labelFields: string[]): Assignment[] {
  return records.map((record) => ({
    id: record.docId,
    label: labelFields.flatMap((field) => typeof record[field] === 'string' && record[field] ? [record[field] as string] : [])[0] ?? record.docId,
    status: typeof record.status === 'string' ? record.status : undefined,
    tagIds: strings(record[tagField]),
    subjectTagIds: [...new Set([
      ...(typeof record.subjectTagId === 'string' ? [record.subjectTagId] : []),
      ...strings(record.subjectTagIds),
    ])],
  }));
}

function matching(items: Assignment[], tagIds: Set<string>, field: 'tagIds' | 'subjectTagIds') {
  return items
    .filter((item) => item[field].some((tagId) => tagIds.has(tagId)))
    .map(({ id, label, status }) => ({ id, label, ...(status ? { status } : {}) }));
}

async function main() {
  const firestore = getAdminApp().firestore();
  const [tagSnap, cardSnap, mediaSnap, questionSnap] = await Promise.all([
    firestore.collection('tags').where('dimension', '==', 'what').get(),
    firestore.collection('cards').select('title', 'status', 'tags', 'subjectTagId', 'subjectTagIds').get(),
    firestore.collection('media').select('filename', 'caption', 'tags', 'subjectTagId', 'subjectTagIds').get(),
    firestore.collection('questions').select('prompt', 'tagIds', 'subjectTagId', 'subjectTagIds').get(),
  ]);

  const raw = (snapshot: FirebaseFirestore.QuerySnapshot) => snapshot.docs.map((doc) => ({ docId: doc.id, ...doc.data() }));
  const tags = raw(tagSnap) as RawTag[];
  const cards = assignments(raw(cardSnap) as RawRecord[], 'tags', ['title']);
  const media = assignments(raw(mediaSnap) as RawRecord[], 'tags', ['caption', 'filename']);
  const questions = assignments(raw(questionSnap) as RawRecord[], 'tagIds', ['prompt']);
  const tagById = new Map(tags.map((tag) => [tag.docId, tag]));
  const childrenByParent = new Map<string, RawTag[]>();
  for (const tag of tags) {
    if (!tag.parentId) continue;
    childrenByParent.set(tag.parentId, [...(childrenByParent.get(tag.parentId) ?? []), tag]);
  }

  const pathFor = (tag: RawTag): string[] => {
    const path: string[] = [];
    const seen = new Set<string>();
    let current: RawTag | undefined = tag;
    while (current && !seen.has(current.docId)) {
      seen.add(current.docId);
      path.unshift(current.name ?? current.docId);
      current = current.parentId ? tagById.get(current.parentId) : undefined;
    }
    return path;
  };
  const descendantsFor = (tagId: string): string[] => {
    const result: string[] = [];
    const queue = [...(childrenByParent.get(tagId) ?? [])];
    while (queue.length) {
      const child = queue.shift()!;
      result.push(child.docId);
      queue.push(...(childrenByParent.get(child.docId) ?? []));
    }
    return result;
  };

  const rows = tags.map((tag) => {
    const directIds = new Set([tag.docId]);
    const subtreeIds = new Set([tag.docId, ...descendantsFor(tag.docId)]);
    const directCards = matching(cards, directIds, 'tagIds');
    const subtreeCards = matching(cards, subtreeIds, 'tagIds');
    return {
      tagId: tag.docId,
      name: tag.name ?? '(unnamed)',
      parentId: tag.parentId,
      path: pathFor(tag),
      childCount: (childrenByParent.get(tag.docId) ?? []).length,
      descendantCount: subtreeIds.size - 1,
      direct: {
        publishedCards: directCards.filter((item) => item.status === 'published'),
        draftCards: directCards.filter((item) => item.status !== 'published'),
        media: matching(media, directIds, 'tagIds'),
        questions: matching(questions, directIds, 'tagIds'),
      },
      directSubjects: {
        cards: matching(cards, directIds, 'subjectTagIds'),
        media: matching(media, directIds, 'subjectTagIds'),
        questions: matching(questions, directIds, 'subjectTagIds'),
      },
      subtreeCounts: {
        publishedCards: subtreeCards.filter((item) => item.status === 'published').length,
        draftCards: subtreeCards.filter((item) => item.status !== 'published').length,
        media: matching(media, subtreeIds, 'tagIds').length,
        questions: matching(questions, subtreeIds, 'tagIds').length,
      },
    };
  }).sort((left, right) => left.path.join(' > ').localeCompare(right.path.join(' > ')));

  const manifest = {
    version: 1,
    generatedAt: new Date().toISOString(),
    mode: 'read-only',
    sourceTotals: { whatTags: tags.length, cards: cards.length, media: media.length, questions: questions.length },
    rows,
    writes: 0,
  };
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  console.log(JSON.stringify({ outputPath, sourceTotals: manifest.sourceTotals, rows: rows.length, writes: 0 }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
