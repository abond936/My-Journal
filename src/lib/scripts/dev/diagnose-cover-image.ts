/**
 * Diagnose cover image for a card by title.
 * Run: npx ts-node -r tsconfig-paths/register -P tsconfig.scripts.json src/lib/scripts/dev/diagnose-cover-image.ts "High School Graduation"
 */
import * as dotenv from 'dotenv';
import { resolve } from 'path';
import * as admin from 'firebase-admin';
import { getAdminApp } from '@/lib/config/firebase/admin';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });
dotenv.config({ path: resolve(process.cwd(), '.env') });

async function diagnoseCoverImage(searchTitle: string) {
  const title = searchTitle || 'High School Graduation';
  console.log(`\nSearching for card with title containing: "${title}"\n`);

  try {
    getAdminApp();
    const firestore = admin.firestore();

    let docs: admin.firestore.QueryDocumentSnapshot[] = [];
    const prefix = title.toLowerCase();
    const snapshot = await firestore
      .collection('cards')
      .where('title_lowercase', '>=', prefix)
      .where('title_lowercase', '<=', prefix + '\uf8ff')
      .limit(10)
      .get();
    docs = [...snapshot.docs];

    if (docs.length === 0) {
      console.log(`No cards found with prefix "${title}". Trying exact title match...`);
      const exactSnapshot = await firestore
        .collection('cards')
        .where('title', '==', title)
        .limit(5)
        .get();
      if (exactSnapshot.empty) {
        console.log(`No cards found. The card may not exist or the title may differ.`);
        return;
      }
      docs = [...exactSnapshot.docs];
    }

    for (const doc of docs) {
      const cardData = doc.data();
      const cardId = doc.id;
      console.log('========================================');
      console.log(`Card ID: ${cardId}`);
      console.log(`Title: ${cardData.title}`);
      console.log('----------------------------------------');
      console.log(`coverImageId: ${cardData.coverImageId ?? '(null/undefined)'}`);
      console.log(`coverImageFocalPoint: ${cardData.coverImageFocalPoint ? JSON.stringify(cardData.coverImageFocalPoint) : '(null/undefined)'}`);
      console.log('----------------------------------------');

      if (cardData.coverImageId) {
        const mediaDoc = await firestore.collection('media').doc(cardData.coverImageId).get();
        if (mediaDoc.exists) {
          const media = mediaDoc.data();
          console.log('Media document EXISTS:');
          console.log(`  - docId: ${media?.docId}`);
          console.log(`  - filename: ${media?.filename}`);
          console.log(`  - width: ${media?.width}`);
          console.log(`  - height: ${media?.height}`);
          console.log(`  - storagePath: ${media?.storagePath ?? '(missing)'}`);
          console.log(`  - storageUrl: ${media?.storageUrl ? '(set)' : '(missing/empty)'}`);
          console.log(`  - objectPosition: ${media?.objectPosition ?? '(not set)'}`);

          if (!media?.storagePath) {
            console.log('\n  ⚠️  WARNING: storagePath is missing - signed URL generation will fail');
          }
          if (!media?.width || !media?.height) {
            console.log('\n  ⚠️  WARNING: width/height missing - focal point calc may fail');
          }
        } else {
          console.log('Media document NOT FOUND (orphaned reference)');
        }
      } else {
        console.log('No coverImageId - card has no cover image assigned');
      }
      console.log('');
    }
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

const searchTitle = process.argv[2] || 'High School Graduation';
diagnoseCoverImage(searchTitle).then(() => process.exit(0));
