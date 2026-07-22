import { getAdminApp } from '@/lib/config/firebase/admin';
import type { Tag } from '@/lib/types/tag';
import { isCardCodificationComplete } from '@/lib/utils/cardCodification';

export type TagRemovalImpact = {
  tagId: string;
  tagName: string;
  directChildrenPromoted: number;
  cardsChanged: number;
  mediaChanged: number;
  questionsChanged: number;
  cardsNewlyIncomplete: number;
  mediaNewlyIncomplete: number;
};

export type TagMergeImpact = TagRemovalImpact & {
  targetTagId: string;
  targetTagName: string;
};

function ids(value: unknown): string[] {
  return Array.isArray(value)
    ? Array.from(new Set(value.filter((item): item is string => typeof item === 'string' && item.length > 0)))
    : [];
}

export async function getTagRemovalImpact(tagId: string): Promise<TagRemovalImpact> {
  const firestore = getAdminApp().firestore();
  const [targetDoc, childSnap, cardAffectedSnap, mediaAffectedSnap, questionAffectedSnap] = await Promise.all([
    firestore.collection('tags').doc(tagId).get(),
    firestore.collection('tags').where('parentId', '==', tagId).get(),
    firestore.collection('cards').where(`filterTags.${tagId}`, '==', true).get(),
    firestore.collection('media').where(`filterTags.${tagId}`, '==', true).get(),
    firestore.collection('questions').where(`subjectFilterTags.${tagId}`, '==', true).get(),
  ]);
  if (!targetDoc.exists) throw new Error('Tag not found');
  const target = { docId: targetDoc.id, ...targetDoc.data() } as Tag;

  const directlyAffectedRecords = [...cardAffectedSnap.docs, ...mediaAffectedSnap.docs]
    .map((doc) => doc.data() as Record<string, unknown>)
    .filter((record) => ids(record.tags).includes(tagId));
  const otherDirectTagIds = Array.from(new Set(directlyAffectedRecords.flatMap((record) =>
    ids(record.tags).filter((id) => id !== tagId)
  )));
  const otherTagDocs = otherDirectTagIds.length > 0
    ? await firestore.getAll(...otherDirectTagIds.map((id) => firestore.collection('tags').doc(id)))
    : [];
  const dimensionByTagId = new Map(otherTagDocs
    .filter((doc) => doc.exists)
    .map((doc) => [doc.id, (doc.data() as Tag).dimension] as const));
  const remainsResolvedInTargetDimension = (record: Record<string, unknown>) =>
    ids(record.tags).some((id) => id !== tagId && dimensionByTagId.get(id) === target.dimension);

  let cardsNewlyIncomplete = 0;
  let mediaNewlyIncomplete = 0;

  for (const doc of cardAffectedSnap.docs) {
    const record = doc.data() as Record<string, unknown>;
    if (!ids(record.tags).includes(tagId)) continue;
    if (isCardCodificationComplete(record) && !remainsResolvedInTargetDimension(record)) {
      cardsNewlyIncomplete += 1;
    }
  }
  for (const doc of mediaAffectedSnap.docs) {
    const record = doc.data() as Record<string, unknown>;
    if (!ids(record.tags).includes(tagId)) continue;
    const wasComplete = Boolean(record.hasWho && record.hasWhat && record.hasWhen && record.hasWhere);
    if (wasComplete && !remainsResolvedInTargetDimension(record)) mediaNewlyIncomplete += 1;
  }
  return {
    tagId,
    tagName: target.name,
    directChildrenPromoted: childSnap.size,
    cardsChanged: cardAffectedSnap.size,
    mediaChanged: mediaAffectedSnap.size,
    questionsChanged: questionAffectedSnap.size,
    cardsNewlyIncomplete,
    mediaNewlyIncomplete,
  };
}

export async function getTagMergeImpact(tagId: string, targetTagId: string): Promise<TagMergeImpact> {
  const firestore = getAdminApp().firestore();
  const [sourceDoc, targetDoc] = await Promise.all([
    firestore.collection('tags').doc(tagId).get(),
    firestore.collection('tags').doc(targetTagId).get(),
  ]);
  if (!sourceDoc.exists) throw new Error('Tag not found');
  if (!targetDoc.exists) throw new Error('Merge target tag not found');
  const source = { docId: sourceDoc.id, ...sourceDoc.data() } as Tag;
  const target = { docId: targetDoc.id, ...targetDoc.data() } as Tag;
  if (source.dimension !== target.dimension) throw new Error('Cannot merge tags across dimensions');
  if (tagId === targetTagId) throw new Error('Cannot merge a tag into itself');
  if ((target.path ?? []).includes(tagId)) throw new Error('Cannot merge a tag into one of its descendants');
  const impact = await getTagRemovalImpact(tagId);
  return { ...impact, targetTagId, targetTagName: target.name };
}
