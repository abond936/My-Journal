import 'dotenv/config';
import { createHash } from 'crypto';
import { mkdir, writeFile } from 'fs/promises';
import { dirname, resolve } from 'path';
import { getAdminApp } from '@/lib/config/firebase/admin';
import { APPROVED_ALIAS_CLUSTERS } from '@/lib/data/approvedIdentityReview';
import { buildArchiveIdentityReviewReport } from '@/lib/utils/archiveIdentityReview';
import type { Tag } from '@/lib/types/tag';

type RawRecord = Record<string, unknown> & { docId: string };
type Assignment = { id: string; label: string; tagIds: string[]; subjectTagIds: string[] };

const outputArg = process.argv.find((arg) => arg.startsWith('--output='));
const outputPath = resolve(outputArg?.slice('--output='.length) || 'temp/who-vocabulary-manifest.json');

function strings(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === 'string') : [];
}

function normalize(value: string): string {
  return value.trim().toLocaleLowerCase();
}

function assignments(records: RawRecord[], tagField: 'tags' | 'tagIds', labelFields: string[]): Assignment[] {
  return records.map((record) => ({
    id: record.docId,
    label: labelFields.flatMap((field) => typeof record[field] === 'string' && record[field] ? [record[field] as string] : [])[0] ?? record.docId,
    tagIds: strings(record[tagField]),
    subjectTagIds: [...new Set([
      ...(typeof record.subjectTagId === 'string' ? [record.subjectTagId] : []),
      ...strings(record.subjectTagIds),
    ])],
  }));
}

function countReferences(items: Assignment[], tagIds: Set<string>, field: 'tagIds' | 'subjectTagIds'): number {
  return items.filter((item) => item[field].some((tagId) => tagIds.has(tagId))).length;
}

