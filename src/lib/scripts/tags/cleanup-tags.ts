import { config } from 'dotenv';
import { getAdminApp } from '@/lib/config/firebase/admin';
import { Tag } from '@/lib/types/tag';
import { logRequiredEnvPresent, FIREBASE_ADMIN_ENV_VARS } from '@/lib/scripts/utils/safeMaintenanceLog';

config();
logRequiredEnvPresent(FIREBASE_ADMIN_ENV_VARS);

const db = getAdminApp().firestore();

async function cleanupTags() {
  try {
    console.log('Starting tag cleanup...');
    const tagsRef = db.collection('tags');
    const snapshot = await tagsRef.get();

    const tagsToDelete = snapshot.docs.filter((doc) => {
      const tag = doc.data() as Tag;
      return tag.name.includes('?');
    });

    if (tagsToDelete.length === 0) {
      console.log('No tags with question marks found.');
      return;
    }

    console.log(`Found ${tagsToDelete.length} tags with question marks:`);
    tagsToDelete.forEach((doc) => {
      const tag = doc.data() as Tag;
      console.log(`- "${tag.name}" (ID: ${doc.id}, Dimension: ${tag.dimension})`);
    });

    console.log('\nAbout to delete these tags. Press Ctrl+C to cancel or wait 5 seconds to proceed...');
    await new Promise((resolve) => setTimeout(resolve, 5000));

    const batch = db.batch();
    tagsToDelete.forEach((doc) => {
      batch.delete(doc.ref);
    });

    await batch.commit();

    console.log('\nSuccessfully deleted all tags with question marks.');
  } catch (error) {
    console.error('Error during tag cleanup:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

cleanupTags().then(() => {
  console.log('Cleanup completed.');
  process.exit(0);
});
