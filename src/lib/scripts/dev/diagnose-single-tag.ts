import 'dotenv/config';
import { getAdminApp } from '@/lib/config/firebase/admin';
import { Card } from '@/lib/types/card';
import { Tag } from '@/lib/types/tag';
import { Command } from 'commander';
import * as admin from 'firebase-admin';

const adminApp = getAdminApp();
const firestore = adminApp.firestore();

interface TagDiagnosis {
  id: string;
  name: string;
  recordedCount: number;
  calculatedCount: number;
  path: string[];
  ancestors: (string | { id: string, error: string })[];
  isCountCorrect: boolean;
}

async function diagnoseTag(tagName: string): Promise<TagDiagnosis | null> {
  console.log(`\n--- Starting Diagnosis for Tag: "${tagName}" ---`);

  // 1. Find the tag by name
  const tagsCollection = firestore.collection('tags');
  const tagSnapshot = await tagsCollection.where('name', '==', tagName).limit(1).get();

  if (tagSnapshot.empty) {
    console.error(`Error: No tag found with the name "${tagName}".`);
    return null;
  }

  const tagDoc = tagSnapshot.docs[0];
  const tagData = { docId: tagDoc.id, ...tagDoc.data() } as Tag;

  // 2. Calculate the "correct" count from the cards collection directly
  const cardsCollection = firestore.collection('cards');
  const cardsQuery = await cardsCollection
    .where('status', '==', 'published')
    .where('tags', 'array-contains', tagData.docId)
    .count()
    .get();
  
  const calculatedCount = cardsQuery.data().count;

  // 3. Fetch ancestor names for context
  const ancestorNames: (string | { id: string, error: string })[] = [];
  if (tagData.path && tagData.path.length > 1) { // Path includes the tag itself, so > 1 means it has parents
    // Exclude the tag's own ID from the lookup
    const ancestorIds = tagData.path.slice(0, -1);
    if (ancestorIds.length > 0) {
      const ancestorSnapshot = await tagsCollection.where(admin.firestore.FieldPath.documentId(), 'in', ancestorIds).get();
      const ancestorsMap = new Map(ancestorSnapshot.docs.map(doc => [doc.id, doc.data() as Tag]));
      
      for (const id of ancestorIds) {
        const ancestor = ancestorsMap.get(id);
        if (ancestor) {
          ancestorNames.push(ancestor.name);
        } else {
          ancestorNames.push({ id, error: "Ancestor Not Found" });
        }
      }
    }
  }

  const diagnosis: TagDiagnosis = {
    id: tagData.docId,
    name: tagData.name,
    recordedCount: tagData.cardCount || 0,
    calculatedCount: calculatedCount,
    isCountCorrect: (tagData.cardCount || 0) === calculatedCount,
    path: tagData.path || [],
    ancestors: ancestorNames,
  };
  
  return diagnosis;
}

function printDiagnosis(diagnosis: TagDiagnosis) {
  console.log(`
-------------------------------------------------
  Tag Diagnosis Report: "${diagnosis.name}"
-------------------------------------------------
  Tag ID:          ${diagnosis.id}
  Tag Name:        ${diagnosis.name}

  Recorded Count:  ${diagnosis.recordedCount}
  Calculated Count:${diagnosis.calculatedCount}
  Is Correct?      ${diagnosis.isCountCorrect ? '✅ Yes' : '❌ NO'}

  Path Array:      [${diagnosis.path.join(', ')}]
  Ancestor Path:   ${diagnosis.ancestors.length > 0 ? diagnosis.ancestors.map(a => typeof a === 'string' ? a : `ERROR(id: ${a.id})`).join(' / ') : '(root)'}
-------------------------------------------------
  `);
}

const program = new Command();
program
  .name('diagnose-single-tag')
  .description('Diagnoses a single tag by comparing its recorded cardCount against a direct calculation.')
  .requiredOption('-n, --name <name>', 'The name of the tag to diagnose');

program.parse(process.argv);

const options = program.opts();

if (options.name) {
  diagnoseTag(options.name)
    .then(diagnosis => {
      if (diagnosis) {
        printDiagnosis(diagnosis);
      }
      process.exit(0);
    })
    .catch(error => {
      console.error('An unexpected error occurred:', error);
      process.exit(1);
    });
} 