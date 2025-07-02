import 'dotenv/config';
import { getAdminApp } from '@/lib/config/firebase/admin';
import { Tag } from '@/lib/types/tag';

const adminApp = getAdminApp();
const db = adminApp.firestore();

async function backfillTagPaths() {
  console.log('--- Starting Robust Tag Path Backfill ---');
  
  const tagsCollection = db.collection('tags');
  const snapshot = await tagsCollection.get();

  if (snapshot.empty) {
    console.log('No tags found. Exiting.');
    return;
  }

  const allTags = new Map<string, Tag>();
  snapshot.docs.forEach(doc => {
    allTags.set(doc.id, { docId: doc.id, ...doc.data() } as Tag);
  });
  
  console.log(`Found ${allTags.size} total tags.`);

  // Create a map of children for each parent
  const childrenByParentId = new Map<string, string[]>();
  const rootTags: string[] = [];

  allTags.forEach((tag, id) => {
    if (tag.parentId) {
      if (!childrenByParentId.has(tag.parentId)) {
        childrenByParentId.set(tag.parentId, []);
      }
      childrenByParentId.get(tag.parentId)!.push(id);
    } else {
      rootTags.push(id);
    }
  });

  console.log(`Found ${rootTags.length} root-level tags.`);
  
  const batch = db.batch();
  let updatedCount = 0;

  // Recursive function to build paths and update documents
  function buildPath(tagId: string, currentPath: string[]) {
    const newPath = [...currentPath, tagId];
    const tagRef = tagsCollection.doc(tagId);
    
    // Check if the path needs updating to avoid unnecessary writes
    const existingTag = allTags.get(tagId);
    if (JSON.stringify(existingTag?.path) !== JSON.stringify(newPath)) {
        batch.update(tagRef, { path: newPath, updatedAt: Date.now() });
        updatedCount++;
        console.log(`  [UPDATE] Tag: ${existingTag?.name} -> New Path: [${newPath.join(', ')}]`);
    }

    const children = childrenByParentId.get(tagId);
    if (children) {
      children.forEach(childId => buildPath(childId, newPath));
    }
  }

  // Start the process from the root tags
  rootTags.forEach(tagId => buildPath(tagId, []));

  if (updatedCount > 0) {
    console.log(`\nCommitting ${updatedCount} updates to Firestore...`);
    await batch.commit();
    console.log(`✅ Successfully updated paths for ${updatedCount} tags.`);
  } else {
    console.log('\n✅ All tag paths are already correct. No updates needed.');
  }
}

backfillTagPaths()
  .then(() => {
    console.log('\n--- Backfill Complete ---');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n--- SCRIPT FAILED ---');
    console.error('An error occurred during the backfill process:', error);
    process.exit(1);
  }); 