import * as dotenv from 'dotenv';

dotenv.config();

import { getAdminApp } from '@/lib/config/firebase/admin';

async function main() {
  const mediaId = 'em1vbWRhZHBpY3NcYTFCb2JcMDMgT3RoZXJcTmF2eVwwMTc1NF9wX3cyMmFmNWx3OWttMTE2OC5qcGc=';
  const app = getAdminApp();
  const firestore = app.firestore();

  try {
    const doc = await firestore.collection('media').doc(mediaId).get();
    if (!doc.exists) {
      console.log('Media document not found');
      return;
    }

    console.log('Media document:', doc.data());
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : error);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
});