async function main() {
  const firestore = getAdminApp().firestore();
  const [tagSnap, peopleSnap, relationshipSnap, groupSnap, cardSnap, mediaSnap, questionSnap, settingsSnap] = await Promise.all([
    firestore.collection('tags').where('dimension', '==', 'who').get(),
    firestore.collection('people').get(),
    firestore.collection('person_relationships').get(),
    firestore.collection('person_groups').get(),
    firestore.collection('cards').select('title', 'tags', 'subjectTagId', 'subjectTagIds').get(),
    firestore.collection('media').select('filename', 'caption', 'tags', 'subjectTagId', 'subjectTagIds').get(),
    firestore.collection('questions').select('prompt', 'tagIds', 'subjectTagId', 'subjectTagIds').get(),
    firestore.collection('app_settings').doc('author').get(),
  ]);

  const raw = (snapshot: FirebaseFirestore.QuerySnapshot) => snapshot.docs.map((doc) => ({ docId: doc.id, ...doc.data() }));
  const tags = raw(tagSnap) as Tag[];
  const people = raw(peopleSnap) as RawRecord[];
  const relationships = raw(relationshipSnap) as RawRecord[];
  const groups = raw(groupSnap) as RawRecord[];
  const cards = assignments(raw(cardSnap) as RawRecord[], 'tags', ['title']);
  const media = assignments(raw(mediaSnap) as RawRecord[], 'tags', ['caption', 'filename']);
  const questions = assignments(raw(questionSnap) as RawRecord[], 'tagIds', ['prompt']);
  const tagById = new Map(tags.flatMap((tag) => tag.docId ? [[tag.docId, tag] as const] : []));
  const tagsByName = new Map<string, Tag[]>();
  for (const tag of tags) tagsByName.set(normalize(tag.name), [...(tagsByName.get(normalize(tag.name)) ?? []), tag]);

  const resolvePerson = (person: RawRecord) => {
    const linked = typeof person.linkedWhoTagId === 'string' ? tagById.get(person.linkedWhoTagId) : undefined;
    const sameId = tagById.get(person.docId);
    const named = typeof person.canonicalName === 'string' ? tagsByName.get(normalize(person.canonicalName)) ?? [] : [];
    const target = linked ?? sameId ?? (named.length === 1 ? named[0] : undefined);
    const evidence = linked ? 'linkedWhoTagId' : sameId ? 'matching-document-id' : named.length === 1 ? 'unique-canonical-name' : undefined;
    return {
      personId: person.docId,
      canonicalName: typeof person.canonicalName === 'string' ? person.canonicalName : '(unnamed)',
      targetWhoTagId: target?.docId,
      targetWhoTagName: target?.name,
      evidence,
      status: target ? 'resolved' : named.length > 1 ? 'ambiguous' : 'unresolved',
    };
  };
  const personMappings = people.map(resolvePerson);
  const mappingByPersonId = new Map(personMappings.map((mapping) => [mapping.personId, mapping]));

  const mapEndpoint = (personId: unknown) => typeof personId === 'string' ? mappingByPersonId.get(personId) : undefined;
  const relationshipMappings = relationships.map((relationship) => {
    const from = mapEndpoint(relationship.fromPersonId);
    const to = mapEndpoint(relationship.toPersonId);
    return {
      relationshipId: relationship.docId,
      type: relationship.type,
      fromPersonId: relationship.fromPersonId,
      toPersonId: relationship.toPersonId,
      fromWhoTagId: from?.targetWhoTagId,
      toWhoTagId: to?.targetWhoTagId,
      status: from?.targetWhoTagId && to?.targetWhoTagId ? 'resolved' : 'blocked',
    };
  });
  const groupMappings = groups.map((group) => {
    const members = strings(group.memberPersonIds).map((personId) => mappingByPersonId.get(personId));
    const legacyWhoTagIds = strings(group.legacyWhoTagIds);
    return {
      groupId: group.docId,
      name: group.name,
      type: group.type,
      memberPersonIds: strings(group.memberPersonIds),
      memberWhoTagIds: members.flatMap((member) => member?.targetWhoTagId ? [member.targetWhoTagId] : []),
      legacyWhoTagIds,
      assignedLegacyTags: {
        cards: countReferences(cards, new Set(legacyWhoTagIds), 'tagIds'),
        media: countReferences(media, new Set(legacyWhoTagIds), 'tagIds'),
        questions: countReferences(questions, new Set(legacyWhoTagIds), 'tagIds'),
      },
      status: members.every((member) => member?.targetWhoTagId) ? 'resolved-members' : 'blocked-members',
      disposition: 'author-review',
    };
  });

  const review = buildArchiveIdentityReviewReport({
    tags,
    people: people as never,
    groups: groups as never,
    cards,
    media,
    questions,
  });
  const detectedClusters = Object.entries(APPROVED_ALIAS_CLUSTERS).flatMap(([nodeName, candidateNames]) => {
    const nodes = tagsByName.get(normalize(nodeName)) ?? [];
    if (nodes.length !== 1 || !nodes[0].docId) return [];
    const candidateTags = candidateNames.flatMap((candidateName) =>
      tags.filter((tag) => tag.parentId === nodes[0].docId && normalize(tag.name) === normalize(candidateName))
    );
    if (candidateTags.length !== candidateNames.length || candidateTags.some((tag) => !tag.docId)) return [];
    return [{
      nodeTagId: nodes[0].docId,
      nodeName: nodes[0].name,
      candidateTagIds: candidateTags.map((tag) => tag.docId!),
      candidateNames: candidateTags.map((tag) => tag.name),
      decision: 'approved' as const,
      reason: 'Author-approved nested historical names found beneath the canonical Who tag.',
    }];
  });
  const clustersByNodeId = new Map([
    ...review.aliasClusters,
    ...detectedClusters,
  ].map((cluster) => [cluster.nodeTagId, cluster]));
  const aliasClusters = [...clustersByNodeId.values()].map((cluster) => {
    const ids = new Set([cluster.nodeTagId, ...cluster.candidateTagIds]);
    return {
      ...cluster,
      directAssignments: {
        cards: countReferences(cards, ids, 'tagIds'),
        media: countReferences(media, ids, 'tagIds'),
        questions: countReferences(questions, ids, 'tagIds'),
      },
      subjects: {
        cards: countReferences(cards, ids, 'subjectTagIds'),
        media: countReferences(media, ids, 'subjectTagIds'),
        questions: countReferences(questions, ids, 'subjectTagIds'),
      },
      migrationEffect: 'No assignment rewrite proposed; hierarchy already aggregates nested names.',
    };
  });
  const perspectivePersonId = typeof settingsSnap.data()?.archivePerspectivePersonId === 'string'
    ? settingsSnap.data()!.archivePerspectivePersonId as string
    : undefined;
  const perspective = perspectivePersonId ? mappingByPersonId.get(perspectivePersonId) : undefined;

  const manifestCore = {
    version: 1,
    generatedAt: new Date().toISOString(),
    mode: 'read-only' as const,
    targetModel: 'Canonical Who tag IDs own identity; legacy records are compatibility references only.',
    sourceTotals: {
      whoTags: tags.length,
      people: people.length,
      relationships: relationships.length,
      groups: groups.length,
      cards: cards.length,
      media: media.length,
      questions: questions.length,
    },
    approvedAliasClusterNames: Object.keys(APPROVED_ALIAS_CLUSTERS),
    aliasClusters,
    hierarchyReview: review.rows,
    authorReviewBranches: review.rows.filter((row) =>
      row.classification === 'relationship-role' ||
      row.classification === 'group' ||
      row.classification === 'ambiguous'
    ).map((row) => {
      const tagIds = new Set([row.tagId]);
      const pick = (items: Assignment[], field: 'tagIds' | 'subjectTagIds') => items
        .filter((item) => item[field].some((tagId) => tagIds.has(tagId)))
        .map(({ id, label }) => ({ id, label }));
      return {
        ...row,
        directObjects: {
          cards: pick(cards, 'tagIds'),
          media: pick(media, 'tagIds'),
          questions: pick(questions, 'tagIds'),
        },
        subjectObjects: {
          cards: pick(cards, 'subjectTagIds'),
          media: pick(media, 'subjectTagIds'),
          questions: pick(questions, 'subjectTagIds'),
        },
      };
    }),
    personMappings,
    relationshipMappings,
    groupMappings,
    perspective: {
      personId: perspectivePersonId,
      targetWhoTagId: perspective?.targetWhoTagId,
      targetWhoTagName: perspective?.targetWhoTagName,
      status: !perspectivePersonId ? 'not-set' : perspective?.targetWhoTagId ? 'resolved' : 'blocked',
    },
    unresolved: {
      people: personMappings.filter((mapping) => mapping.status !== 'resolved'),
      relationships: relationshipMappings.filter((mapping) => mapping.status !== 'resolved'),
      groups: groupMappings.filter((mapping) => mapping.status !== 'resolved-members'),
      aliasClusters: aliasClusters.filter((cluster) => cluster.decision !== 'approved'),
    },
    projectedEffects: {
      tagAssignmentsRewritten: 0,
      subjectAssignmentsRewritten: 0,
      cardSearchDocumentsChanged: 0,
      mediaSearchDocumentsChanged: 0,
      hierarchicalCountsChanged: 0,
      reason: 'The proposed compatibility migration changes legacy identity references only; existing Who hierarchy, assignments, subjects, projections, search documents, and counts remain unchanged.',
    },
  };
  const fingerprint = createHash('sha256').update(JSON.stringify(manifestCore)).digest('hex');
  const manifest = { ...manifestCore, fingerprint };
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');

  console.log(JSON.stringify({
    outputPath,
    fingerprint,
    sourceTotals: manifest.sourceTotals,
    aliasClusters: { total: aliasClusters.length, approved: aliasClusters.filter((cluster) => cluster.decision === 'approved').length },
    hierarchyReview: {
      total: review.rows.length,
      authorReviewBranches: manifest.authorReviewBranches.length,
      classifications: Object.fromEntries(
        ['person', 'relationship-role', 'group', 'structural', 'ambiguous'].map((classification) => [
          classification,
          review.rows.filter((row) => row.classification === classification).length,
        ])
      ),
    },
    mappings: {
      peopleResolved: personMappings.filter((mapping) => mapping.status === 'resolved').length,
      peopleUnresolved: manifest.unresolved.people.length,
      relationshipsResolved: relationshipMappings.filter((mapping) => mapping.status === 'resolved').length,
      relationshipsBlocked: manifest.unresolved.relationships.length,
      groupsResolved: groupMappings.filter((mapping) => mapping.status === 'resolved-members').length,
      groupsBlocked: manifest.unresolved.groups.length,
      perspective: manifest.perspective.status,
    },
    projectedEffects: manifest.projectedEffects,
    writes: 0,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
